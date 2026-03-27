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

    if (!Number.isFinite(servicoId) || servicoId <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID inválido." },
        { status: 400 }
      );
    }

    const atual = db
      .prepare(
        `
        SELECT
          id,
          nome,
          descricao,
          preco_eur,
          imagem_url,
          ativo
        FROM servicos
        WHERE id = ?
        `
      )
      .get(servicoId) as any;

    if (!atual) {
      return NextResponse.json(
        { ok: false, error: "Serviço não encontrado." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const isOnlyToggle =
      Object.prototype.hasOwnProperty.call(body, "ativo") &&
      !Object.prototype.hasOwnProperty.call(body, "nome") &&
      !Object.prototype.hasOwnProperty.call(body, "descricao") &&
      !Object.prototype.hasOwnProperty.call(body, "preco_eur") &&
      !Object.prototype.hasOwnProperty.call(body, "imagem_url");

    if (isOnlyToggle) {
      const ativo = body?.ativo ? 1 : 0;

      const info = db
        .prepare(
          `
          UPDATE servicos
          SET ativo = ?
          WHERE id = ?
          `
        )
        .run(ativo, servicoId);

      if (!info.changes) {
        return NextResponse.json(
          { ok: false, error: "Nada foi alterado." },
          { status: 400 }
        );
      }

      const atualizado = db
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
        .get(servicoId);

      return NextResponse.json({
        ok: true,
        servico: atualizado,
      });
    }

    const nome = norm(body?.nome);
    const descricao = norm(body?.descricao);
    const preco_eur = toNumber(body?.preco_eur);
    const imagem_url = norm(body?.imagem_url) || "/servicos/default.jpg";
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
        UPDATE servicos
        SET
          nome = ?,
          descricao = ?,
          preco_eur = ?,
          imagem_url = ?,
          ativo = ?
        WHERE id = ?
        `
      )
      .run(
        nome,
        descricao,
        preco_eur,
        imagem_url,
        ativo,
        servicoId
      );

    if (!info.changes) {
      return NextResponse.json(
        { ok: false, error: "Nada foi alterado." },
        { status: 400 }
      );
    }

    const atualizado = db
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
      .get(servicoId);

    return NextResponse.json({
      ok: true,
      servico: atualizado,
    });
  } catch (err: any) {
    console.error("ERRO PUT /api/admin/servicos/[id]:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const servicoId = Number(id);

    if (!Number.isFinite(servicoId) || servicoId <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID inválido." },
        { status: 400 }
      );
    }

    const servico = db
      .prepare(`SELECT id FROM servicos WHERE id = ?`)
      .get(servicoId) as any;

    if (!servico) {
      return NextResponse.json(
        { ok: false, error: "Serviço não encontrado." },
        { status: 404 }
      );
    }

    const pedidos = db
      .prepare(
        `
        SELECT COUNT(*) as total
        FROM pedidos_servicos
        WHERE servico_id = ?
        `
      )
      .get(servicoId) as any;

    if (Number(pedidos?.total ?? 0) > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Este serviço já tem pedidos associados. Desativa-o em vez de apagar.",
        },
        { status: 400 }
      );
    }

    db.prepare(`DELETE FROM servicos WHERE id = ?`).run(servicoId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("ERRO DELETE /api/admin/servicos/[id]:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}