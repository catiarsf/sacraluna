export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

function norm(v: any) {
  return String(v ?? "").trim();
}

async function getDb() {
  const mod = await import("@/lib/db");
  return mod.db ?? mod.default;
}

export async function GET() {
  try {
    const db = await getDb();
    const session = await getSession();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
    }

    if (user.role !== "cliente") {
      return NextResponse.json({ ok: false, error: "Sem permissão." }, { status: 403 });
    }

    const cliente = db.prepare(`
      SELECT id, nome, email, telefone, role
      FROM users
      WHERE id = ? AND role = 'cliente'
      LIMIT 1
    `).get(user.id) as any;

    if (!cliente) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, cliente });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar perfil." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const session = await getSession();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
    }

    if (user.role !== "cliente") {
      return NextResponse.json({ ok: false, error: "Sem permissão." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const nome = norm(body.nome);
    const email = norm(body.email).toLowerCase();
    const telefone = norm(body.telefone);
    const password = norm(body.password);

    if (!nome) {
      return NextResponse.json({ ok: false, error: "O nome é obrigatório." }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Email inválido." }, { status: 400 });
    }

    const emailExiste = db.prepare(`
      SELECT id FROM users
      WHERE lower(email) = ? AND id <> ?
      LIMIT 1
    `).get(email, user.id) as any;

    if (emailExiste) {
      return NextResponse.json(
        { ok: false, error: "Este email já está a ser usado por outra conta." },
        { status: 400 }
      );
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { ok: false, error: "A password deve ter pelo menos 6 caracteres." },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);

      db.prepare(`
        UPDATE users
        SET nome = ?, email = ?, telefone = ?, password_hash = ?
        WHERE id = ? AND role = 'cliente'
      `).run(nome, email, telefone, passwordHash, user.id);
    } else {
      db.prepare(`
        UPDATE users
        SET nome = ?, email = ?, telefone = ?
        WHERE id = ? AND role = 'cliente'
      `).run(nome, email, telefone, user.id);
    }

    const cliente = db.prepare(`
      SELECT id, nome, email, telefone, role
      FROM users
      WHERE id = ?
      LIMIT 1
    `).get(user.id);

    return NextResponse.json({ ok: true, cliente });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao guardar perfil." },
      { status: 500 }
    );
  }
}