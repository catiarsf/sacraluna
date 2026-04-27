// app/api/chat/messages/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "../../../../lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const sessionId = String(body?.sessionId ?? body?.session_id ?? "").trim();
    const text = String(body?.text ?? "").trim();

    const senderRole =
      String(body?.senderRole ?? body?.sender_role ?? "") === "consultor"
        ? "consultor"
        : "cliente";

    if (!sessionId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sessão inválida.",
        },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mensagem vazia.",
        },
        { status: 400 }
      );
    }

    const session = db
      .prepare(
        `
        SELECT id
        FROM chat_sessions
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(sessionId) as any;

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sessão não encontrada.",
        },
        { status: 404 }
      );
    }

    const inserted = db
      .prepare(
        `
        INSERT INTO chat_messages (
          session_id,
          sender_role,
          text,
          sent_at
        )
        VALUES (?, ?, ?, strftime('%s','now'))
      `
      )
      .run(sessionId, senderRole, text);

    return NextResponse.json({
      ok: true,
      message_id: Number(inserted.lastInsertRowid),
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/messages:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao guardar mensagem.",
      },
      { status: 500 }
    );
  }
}