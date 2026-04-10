export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number.parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  try {
    const { db } = await import("@/lib/db");

    const servicos = db
      .prepare(
        `
        SELECT
          s.id,
          s.nome,
          s.descricao,
          s.preco_tipo,
          s.preco_eur,
          s.preco_texto,
          s.comissao_tipo,
          s.comissao_valor,
          s.imagem_url,
          s.ativo,
          s.consultor_id,
          c.nome as consultor_nome,
          s.created_at
        FROM servicos s
        LEFT JOIN consultores c ON c.id = s.consultor_id
        ORDER BY s.id DESC
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
    const { db } = await import("@/lib/db");

    const body = await req.json().catch(() => ({}));

    const nome = norm(body?.nome);
    const descricao = norm(body?.descricao);
    const consultor_id = Number(body?.consultor_id);
    const preco_tipo = norm(body?.preco_tipo) || "fixo";
    const preco_eur = toNumber(body?.preco_eur);
    const preco_texto = norm(body?.preco_texto);
    const comissao_tipo = norm(body?.comissao_tipo) || "percentagem";
    const comissao_valor = toNumber(body?.comissao_valor);
    const imagem_url = norm(body?.imagem_url);
    const ativo = body?.ativo ? 1 : 0;

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "O nome é obrigatório." },
        { status: 400 }
      );
    }

    if (!consultor_id) {
      return NextResponse.json(
        { ok: false, error: "Tens de escolher a consultora." },
        { status: 400 }
      );
    }

    if (preco_tipo === "fixo" && preco_eur <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço inválido." },
        { status: 400 }
      );
    }

    if (preco_tipo === "sob_consulta" && !preco_texto) {
      return NextResponse.json(
        { ok: false, error: "Texto de preço obrigatório." },
        { status: 400 }
      );
    }

    const info = db
      .prepare(
        `
        INSERT INTO servicos (
          consultor_id,
          nome,
          descricao,
          preco_tipo,
          preco_eur,
          preco_texto,
          comissao_tipo,
          comissao_valor,
          imagem_url,
          ativo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        consultor_id,
        nome,
        descricao,
        preco_tipo,
        preco_tipo === "fixo" ? preco_eur : 0,
        preco_tipo === "sob_consulta" ? preco_texto : null,
        comissao_tipo,
        comissao_valor || 40,
        imagem_url || "/servicos/default.jpg",
        ativo
      );

    return NextResponse.json({
      ok: true,
      id: info.lastInsertRowid,
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