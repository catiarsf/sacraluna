import { NextResponse } from "next/server";
import db from "@/lib/db";

async function runSeed() {
  const email = "tarotemagia8@gmail.com";
  const nome = "Raquel Ferreira";

  const existe = db.prepare("SELECT id FROM consultores WHERE email=?").get(email);

  if (!existe) {
    db.prepare(`
      INSERT INTO consultores (nome, email, password, preco_por_min, foto_url, ativo, destaque)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `).run(nome, email, "porto4ever", 1.0, "/consultores/default.jpg");
  } else {
    db.prepare(`UPDATE consultores SET destaque=1, ativo=1 WHERE email=?`).run(email);
  }

  return { ok: true };
}

export async function GET() {
  try {
    const result = await runSeed();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}