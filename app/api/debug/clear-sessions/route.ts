import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 🔥 limpa TODAS sessões presas
    db.prepare(`
      UPDATE chat_sessions
      SET status = 'ended',
          ended_at = strftime('%s','now')
      WHERE status IN ('active','pending')
    `).run();

    // 🔥 liberta TODOS os consultores
    db.prepare(`
      UPDATE consultores
      SET ocupado = 0
    `).run();

    return NextResponse.json({
      ok: true,
      message: "Sessões limpas com sucesso.",
    });
  } catch (e: any) {
    console.error("ERRO CLEAR SESSIONS:", e);

    return NextResponse.json({
      ok: false,
      error: e?.message || "Erro ao limpar sessões.",
    });
  }
}