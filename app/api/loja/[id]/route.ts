import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const servicoId = Number(id);

    if (!Number.isFinite(servicoId) || servicoId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Serviço inválido." },
        { status: 400 }
      );
    }

    const servico = db
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
        WHERE id = ? AND ativo = 1
        LIMIT 1
        `
      )
      .get(servicoId) as any;

    if (!servico) {
      return NextResponse.json(
        { ok: false, error: "Serviço não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      servico,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}