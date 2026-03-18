import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number.parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  try {
    const servicos = db
      .prepare(
        `
        SELECT
          id,
          nome,
          descricao,
          preco_eur,
          imagem_url,
          ativo,
          created_at
        FROM servicos
        ORDER BY id DESC
        `
      )
      .all();

    return NextResponse.json({
      ok: true,
      servicos,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao carregar serviços",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const nome = norm(body?.nome);
    const descricao = norm(body?.descricao);
    const preco_eur = toNumber(body?.preco_eur);
    const imagem_url = norm(body?.imagem_url);
    const ativo = body?.ativo ? 1 : 0;

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "O nome do serviço é obrigatório." },
        { status: 400 }
      );
    }

    if (!preco_eur || preco_eur <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço inválido." },
        { status: 400 }
      );
    }

    const info = db
      .prepare(
        `
        INSERT INTO servicos (
          nome,
          descricao,
          preco_eur,
          imagem_url,
          ativo
        )
        VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(
        nome,
        descricao,
        preco_eur,
        imagem_url || "/servicos/default.jpg",
        ativo
      );

    const servico = db
      .prepare(
        `
        SELECT
          id,
          nome,
          descricao,
          preco_eur,
          imagem_url,
          ativo,
          created_at
        FROM servicos
        WHERE id = ?
        `
      )
      .get(info.lastInsertRowid);

    return NextResponse.json({
      ok: true,
      servico,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao criar serviço",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}