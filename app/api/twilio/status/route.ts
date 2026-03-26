export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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
    const recordingUrl = recordingUrlRaw
      ? `${recordingUrlRaw}.mp3`
      : "";

    const now = Math.floor(Date.now() / 1000);

    if (callSessionId) {
      const existing = db
        .prepare(
          `
          SELECT id, started_at, ended_at
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