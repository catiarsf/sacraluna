import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const authSession = await getSession();
    const user = authSession.user;

    const cookieStore = await cookies();
    const consultorIdCookie = Number(cookieStore.get("consultor_id")?.value || 0);

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.session_id ?? "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Sessão inválida." },
        { status: 400 }
      );
    }

    const row = db
      .prepare(
        `
        SELECT id, cliente_id, consultor_id, status
        FROM chat_sessions
        WHERE id = ?
        `
      )
      .get(sessionId) as
      | {
          id: string;
          cliente_id: number;
          consultor_id: number;
          status: string;
        }
      | undefined;

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

    if (row.status === "ended") {
      return NextResponse.json({
        ok: true,
        already_ended: true,
        session_id: sessionId,
        status: "ended",
      });
    }

    const now = Math.floor(Date.now() / 1000);

    db.transaction(() => {
      db.prepare(
        `
        UPDATE chat_sessions
        SET status = 'ended',
            ended_at = ?
        WHERE id = ?
        `
      ).run(now, sessionId);

      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 0,
            online = 1,
            last_seen_at = ?
        WHERE id = ?
        `
      ).run(now, row.consultor_id);
    })();

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      status: "ended",
      consultor_id: row.consultor_id,
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/end:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}