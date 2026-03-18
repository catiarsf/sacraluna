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
          ocupado
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