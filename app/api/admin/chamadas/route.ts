export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "Sem login." },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    const calls = db
      .prepare(
        `
        SELECT
          cs.id,
          cs.cliente_id,
          cs.consultor_id,
          cs.cliente_nome,
          cs.status,
          cs.call_sid,
          cs.price_per_min,
          cs.duration_seconds,
          cs.total_charged_eur,
          cs.consultor_earned_eur,
          cs.billed,
          cs.recording_url,
          cs.created_at,
          cs.started_at,
          cs.ended_at,
          c.nome AS consultor_nome
        FROM call_sessions cs
        LEFT JOIN consultores c ON c.id = cs.consultor_id
        ORDER BY cs.created_at DESC
        LIMIT 300
        `
      )
      .all() as any[];

    return NextResponse.json({
      ok: true,
      calls: calls.map((c) => ({
        id: String(c.id),
        cliente_id: Number(c.cliente_id ?? 0),
        consultor_id: Number(c.consultor_id ?? 0),
        cliente_nome: String(c.cliente_nome ?? "Cliente"),
        consultor_nome: String(c.consultor_nome ?? "Consultor"),
        status: String(c.status ?? ""),
        call_sid: String(c.call_sid ?? ""),
        price_per_min: Number(c.price_per_min ?? 0),
        price_per_second: Number(c.price_per_min ?? 0) / 60,
        duration_seconds: Number(c.duration_seconds ?? 0),
        total_charged_eur: Number(c.total_charged_eur ?? 0),
        consultor_earned_eur: Number(c.consultor_earned_eur ?? 0),
        billed: Number(c.billed ?? 0),
        recording_url: String(c.recording_url ?? ""),
        created_at: Number(c.created_at ?? 0),
        started_at: Number(c.started_at ?? 0),
        ended_at: Number(c.ended_at ?? 0),
      })),
    });
  } catch (e: any) {
    console.error("ERRO /api/admin/chamadas:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar chamadas." },
      { status: 500 }
    );
  }
}