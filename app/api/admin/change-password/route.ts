export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.id || user.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const passwordAtual = String(body?.passwordAtual ?? "");
    const novaPassword = String(body?.novaPassword ?? "");
    const confirmarPassword = String(body?.confirmarPassword ?? "");

    if (!passwordAtual || !novaPassword || !confirmarPassword) {
      return NextResponse.json(
        { ok: false, error: "Preenche todos os campos." },
        { status: 400 }
      );
    }

    if (novaPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "A nova password deve ter pelo menos 8 caracteres." },
        { status: 400 }
      );
    }

    if (novaPassword !== confirmarPassword) {
      return NextResponse.json(
        { ok: false, error: "As passwords novas não coincidem." },
        { status: 400 }
      );
    }

    const admin = db
      .prepare(
        `
        SELECT id, password_hash
        FROM users
        WHERE id = ?
          AND role = 'admin'
        LIMIT 1
        `
      )
      .get(user.id) as any;

    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Admin não encontrado." },
        { status: 404 }
      );
    }

    const passwordOk = await bcrypt.compare(passwordAtual, admin.password_hash);

    if (!passwordOk) {
      return NextResponse.json(
        { ok: false, error: "Password atual incorreta." },
        { status: 400 }
      );
    }

    const novoHash = await bcrypt.hash(novaPassword, 10);

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
        AND role = 'admin'
      `
    ).run(novoHash, user.id);

    return NextResponse.json({
      ok: true,
      message: "Password alterada com sucesso.",
    });
  } catch (e: any) {
    console.error("ERRO /api/admin/change-password:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao alterar password." },
      { status: 500 }
    );
  }
}