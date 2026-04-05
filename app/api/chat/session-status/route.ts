export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = String(searchParams.get("session_id") || "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "session_id em falta." },
        { status: 400 }
      );
    }

    const authSession = await getSession();
    const user = authSession?.user ?? null;

    const cookieStore = await cookies();
    const consultorIdCookie = Number(cookieStore.get("consultor_id")?.value || 0);

    const row = db
      .prepare(
        `
        SELECT
          id,
          cliente_id,
          consultor_id,
          status,
          price_per_min,
          started_at,
          ended_at,
          billed_seconds,
          total_charged_eur,
          consultor_earned_eur,
          created_at
        FROM chat_sessions
        WHERE id = ?
        `
      )
      .get(sessionId) as any;

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    const isCliente = !!user?.id && Number(row.cliente_id) === Number(user.id);
    const isConsultor =
      !!consultorIdCookie && Number(row.consultor_id) === Number(consultorIdCookie);

    if (!isCliente && !isConsultor) {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      session: {
        id: String(row.id),
        cliente_id: Number(row.cliente_id ?? 0),
        consultor_id: Number(row.consultor_id ?? 0),
        status: String(row.status ?? ""),
        price_per_min: Number(row.price_per_min ?? 0),
        started_at: row.started_at ? Number(row.started_at) : null,
        ended_at: row.ended_at ? Number(row.ended_at) : null,
        billed_seconds: Number(row.billed_seconds ?? 0),
        total_charged_eur: Number(row.total_charged_eur ?? 0),
        consultor_earned_eur: Number(row.consultor_earned_eur ?? 0),
        created_at: Number(row.created_at ?? 0),
      },
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/session-status:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao consultar estado da sessão." },
      { status: 500 }
    );
  }
}