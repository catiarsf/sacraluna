import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          id,
          nome,
          email,
          telefone,
          foto_url,
          especialidades,
          apresentacao,
          preco_por_min,
          preco_chat,
          preco_voz,
          percentagem_ganho,
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
        ORDER BY
          CASE
            WHEN online = 1 AND ocupado = 0 THEN 0
            WHEN online = 1 AND ocupado = 1 THEN 1
            ELSE 2
          END ASC,
          destaque DESC,
          nome COLLATE NOCASE ASC
        `
      )
      .all();

    const consultores = rows.map((r: any) => ({
      id: Number(r.id),
      nome: r.nome ?? "",
      email: r.email ?? "",
      telefone: r.telefone ?? "",
      foto_url: r.foto_url ?? null,
      especialidades: r.especialidades ?? null,
      apresentacao: r.apresentacao ?? null,
      apresentacao_curta: null,
      apresentacao_longa: null,
      preco_por_min: Number(r.preco_por_min ?? 0),
      preco_chat: Number(r.preco_chat ?? 0),
      preco_voz: Number(r.preco_voz ?? 0),
      percentagem_ganho: Number(r.percentagem_ganho ?? 0),
      valor_min_eur: Number(r.preco_por_min ?? 0),
      ativo: Number(r.ativo ?? 0),
      destaque: Number(r.destaque ?? 0),
      online: Number(r.online ?? 0),
      ocupado: Number(r.ocupado ?? 0),

      pack_1_qtd: Number(r.pack_1_qtd ?? 1),
      pack_1_preco: Number(r.pack_1_preco ?? 1),
      pack_2_qtd: Number(r.pack_2_qtd ?? 3),
      pack_2_preco: Number(r.pack_2_preco ?? 3),
      pack_3_qtd: Number(r.pack_3_qtd ?? 5),
      pack_3_preco: Number(r.pack_3_preco ?? 5),
      pack_4_qtd: Number(r.pack_4_qtd ?? 10),
      pack_4_preco: Number(r.pack_4_preco ?? 10),
    }));

    return NextResponse.json({ ok: true, consultores });
  } catch (e: any) {
    console.error("ERRO /api/consultores:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor" },
      { status: 500 }
    );
  }
}