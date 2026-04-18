export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const consultorId = Number(searchParams.get("consultorId") || 0);
    const callSessionId = String(searchParams.get("callSessionId") || "").trim();

    const formData = await req.formData().catch(() => null);

    const callStatus = String(formData?.get("CallStatus") || "").toLowerCase();
    const callSid = String(formData?.get("CallSid") || "").trim();
    const callDuration = toNumber(formData?.get("CallDuration") || 0);

    const recordingUrlRaw = String(formData?.get("RecordingUrl") || "").trim();
    const recordingUrl = recordingUrlRaw ? `${recordingUrlRaw}.mp3` : "";

    const now = Math.floor(Date.now() / 1000);

    if (!callSessionId) {
      return NextResponse.json({ ok: true });
    }

    const existing = db
      .prepare(`SELECT * FROM call_sessions WHERE id = ? LIMIT 1`)
      .get(callSessionId) as any;

    if (!existing) {
      return NextResponse.json({ ok: true });
    }

    if (existing.status === "completed" && Number(existing.billed ?? 0) === 1) {
      return NextResponse.json({ ok: true });
    }

    if (callStatus === "answered" && !existing.started_at) {
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

      return NextResponse.json({ ok: true });
    }

    if (
      ["completed", "busy", "no-answer", "failed", "canceled"].includes(callStatus)
    ) {
      db.transaction(() => {
        db.prepare(
          `
          UPDATE call_sessions
          SET
            status = ?,
            ended_at = ?,
            duration_seconds = CASE WHEN ? > 0 THEN ? ELSE duration_seconds END,
            recording_url = CASE WHEN ? <> '' THEN ? ELSE recording_url END,
            call_sid = CASE WHEN ? <> '' THEN ? ELSE call_sid END
          WHERE id = ?
          `
        ).run(
          callStatus,
          now,
          callDuration,
          callDuration,
          recordingUrl,
          recordingUrl,
          callSid,
          callSid,
          callSessionId
        );

        const fresh = db
          .prepare(`SELECT * FROM call_sessions WHERE id = ?`)
          .get(callSessionId) as any;

        const alreadyBilled = Number(fresh?.billed ?? 0) === 1;

        if (
          callStatus === "completed" &&
          !alreadyBilled &&
          callDuration > 0 &&
          fresh?.cliente_id &&
          fresh?.consultor_id
        ) {
          const consultor = db
            .prepare(
              `
              SELECT percentagem_ganho
              FROM consultores
              WHERE id = ?
              `
            )
            .get(fresh.consultor_id) as any;

          const percentagem = round2(Number(consultor?.percentagem_ganho ?? 40));
          const pricePerMin = round2(Number(fresh.price_per_min ?? 0));

          const totalCharged = round2((callDuration / 60) * pricePerMin);

          const clienteWallet = db
            .prepare(
              `
              SELECT *
              FROM wallets
              WHERE user_type = 'cliente' AND user_id = ?
              `
            )
            .get(fresh.cliente_id) as any;

          const consultorWallet = db
            .prepare(
              `
              SELECT *
              FROM wallets
              WHERE user_type = 'consultor' AND user_id = ?
              `
            )
            .get(fresh.consultor_id) as any;

          if (clienteWallet && consultorWallet && totalCharged > 0) {
            const clientBalance = round2(Number(clienteWallet.balance_eur || 0));
            const debit = Math.min(clientBalance, totalCharged);
            const finalConsultorShare = round2(debit * (percentagem / 100));

            db.prepare(
              `
              UPDATE wallets
              SET balance_eur = ?,
                  spent_eur = spent_eur + ?,
                  updated_at = strftime('%s','now')
              WHERE id = ?
              `
            ).run(round2(clientBalance - debit), debit, clienteWallet.id);

            db.prepare(
              `
              INSERT INTO wallet_transactions (
                wallet_id, session_id, type, amount_eur, description
              )
              VALUES (?, ?, 'debit', ?, ?)
              `
            ).run(
              clienteWallet.id,
              callSessionId,
              -debit,
              "Chamada voz"
            );

            db.prepare(
              `
              UPDATE wallets
              SET balance_eur = balance_eur + ?,
                  earned_eur = earned_eur + ?,
                  updated_at = strftime('%s','now')
              WHERE id = ?
              `
            ).run(
              finalConsultorShare,
              finalConsultorShare,
              consultorWallet.id
            );

            db.prepare(
              `
              INSERT INTO wallet_transactions (
                wallet_id, session_id, type, amount_eur, description
              )
              VALUES (?, ?, 'consultor_earned', ?, ?)
              `
            ).run(
              consultorWallet.id,
              callSessionId,
              finalConsultorShare,
              "Ganho chamada"
            );

            db.prepare(
              `
              UPDATE call_sessions
              SET billed = 1,
                  total_charged_eur = ?,
                  consultor_earned_eur = ?
              WHERE id = ?
              `
            ).run(debit, finalConsultorShare, callSessionId);
          } else {
            db.prepare(
              `
              UPDATE call_sessions
              SET billed = 1
              WHERE id = ?
              `
            ).run(callSessionId);
          }
        }

        if (fresh?.consultor_id) {
          db.prepare(
            `
            UPDATE consultores
            SET ocupado = 0,
                online = 1,
                last_seen_at = strftime('%s','now')
            WHERE id = ?
            `
          ).run(fresh.consultor_id);
        }
      });
    }

    if (
      consultorId > 0 &&
      ["busy", "no-answer", "failed", "canceled"].includes(callStatus)
    ) {
      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 0,
            online = 1,
            last_seen_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(consultorId);
    }

    return NextResponse.json({
      ok: true,
      status: callStatus || null,
      call_sid: callSid || null,
      duration_seconds: callDuration || 0,
      recording_url: recordingUrl || null,
    });
  } catch (e: any) {
    console.error("ERRO TWILIO STATUS:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no status Twilio" },
      { status: 500 }
    );
  }
}