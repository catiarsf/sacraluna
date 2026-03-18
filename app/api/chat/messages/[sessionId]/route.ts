import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_req: Request, context: Ctx) {
  try {
    const { sessionId } = await context.params;
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
        SELECT sender_role, text, at
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY at ASC
        LIMIT 200
        `
      )
      .all(id);

    return NextResponse.json({ ok: true, messages: rows });
  } catch (err: any) {
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