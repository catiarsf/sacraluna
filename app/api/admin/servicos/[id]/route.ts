import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ id: string }>;
};

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number.parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const servicoId = Number(id);

    const body = await req.json().catch(() => ({}));

    // toggle simples
    if (Object.keys(body).length === 1 && "ativo" in body) {
      db.prepare(`UPDATE servicos SET ativo = ? WHERE id = ?`)
        .run(body.ativo ? 1 : 0, servicoId);

      return NextResponse.json({ ok: true });
    }

    const nome = norm(body?.nome);
    const descricao = norm(body?.descricao);
    const consultor_id = Number(body?.consultor_id);
    const preco_tipo = norm(body?.preco_tipo) || "fixo";
    const preco_eur = toNumber(body?.preco_eur);
    const preco_texto = norm(body?.preco_texto);
    const comissao_tipo = norm(body?.comissao_tipo);
    const comissao_valor = toNumber(body?.comissao_valor);
    const imagem_url = norm(body?.imagem_url) || "/servicos/default.jpg";
    const ativo = body?.ativo ? 1 : 0;

    if (!nome) throw new Error("Nome obrigatório");
    if (!consultor_id) throw new Error("Consultor obrigatório");

    db.prepare(`
      UPDATE servicos
      SET
        consultor_id = ?,
        nome = ?,
        descricao = ?,
        preco_tipo = ?,
        preco_eur = ?,
        preco_texto = ?,
        comissao_tipo = ?,
        comissao_valor = ?,
        imagem_url = ?,
        ativo = ?
      WHERE id = ?
    `).run(
      consultor_id,
      nome,
      descricao,
      preco_tipo,
      preco_tipo === "fixo" ? preco_eur : 0,
      preco_tipo === "sob_consulta" ? preco_texto : null,
      comissao_tipo,
      comissao_valor,
      imagem_url,
      ativo,
      servicoId
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const servicoId = Number(id);

    db.prepare(`DELETE FROM servicos WHERE id = ?`).run(servicoId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro" },
      { status: 500 }
    );
  }
}