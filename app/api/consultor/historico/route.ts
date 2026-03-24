import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const rows = db
      .prepare(
        `
        SELECT
          id,
          cliente_id,
          cliente_nome,
          status,
          price_per_min,
          billed_seconds,
          total_charged_eur,
          consultor_earned_eur,
          started_at,
          ended_at,
          created_at
        FROM chat_sessions
        WHERE consultor_id = ?
        ORDER BY created_at DESC
        `
      )
      .all(consultorId);

    return NextResponse.json({
      ok: true,
      historico: rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar histórico." },
      { status: 500 }
    );
  }
}