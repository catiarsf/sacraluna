export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = String(searchParams.get("session_id") || "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "session_id em falta" },
        { status: 400 }
      );
    }

    const session = db.prepare(`
      SELECT *
      FROM chat_sessions
      WHERE id = ?
    `).get(sessionId) as any;

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Sessão não encontrada" },
        { status: 404 }
      );
    }

    const consultor = db.prepare(`
      SELECT id, nome, percentagem_ganho
      FROM consultores
      WHERE id = ?
    `).get(session.consultor_id) as any;

    const percentagem = Number(consultor?.percentagem_ganho ?? 40);
    const total = Number(session.total_charged_eur ?? 0);
    const ganho = Number(session.consultor_earned_eur ?? 0);

    const esperado = round2(total * (percentagem / 100));

    return NextResponse.json({
      ok: true,
      session: {
        id: session.id,
        status: session.status,
        price_per_min: session.price_per_min,
        total_charged_eur: total,
        consultor_earned_eur: ganho,
        billed_seconds: session.billed_seconds,
      },
      consultor: {
        id: consultor?.id,
        nome: consultor?.nome,
        percentagem_ganho: percentagem,
      },
      analise: {
        ganho_esperado: esperado,
        ganho_real: ganho,
        diferenca: round2(ganho - esperado),
        correto: round2(ganho) === round2(esperado),
      },
    });

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro debug" },
      { status: 500 }
    );
  }
}