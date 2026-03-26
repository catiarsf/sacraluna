export const dynamic = "force-dynamic";
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

    const consultorAtual = db
      .prepare(
        `
        SELECT id, online, ocupado, ativo
        FROM consultores
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    if (!consultorAtual) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    if (Number(consultorAtual.ativo ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor não está ativo." },
        { status: 400 }
      );
    }

    if (Number(consultorAtual.online ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor está offline." },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Limpa sessões ativas antigas/presas deste consultor
    db.prepare(
      `
      UPDATE chat_sessions
      SET status = 'ended',
          ended_at = ?
      WHERE consultor_id = ?
        AND status = 'active'
        AND id <> ?
        AND (
          started_at IS NULL
          OR started_at < ?
        )
      `
    ).run(now, consultorId, sessionId, now - 300);

    // Se o consultor estiver marcado como ocupado mas já não tiver sessão ativa,
    // corrige automaticamente antes de aceitar/rejeitar
    const activeSession = db
      .prepare(
        `
        SELECT id
        FROM chat_sessions
        WHERE consultor_id = ?
          AND status = 'active'
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    if (Number(consultorAtual.ocupado ?? 0) === 1 && !activeSession) {
      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 0,
            online = 1,
            last_seen_at = ?
        WHERE id = ?
        `
      ).run(now, consultorId);
    }

    // Revalida depois da limpeza automática
    const consultorRevalidado = db
      .prepare(
        `
        SELECT id, online, ocupado, ativo
        FROM consultores
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    if (!consultorRevalidado) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado após revalidação." },
        { status: 404 }
      );
    }

    if (Number(consultorRevalidado.ativo ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor não está ativo." },
        { status: 400 }
      );
    }

    if (Number(consultorRevalidado.online ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor está offline." },
        { status: 400 }
      );
    }

    if (Number(consultorRevalidado.ocupado ?? 0) === 1 && action === "accept") {
      return NextResponse.json(
        { ok: false, error: "Consultor já está ocupado." },
        { status: 409 }
      );
    }

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
              online = 1,
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