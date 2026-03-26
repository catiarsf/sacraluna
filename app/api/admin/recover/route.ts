export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const nome = searchParams.get("nome");
    const password = searchParams.get("password");

    if (token !== process.env.ADMIN_RECOVERY_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Token inválido." },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email ou password em falta." },
        { status: 400 }
      );
    }

    const existing = db
      .prepare(`SELECT id FROM users WHERE email = ?`)
      .get(email) as any;

    if (existing) {
      db.prepare(
        `
        UPDATE users
        SET password = ?, role = 'admin'
        WHERE email = ?
        `
      ).run(password, email);

      return NextResponse.json({
        ok: true,
        action: "updated",
      });
    }

    db.prepare(
      `
      INSERT INTO users (email, password, nome, role)
      VALUES (?, ?, ?, 'admin')
      `
    ).run(email, password, nome || "Admin");

    return NextResponse.json({
      ok: true,
      action: "created",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno" },
      { status: 500 }
    );
  }
}