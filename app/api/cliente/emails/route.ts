export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    const pedidos = db
      .prepare(
        `
        SELECT
          p.id,
          p.pacote,
          p.preco_eur,
          p.status,
          p.created_at,
          p.respondido_at,
          c.nome AS consultor_nome
        FROM pergunta_pedidos p
        LEFT JOIN consultores c ON c.id = p.consultor_id
        WHERE p.cliente_id = ?
        ORDER BY p.created_at DESC
        `
      )
      .all(user.id) as any[];

    const pedidosComItens = pedidos.map((pedido) => {
      const itens = db
        .prepare(
          `
          SELECT
            id,
            pergunta,
            resposta,
            created_at,
            responded_at
          FROM pergunta_itens
          WHERE pedido_id = ?
          ORDER BY created_at ASC
          `
        )
        .all(pedido.id) as any[];

      return {
        id: String(pedido.id),
        consultor_nome: String(pedido.consultor_nome ?? ""),
        pacote: Number(pedido.pacote ?? 0),
        preco_eur: Number(pedido.preco_eur ?? 0),
        status: String(pedido.status ?? ""),
        created_at: Number(pedido.created_at ?? 0),
        respondido_at: Number(pedido.respondido_at ?? 0),
        itens: itens.map((it) => ({
          id: Number(it.id),
          pergunta: String(it.pergunta ?? ""),
          resposta: String(it.resposta ?? ""),
          created_at: Number(it.created_at ?? 0),
          responded_at: Number(it.responded_at ?? 0),
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      pedidos: pedidosComItens,
    });
  } catch (e: any) {
    console.error("ERRO /api/cliente/emails:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}