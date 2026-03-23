import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

type ConsultorRow = {
  id: number;
  nome: string;
  email: string;
  password: string;
  ativo: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Preenche o email e a password." },
        { status: 400 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT id, nome, email, password, ativo
        FROM consultores
        WHERE lower(email) = ?
        LIMIT 1
        `
      )
      .get(email) as ConsultorRow | undefined;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 401 }
      );
    }

    let bcryptOk = false;
    try {
      bcryptOk = await bcrypt.compare(password, String(consultor.password ?? ""));
    } catch {
      bcryptOk = false;
    }

    const plainOk = String(consultor.password ?? "") === password;
    const passwordOk = bcryptOk || plainOk;

    if (!passwordOk) {
      return NextResponse.json(
        {
          ok: false,
          error: "Password inválida.",
          debug: {
            emailEncontrado: consultor.email,
            ativo: consultor.ativo,
            bcryptOk,
            plainOk,
          },
        },
        { status: 401 }
      );
    }

    if (Number(consultor.ativo ?? 0) !== 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "Este consultor está inativo.",
          debug: {
            emailEncontrado: consultor.email,
            ativo: consultor.ativo,
          },
        },
        { status: 403 }
      );
    }

    // Ao fazer login, fica online e limpa qualquer "ocupado" preso
    db.prepare(
      `
      UPDATE consultores
      SET online = 1,
          ocupado = 0,
          last_seen_at = strftime('%s','now')
      WHERE id = ?
      `
    ).run(consultor.id);

    const role = "consultor";

    const res = NextResponse.json({
      ok: true,
      consultor: {
        id: Number(consultor.id),
        nome: String(consultor.nome ?? ""),
        email: String(consultor.email ?? ""),
        role,
      },
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookies.set("consultor_id", String(consultor.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("consultor_nome", String(consultor.nome ?? ""), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("consultor_role", role, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
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