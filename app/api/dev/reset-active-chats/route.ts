export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const result = db
      .prepare(`
        UPDATE chat_sessions
        SET status = 'ended'
        WHERE status = 'active'
      `)
      .run();

    return NextResponse.json({
      ok: true,
      updated: Number(result.changes ?? 0),
    });
  } catch (e: any) {
    console.error("ERRO /api/dev/reset-active-chats:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao limpar sessões ativas.",
      },
      { status: 500 }
    );
  }
}