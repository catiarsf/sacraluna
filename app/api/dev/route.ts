import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    // cria ou atualiza o teu utilizador
    const existing = db.prepare(`
      SELECT id FROM consultores WHERE email = ?
    `).get("tarotemagia8@gmail.com");

    if (existing) {
      db.prepare(`
        UPDATE consultores
        SET password = ?, ativo = 1, role = 'admin'
        WHERE email = ?
      `).run("123456", "tarotemagia8@gmail.com");
    } else {
      db.prepare(`
        INSERT INTO consultores (nome, email, password, ativo, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        "Raquel",
        "tarotemagia8@gmail.com",
        "123456",
        1,
        "admin"
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Consultor admin pronto!",
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
    });
  }
}