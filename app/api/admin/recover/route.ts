import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const token = String(body?.token ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const nome = String(body?.nome ?? "Administrador").trim();
    const password = String(body?.password ?? "");

    const expectedToken = String(process.env.ADMIN_RECOVERY_TOKEN ?? "").trim();

    if (!expectedToken) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_RECOVERY_TOKEN não configurado." },
        { status: 500 }
      );
    }

    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { ok: false, error: "Token inválido." },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email e password são obrigatórios." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const existing = db
      .prepare(
        `
        SELECT id, email, role
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
        SET
          nome = ?,
          password_hash = ?,
          role = 'admin'
        WHERE id = ?
        `
      ).run(nome, passwordHash, existing.id);

      return NextResponse.json({
        ok: true,
        action: "updated",
        user_id: Number(existing.id),
        email,
        role: "admin",
      });
    }

    const info = db
      .prepare(
        `
        INSERT INTO users (nome, email, password_hash, role, created_at)
        VALUES (?, ?, ?, 'admin', strftime('%s','now'))
        `
      )
      .run(nome, email, passwordHash);

    return NextResponse.json({
      ok: true,
      action: "created",
      user_id: Number(info.lastInsertRowid),
      email,
      role: "admin",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao recuperar admin." },
      { status: 500 }
    );
  }
}