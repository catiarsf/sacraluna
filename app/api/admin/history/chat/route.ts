import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const sessions = db
      .prepare(
        `
        SELECT
          cs.id,
          cs.cliente_nome,
          cs.created_at,
          cs.started_at,
          cs.ended_at,
          cs.billed_seconds,
          cs.total_charged_eur,
          cs.consultor_earned_eur,
          cs.status,
          c.nome AS consultor_nome
        FROM chat_sessions cs
        LEFT JOIN consultores c ON c.id = cs.consultor_id
        ORDER BY cs.created_at DESC
        LIMIT 200
        `
      )
      .all() as any[];

    const result = sessions.map((s) => {
      const messages = db
        .prepare(
          `
          SELECT sender_role, text, sent_at
          FROM chat_messages
          WHERE session_id = ?
          ORDER BY sent_at ASC, id ASC
          `
        )
        .all(s.id) as any[];

      return {
        id: String(s.id),
        cliente_nome: String(s.cliente_nome ?? ""),
        consultor_nome: String(s.consultor_nome ?? ""),
        created_at: Number(s.created_at ?? 0),
        started_at: Number(s.started_at ?? 0),
        ended_at: Number(s.ended_at ?? 0),
        billed_seconds: Number(s.billed_seconds ?? 0),
        total_charged_eur: Number(s.total_charged_eur ?? 0),
        consultor_earned_eur: Number(s.consultor_earned_eur ?? 0),
        status: String(s.status ?? ""),
        messages,
      };
    });

    return NextResponse.json({
      ok: true,
      sessions: result,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar histórico de chats." },
      { status: 500 }
    );
  }
}