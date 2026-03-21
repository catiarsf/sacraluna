import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Preenche o email e a password." },
        { status: 400 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT id, nome, email, password, ativo, role
        FROM consultores
        WHERE lower(email) = ?
        LIMIT 1
        `
      )
      .get(email) as any;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    if (String(consultor.password ?? "") !== password) {
      return NextResponse.json(
        { ok: false, error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    if (Number(consultor.ativo ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Este consultor está inativo." },
        { status: 403 }
      );
    }

    const role = String(consultor.role ?? "consultor");

    const res = NextResponse.json({
      ok: true,
      consultor: {
        id: Number(consultor.id),
        nome: String(consultor.nome ?? ""),
        email: String(consultor.email ?? ""),
        role,
      },
    });

    res.cookies.set("consultor_id", String(consultor.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("consultor_nome", String(consultor.nome ?? ""), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("consultor_role", role, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}