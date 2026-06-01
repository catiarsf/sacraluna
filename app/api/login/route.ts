import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import  db  from "@/lib/db";
import { getSession } from "@/lib/auth";

type UserRow = {
  id: number;
  role: "cliente" | "consultor" | "admin";
  nome: string;
  email: string;
  password_hash: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Campos em falta." },
        { status: 400 }
      );
    }

    const user = db
      .prepare(
        `
        SELECT id, role, nome, email, password_hash
        FROM users
        WHERE lower(email) = ?
        `
      )
      .get(email) as UserRow | undefined;

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.user = {
      id: user.id,
      role: user.role,
      nome: user.nome,
      email: user.email,
    };
    await session.save();

    return NextResponse.json({
      ok: true,
      role: user.role,
    });
  } catch (err: any) {
    console.error("ERRO /api/login:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}