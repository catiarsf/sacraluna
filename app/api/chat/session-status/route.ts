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
    const user = authSession.user;

    const cookieStore = await cookies();
    const consultorIdCookie = Number(cookieStore.get("consultor_id")?.value || 0);

    const row = db
      .prepare(
        `
        SELECT id, cliente_id, consultor_id, status
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
        cliente_id: Number(row.cliente_id),
        consultor_id: Number(row.consultor_id),
        status: String(row.status ?? ""),
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