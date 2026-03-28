import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function norm(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const nome = norm(body?.nome);
    const email = norm(body?.email).toLowerCase();
    const telefone = norm(body?.telefone);
    const especialidade = norm(body?.especialidade);
    const mensagem = norm(body?.mensagem);

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "O nome é obrigatório." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Email inválido." },
        { status: 400 }
      );
    }

    if (!mensagem) {
      return NextResponse.json(
        { ok: false, error: "A apresentação é obrigatória." },
        { status: 400 }
      );
    }

    const result = db
      .prepare(
        `
        INSERT INTO candidaturas (
          nome,
          email,
          telefone,
          especialidade,
          mensagem,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'novo')
        `
      )
      .run(nome, email, telefone, especialidade, mensagem);

    return NextResponse.json({
      ok: true,
      id: Number(result.lastInsertRowid),
      message: "Candidatura enviada com sucesso.",
    });
  } catch (e: any) {
    console.error("ERRO POST /api/trabalhe-conosco:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}