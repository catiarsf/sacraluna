export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const token = String(searchParams.get("token") ?? "").trim();
    const email = String(searchParams.get("email") ?? "").trim().toLowerCase();
    const nome = String(searchParams.get("nome") ?? "Admin").trim();
    const password = String(searchParams.get("password") ?? "").trim();

    if (!process.env.ADMIN_RECOVERY_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_RECOVERY_TOKEN não configurado." },
        { status: 500 }
      );
    }

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

    const passwordHash = await bcrypt.hash(password, 10);

    const existing = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE lower(email) = ?
        LIMIT 1
        `
      )
      .get(email) as any;

    if (existing) {
      db.prepare(
        `
        UPDATE users
        SET nome = ?, password_hash = ?, role = 'admin'
        WHERE id = ?
        `
      ).run(nome, passwordHash, existing.id);

      return NextResponse.json({
        ok: true,
        action: "updated",
        email,
      });
    }

    db.prepare(
      `
      INSERT INTO users (nome, email, password_hash, role, created_at)
      VALUES (?, ?, ?, 'admin', strftime('%s','now'))
      `
    ).run(nome, email, passwordHash);

    return NextResponse.json({
      ok: true,
      action: "created",
      email,
    });
  } catch (e: any) {
    console.error("ERRO /api/admin/recover:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}