export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const consultorId = Number(searchParams.get("consultorId") || 0);

    const formData = await req.formData().catch(() => null);
    const callStatus = String(formData?.get("CallStatus") || "").toLowerCase();

    if (consultorId > 0) {
      if (
        callStatus === "completed" ||
        callStatus === "busy" ||
        callStatus === "no-answer" ||
        callStatus === "failed" ||
        callStatus === "canceled"
      ) {
        db.prepare(`
          UPDATE consultores
          SET ocupado = 0,
              last_seen_at = strftime('%s','now')
          WHERE id = ?
        `).run(consultorId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("ERRO TWILIO STATUS:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}