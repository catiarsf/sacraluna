import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    // cria coluna role se não existir
    try {
      db.prepare(`
        ALTER TABLE consultores ADD COLUMN role TEXT DEFAULT 'consultor'
      `).run();
    } catch {}

    // insere ou substitui consultor admin
    db.prepare(`
      INSERT INTO consultores (nome, email, password, ativo, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      "Raquel",
      "tarotemagia8@gmail.com",
      "123456", // 🔴 mete aqui a password que queres usar
      1,
      "admin"
    );

    return NextResponse.json({
      ok: true,
      message: "Consultor admin criado!",
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
    });
  }
}