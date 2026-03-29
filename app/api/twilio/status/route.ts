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

    if (callSessionId) {
      const existing = db
        .prepare(
          `
          SELECT *
          FROM call_sessions
          WHERE id = ?
          LIMIT 1
          `
        )
        .get(callSessionId) as any;

      if (existing) {
        if (callStatus === "answered" && !existing.started_at) {
          db.prepare(
            `
            UPDATE call_sessions
            SET
              status = ?,
              started_at = ?,
              call_sid = CASE WHEN ? <> '' THEN ? ELSE call_sid END
            WHERE id = ?
            `
          ).run(callStatus, now, callSid, callSid, callSessionId);
        } else if (
          callStatus === "completed" ||
          callStatus === "busy" ||
          callStatus === "no-answer" ||
          callStatus === "failed" ||
          callStatus === "canceled"
        ) {
          db.transaction(() => {
            db.prepare(
              `
              UPDATE call_sessions
              SET
                status = ?,
                ended_at = ?,
                duration_seconds = CASE
                  WHEN ? > 0 THEN ?
                  ELSE COALESCE(duration_seconds, 0)
                END,
                recording_url = CASE
                  WHEN ? <> '' THEN ?
                  ELSE recording_url
                END,
                call_sid = CASE
                  WHEN ? <> '' THEN ?
                  ELSE call_sid
                END
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
              .prepare(`SELECT * FROM call_sessions WHERE id = ? LIMIT 1`)
              .get(callSessionId) as any;

            const alreadyBilled = Number(fresh?.billed ?? 0) === 1;

            if (
              callStatus === "completed" &&
              !alreadyBilled &&
              Number(callDuration) > 0 &&
              Number(fresh?.cliente_id ?? 0) > 0 &&
              Number(fresh?.consultor_id ?? 0) > 0
            ) {
              const consultor = db
                .prepare(
                  `
                  SELECT id, percentagem_ganho
                  FROM consultores
                  WHERE id = ?
                  LIMIT 1
                  `
                )
                .get(fresh.consultor_id) as any;

              const percentagem = round2(Number(consultor?.percentagem_ganho ?? 40));
              const pricePerMin = round2(Number(fresh.price_per_min ?? 0));
              const totalCharged = round2((Number(callDuration) / 60) * pricePerMin);
              const consultorShare = round2(totalCharged * (percentagem / 100));

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
                const clientBalanceNow = round2(Number(clienteWallet.balance_eur || 0));
                const debitAmount = Math.min(clientBalanceNow, totalCharged);
                const finalConsultorShare = round2(debitAmount * (percentagem / 100));

                const newClientBalance = round2(clientBalanceNow - debitAmount);
                const newClientSpent = round2(Number(clienteWallet.spent_eur || 0) + debitAmount);

                db.prepare(
                  `
                  UPDATE wallets
                  SET balance_eur = ?,
                      spent_eur = ?,
                      updated_at = strftime('%s','now')
                  WHERE id = ?
                  `
                ).run(newClientBalance, newClientSpent, clienteWallet.id);

                db.prepare(
                  `
                  INSERT INTO wallet_transactions (
                    wallet_id, session_id, type, amount_eur, description
                  ) VALUES (?, ?, 'debit', ?, ?)
                  `
                ).run(
                  clienteWallet.id,
                  callSessionId,
                  round2(-debitAmount),
                  `Cobrança chamada ${callSessionId}`
                );

                const consultorBalanceNow = round2(Number(consultorWallet.balance_eur || 0));
                const consultorEarnedNow = round2(Number(consultorWallet.earned_eur || 0));

                db.prepare(
                  `
                  UPDATE wallets
                  SET balance_eur = ?,
                      earned_eur = ?,
                      updated_at = strftime('%s','now')
                  WHERE id = ?
                  `
                ).run(
                  round2(consultorBalanceNow + finalConsultorShare),
                  round2(consultorEarnedNow + finalConsultorShare),
                  consultorWallet.id
                );

                db.prepare(
                  `
                  INSERT INTO wallet_transactions (
                    wallet_id, session_id, type, amount_eur, description
                  ) VALUES (?, ?, 'consultor_earned', ?, ?)
                  `
                ).run(
                  consultorWallet.id,
                  callSessionId,
                  finalConsultorShare,
                  `Ganho do consultor na chamada ${callSessionId}`
                );

                db.prepare(
                  `
                  UPDATE call_sessions
                  SET total_charged_eur = ?,
                      consultor_earned_eur = ?,
                      billed = 1
                  WHERE id = ?
                  `
                ).run(debitAmount, finalConsultorShare, callSessionId);
              }
            }
          })();
        } else {
          db.prepare(
            `
            UPDATE call_sessions
            SET
              status = ?,
              call_sid = CASE
                WHEN ? <> '' THEN ?
                ELSE call_sid
              END
            WHERE id = ?
            `
          ).run(callStatus, callSid, callSid, callSessionId);
        }
      }
    }

    if (consultorId > 0) {
      if (
        callStatus === "completed" ||
        callStatus === "busy" ||
        callStatus === "no-answer" ||
        callStatus === "failed" ||
        callStatus === "canceled"
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
      { ok: false, error: e?.message || "Erro no status da Twilio." },
      { status: 500 }
    );
  }
}