import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "Sem login." },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    const pedidos = db
      .prepare(
        `
        SELECT
          pp.id,
          pp.cliente_id,
          pp.consultor_id,
          pp.pacote,
          pp.preco_eur,
          pp.status,
          pp.created_at,
          pp.respondido_at,
          c.nome AS consultor_nome,
          u.nome AS cliente_nome,
          u.email AS cliente_email
        FROM pergunta_pedidos pp
        LEFT JOIN consultores c ON c.id = pp.consultor_id
        LEFT JOIN users u ON u.id = pp.cliente_id
        ORDER BY pp.created_at DESC
        LIMIT 200
        `
      )
      .all() as any[];

    const result = pedidos.map((p) => {
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
          ORDER BY id ASC
          `
        )
        .all(p.id) as any[];

      return {
        id: String(p.id),
        cliente_nome: String(p.cliente_nome ?? ""),
        cliente_email: String(p.cliente_email ?? ""),
        consultor_nome: String(p.consultor_nome ?? ""),
        pacote: Number(p.pacote ?? 0),
        preco_eur: Number(p.preco_eur ?? 0),
        status: String(p.status ?? ""),
        created_at: Number(p.created_at ?? 0),
        respondido_at: Number(p.respondido_at ?? 0),
        itens,
      };
    });

    return NextResponse.json({
      ok: true,
      pedidos: result,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar histórico de perguntas." },
      { status: 500 }
    );
  }
}