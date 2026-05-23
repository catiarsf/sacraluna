export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db, { getOrCreateWallet } from "@/lib/db";

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round4(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function getFirstNumber(formData: FormData | null, names: string[]) {
  for (const name of names) {
    const value = toNumber(formData?.get(name));
    if (value > 0) return value;
  }
  return 0;
}

function getFirstString(formData: FormData | null, names: string[]) {
  for (const name of names) {
    const value = String(formData?.get(name) || "").trim();
    if (value) return value;
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const consultorIdFromUrl = Number(searchParams.get("consultorId") || 0);
    const callSessionId = String(searchParams.get("callSessionId") || "").trim();

    const formData = await req.formData().catch(() => null);

    const callStatus = getFirstString(formData, [
      "CallStatus",
      "DialCallStatus",
      "RecordingStatus",
    ]).toLowerCase();

    const callSid = getFirstString(formData, [
      "CallSid",
      "DialCallSid",
      "ParentCallSid",
    ]);

    const durationSeconds = getFirstNumber(formData, [
      "DialCallDuration",
      "CallDuration",
      "RecordingDuration",
    ]);

    const recordingUrlRaw = getFirstString(formData, ["RecordingUrl"]);
    const recordingUrl = recordingUrlRaw
      ? recordingUrlRaw.endsWith(".mp3")
        ? recordingUrlRaw
        : `${recordingUrlRaw}.mp3`
      : "";

    const now = Math.floor(Date.now() / 1000);

    if (!callSessionId) {
      return NextResponse.json({ ok: true, ignored: "missing callSessionId" });
    }

    const existing = db
      .prepare(`SELECT * FROM call_sessions WHERE id = ? LIMIT 1`)
      .get(callSessionId) as any;

    if (!existing) {
      return NextResponse.json({ ok: true, ignored: "call session not found" });
    }

    if (recordingUrl) {
      db.prepare(
        `
        UPDATE call_sessions
        SET recording_url = ?
        WHERE id = ?
        `
      ).run(recordingUrl, callSessionId);
    }

    if (Number(existing.billed ?? 0) === 1 && String(existing.status) === "completed") {
      return NextResponse.json({ ok: true, already_billed: true });
    }

    if (["in-progress", "answered"].includes(callStatus) && !existing.started_at) {
      db.prepare(
        `
        UPDATE call_sessions
        SET
          status = 'active',
          started_at = ?,
          call_sid = CASE WHEN ? <> '' THEN ? ELSE call_sid END
        WHERE id = ?
        `
      ).run(now, callSid, callSid, callSessionId);

      return NextResponse.json({
        ok: true,
        status: "active",
        call_sid: callSid || null,
      });
    }

    const finishedStatuses = [
      "completed",
      "busy",
      "no-answer",
      "failed",
      "canceled",
      "cancelled",
    ];

    if (!finishedStatuses.includes(callStatus)) {
      return NextResponse.json({
        ok: true,
        status: callStatus || null,
        call_sid: callSid || null,
        duration_seconds: durationSeconds,
        recording_url: recordingUrl || null,
      });
    }

    const result = db.transaction(() => {
      db.prepare(
        `
        UPDATE call_sessions
        SET
          status = ?,
          ended_at = COALESCE(ended_at, ?),
          duration_seconds = CASE WHEN ? > 0 THEN ? ELSE duration_seconds END,
          recording_url = CASE WHEN ? <> '' THEN ? ELSE recording_url END,
          call_sid = CASE WHEN ? <> '' THEN ? ELSE call_sid END
        WHERE id = ?
        `
      ).run(
        callStatus,
        now,
        durationSeconds,
        durationSeconds,
        recordingUrl,
        recordingUrl,
        callSid,
        callSid,
        callSessionId
      );

      const fresh = db
        .prepare(`SELECT * FROM call_sessions WHERE id = ? LIMIT 1`)
        .get(callSessionId) as any;

      if (!fresh) {
        return { billed: false, reason: "fresh session missing" };
      }

      if (fresh.consultor_id) {
        db.prepare(
          `
          UPDATE consultores
          SET ocupado = 0,
              online = 1,
              last_seen_at = strftime('%s','now')
          WHERE id = ?
          `
        ).run(Number(fresh.consultor_id));
      } else if (consultorIdFromUrl > 0) {
        db.prepare(
          `
          UPDATE consultores
          SET ocupado = 0,
              online = 1,
              last_seen_at = strftime('%s','now')
          WHERE id = ?
          `
        ).run(consultorIdFromUrl);
      }

      const alreadyBilled = Number(fresh.billed ?? 0) === 1;

      if (
        callStatus !== "completed" ||
        alreadyBilled ||
        durationSeconds <= 0 ||
        !fresh.cliente_id ||
        !fresh.consultor_id
      ) {
        return {
          billed: false,
          reason: "not billable",
          status: callStatus,
          duration_seconds: durationSeconds,
        };
      }

      const consultor = db
        .prepare(
          `
          SELECT percentagem_ganho
          FROM consultores
          WHERE id = ?
          LIMIT 1
          `
        )
        .get(fresh.consultor_id) as any;

      const percentagem = Number(consultor?.percentagem_ganho ?? 40);
      const pricePerMin = Number(fresh.price_per_min ?? 0);
      const pricePerSecond = pricePerMin / 60;

      if (pricePerMin <= 0 || pricePerSecond <= 0) {
        db.prepare(
          `
          UPDATE call_sessions
          SET billed = 1
          WHERE id = ?
          `
        ).run(callSessionId);

        return { billed: false, reason: "invalid price" };
      }

      const totalToCharge = round4(durationSeconds * pricePerSecond);

      const clienteWallet = getOrCreateWallet("cliente", Number(fresh.cliente_id));
      const consultorWallet = getOrCreateWallet("consultor", Number(fresh.consultor_id));

      const clientBalance = round4(Number(clienteWallet.balance_eur || 0));
      const debit = round4(Math.min(clientBalance, totalToCharge));
      const consultorShare = round4(debit * (percentagem / 100));

      if (debit <= 0) {
        db.prepare(
          `
          UPDATE call_sessions
          SET billed = 1,
              total_charged_eur = 0,
              consultor_earned_eur = 0
          WHERE id = ?
          `
        ).run(callSessionId);

        return { billed: true, charged: 0, consultor_earned: 0 };
      }

      db.prepare(
        `
        UPDATE wallets
        SET balance_eur = ?,
            spent_eur = spent_eur + ?,
            updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(round4(clientBalance - debit), debit, clienteWallet.id);

      db.prepare(
        `
        INSERT INTO wallet_transactions (
          wallet_id,
          session_id,
          type,
          amount_eur,
          description
        )
        VALUES (?, ?, 'debit', ?, ?)
        `
      ).run(
        clienteWallet.id,
        callSessionId,
        round4(-debit),
        `Chamada voz ${durationSeconds}s`
      );

      db.prepare(
        `
        UPDATE wallets
        SET balance_eur = balance_eur + ?,
            earned_eur = earned_eur + ?,
            updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(consultorShare, consultorShare, consultorWallet.id);

      db.prepare(
        `
        INSERT INTO wallet_transactions (
          wallet_id,
          session_id,
          type,
          amount_eur,
          description
        )
        VALUES (?, ?, 'consultor_earned', ?, ?)
        `
      ).run(
        consultorWallet.id,
        callSessionId,
        consultorShare,
        `Ganho chamada voz ${durationSeconds}s`
      );

      db.prepare(
        `
        UPDATE call_sessions
        SET billed = 1,
            duration_seconds = ?,
            total_charged_eur = ?,
            consultor_earned_eur = ?
        WHERE id = ?
        `
      ).run(durationSeconds, debit, consultorShare, callSessionId);

      return {
        billed: true,
        charged: debit,
        consultor_earned: consultorShare,
        duration_seconds: durationSeconds,
        price_per_second: pricePerSecond,
      };
    })();

    return NextResponse.json({
      ok: true,
      status: callStatus || null,
      call_sid: callSid || null,
      duration_seconds: durationSeconds,
      recording_url: recordingUrl || null,
      result,
    });
  } catch (e: any) {
    console.error("ERRO TWILIO STATUS:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no status Twilio" },
      { status: 500 }
    );
  }
}