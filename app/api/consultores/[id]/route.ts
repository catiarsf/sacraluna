import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: any) {
  try {
    // ctx.params pode ser Promise em algumas versões do Next
    const params = await ctx.params;
    const idRaw = params?.id;

    const id = Number(idRaw);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { error: "ID inválido", debug: { idRaw, params } },
        { status: 400 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT
          id,
          nome,
          email,
          preco_por_min,
          foto_url,
          especialidades,
          apresentacao,
          ativo,
          destaque
        FROM consultores
        WHERE id = ?
        `
      )
      .get(id);

    if (!consultor) {
      return NextResponse.json(
        { error: "Consultor não encontrado", id },
        { status: 404 }
      );
    }

    return NextResponse.json(consultor);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erro ao carregar consultor", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}