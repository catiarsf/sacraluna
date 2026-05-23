export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const calls = db
      .prepare(
        `
        SELECT
          id,
          cliente_nome,
          status,
          call_sid,
          price_per_min,
          duration_seconds,
          total_charged_eur,
          consultor_earned_eur,
          recording_url,
          created_at,
          started_at,
          ended_at
        FROM call_sessions
        WHERE consultor_id = ?
        ORDER BY created_at DESC
        LIMIT 200
        `
      )
      .all(consultorId) as any[];

    return NextResponse.json({
      ok: true,
      calls: calls.map((c) => ({
        id: String(c.id),
        cliente_nome: String(c.cliente_nome ?? "Cliente"),
        status: String(c.status ?? ""),
        call_sid: String(c.call_sid ?? ""),
        price_per_min: Number(c.price_per_min ?? 0),
        price_per_second: Number(c.price_per_min ?? 0) / 60,
        duration_seconds: Number(c.duration_seconds ?? 0),
        total_charged_eur: Number(c.total_charged_eur ?? 0),
        consultor_earned_eur: Number(c.consultor_earned_eur ?? 0),
        recording_url: String(c.recording_url ?? ""),
        created_at: Number(c.created_at ?? 0),
        started_at: Number(c.started_at ?? 0),
        ended_at: Number(c.ended_at ?? 0),
      })),
    });
  } catch (e: any) {
    console.error("ERRO /api/consultor/calls:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar chamadas." },
      { status: 500 }
    );
  }
}