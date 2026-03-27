export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!consultorId) {
      return NextResponse.json(
        { ok: false, error: "Consultor não autenticado." },
        { status: 401 }
      );
    }

    const calls = db.prepare(`
      SELECT
        id,
        cliente_nome,
        status,
        call_sid,
        price_per_min,
        duration_seconds,
        recording_url,
        created_at,
        started_at,
        ended_at
      FROM call_sessions
      WHERE consultor_id = ?
      ORDER BY created_at DESC
    `).all(consultorId);

    return NextResponse.json({
      ok: true,
      calls,
    });
  } catch (e: any) {
    console.error("ERRO /api/consultor/calls:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}