import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const sessions = db
      .prepare(
        `
        SELECT
          id,
          cliente_nome,
          created_at,
          started_at,
          ended_at,
          billed_seconds,
          total_charged_eur,
          consultor_earned_eur,
          status
        FROM chat_sessions
        WHERE consultor_id = ?
        ORDER BY created_at DESC
        LIMIT 100
        `
      )
      .all(consultorId) as any[];

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
      { ok: false, error: e?.message || "Erro ao carregar histórico." },
      { status: 500 }
    );
  }
}