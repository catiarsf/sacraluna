import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!consultorId) {
      return NextResponse.json(
        { ok: false, error: "Consultor não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.session_id ?? "").trim();
    const action = String(body?.action ?? "").trim().toLowerCase();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Sessão inválida." },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { ok: false, error: "Ação inválida." },
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
      .get(sessionId) as any;

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (Number(row.consultor_id) !== consultorId) {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    if (String(row.status) !== "pending") {
      return NextResponse.json(
        { ok: false, error: "Esta sessão já não está pendente." },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    if (action === "reject") {
      db.transaction(() => {
        db.prepare(
          `
          UPDATE chat_sessions
          SET status = 'rejected',
              ended_at = ?
          WHERE id = ?
          `
        ).run(now, sessionId);

        db.prepare(
          `
          UPDATE consultores
          SET ocupado = 0,
              last_seen_at = ?
          WHERE id = ?
          `
        ).run(now, consultorId);
      })();

      return NextResponse.json({
        ok: true,
        status: "rejected",
        session_id: sessionId,
      });
    }

    db.transaction(() => {
      db.prepare(
        `
        UPDATE chat_sessions
        SET status = 'active',
            started_at = ?
        WHERE id = ?
        `
      ).run(now, sessionId);

      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 1,
            online = 1,
            last_seen_at = ?
        WHERE id = ?
        `
      ).run(now, consultorId);
    })();

    return NextResponse.json({
      ok: true,
      status: "active",
      session_id: sessionId,
      redirect_url: `/chat/${consultorId}?session=${encodeURIComponent(sessionId)}&role=consultor`,
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/respond:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao responder ao pedido." },
      { status: 500 }
    );
  }
}