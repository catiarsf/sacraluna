export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ sessionId: string }>;
  }
) {
  try {
    const { sessionId } = await params;
    const id = String(sessionId || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "sessionId inválido" },
        { status: 400 }
      );
    }

    const rows = db
      .prepare(
        `
        SELECT sender_role, text, sent_at
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY sent_at ASC
        LIMIT 200
        `
      )
      .all(id);

    return NextResponse.json({
      ok: true,
      messages: rows,
    });
  } catch (err: any) {
    console.error("ERRO chat messages:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao carregar mensagens",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}