import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

function norm(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = norm((body as any)?.email).toLowerCase();
    const password = norm((body as any)?.password);

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email e password são obrigatórios." },
        { status: 400 }
      );
    }

    const user = db
      .prepare(`SELECT id, email FROM users WHERE lower(email) = ?`)
      .get(email) as { id: number; email: string } | undefined;

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Utilizador não encontrado." },
        { status: 404 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
      `
    ).run(password_hash, user.id);

    return NextResponse.json({
      ok: true,
      message: "Password atualizada com sucesso.",
      email: user.email,
    });
  } catch (e: any) {
    console.error("ERRO reset-password:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}