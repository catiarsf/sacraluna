export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

function norm(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const { default: db } = await import("@/lib/db");

    const body = await req.json();

    const nome = norm(body?.nome);
    const email = norm(body?.email).toLowerCase();
    const telefone = norm(body?.telefone);
    const password = norm(body?.password ?? body?.palavraPasse);

    if (!nome || !email || !telefone || !password) {
      return NextResponse.json(
        { ok: false, error: "Preenche todos os campos." },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Email inválido." },
        { status: 400 }
      );
    }

    if (!telefone.startsWith("+")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "O número deve começar por + e incluir o indicativo, por exemplo +3519XXXXXXXX.",
        },
        { status: 400 }
      );
    }

    const existe = db
      .prepare(`SELECT id FROM users WHERE lower(email) = ?`)
      .get(email) as any;

    if (existe) {
      return NextResponse.json(
        { ok: false, error: "Este email já está registado." },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `
          INSERT INTO users (nome, email, telefone, password_hash, role)
          VALUES (?, ?, ?, ?, 'cliente')
          `
        )
        .run(nome, email, telefone, password_hash);

      const userId = Number(info.lastInsertRowid);

      db.prepare(
        `
        INSERT INTO wallets (
          user_type,
          user_id,
          balance_eur,
          earned_eur,
          spent_eur
        )
        VALUES ('cliente', ?, 0, 0, 0)
        `
      ).run(userId);

      return userId;
    });

    const userId = tx();

    return NextResponse.json({
      ok: true,
      userId,
    });
  } catch (e: any) {
    console.error("ERRO REGISTO:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}