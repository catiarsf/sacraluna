import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    db.prepare(`
      ALTER TABLE consultores ADD COLUMN role TEXT DEFAULT 'consultor'
    `).run();

    db.prepare(`
      UPDATE consultores
      SET role = 'admin'
      WHERE email = 'tarotemagia8@gmail.com'
    `).run();

    return NextResponse.json({
      ok: true,
      message: "Coluna criada e admin atualizado!",
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
    });
  }
}