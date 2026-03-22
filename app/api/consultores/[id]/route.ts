import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: any) {
  try {
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
          telefone,
          preco_por_min,
          preco_chat,
          preco_voz,
          percentagem_ganho,
          foto_url,
          especialidades,
          apresentacao,
          ativo,
          destaque,
          online,
          ocupado,

          pack_1_qtd,
          pack_1_preco,
          pack_2_qtd,
          pack_2_preco,
          pack_3_qtd,
          pack_3_preco,
          pack_4_qtd,
          pack_4_preco
        FROM consultores
        WHERE id = ?
        `
      )
      .get(id) as any;

    if (!consultor) {
      return NextResponse.json(
        { error: "Consultor não encontrado", id },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: Number(consultor.id),
      nome: consultor.nome ?? "",
      email: consultor.email ?? "",
      telefone: consultor.telefone ?? "",
      preco_por_min: Number(consultor.preco_por_min ?? 0),
      preco_chat: Number(consultor.preco_chat ?? 0),
      preco_voz: Number(consultor.preco_voz ?? 0),
      percentagem_ganho: Number(consultor.percentagem_ganho ?? 0),
      foto_url: consultor.foto_url ?? null,
      especialidades: consultor.especialidades ?? null,
      apresentacao: consultor.apresentacao ?? null,
      ativo: Number(consultor.ativo ?? 0),
      destaque: Number(consultor.destaque ?? 0),
      online: Number(consultor.online ?? 0),
      ocupado: Number(consultor.ocupado ?? 0),

      pack_1_qtd: Number(consultor.pack_1_qtd ?? 1),
      pack_1_preco: Number(consultor.pack_1_preco ?? 1),
      pack_2_qtd: Number(consultor.pack_2_qtd ?? 3),
      pack_2_preco: Number(consultor.pack_2_preco ?? 3),
      pack_3_qtd: Number(consultor.pack_3_qtd ?? 5),
      pack_3_preco: Number(consultor.pack_3_preco ?? 5),
      pack_4_qtd: Number(consultor.pack_4_qtd ?? 10),
      pack_4_preco: Number(consultor.pack_4_preco ?? 10),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erro ao carregar consultor", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}