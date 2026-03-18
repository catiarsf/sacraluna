import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const pedidos = db
      .prepare(
        `
        SELECT
          ps.id,
          ps.servico_id,
          COALESCE(s.nome, 'Serviço') AS servico_nome,
          ps.nome_cliente,
          ps.email_cliente,
          ps.telefone_cliente,
          ps.notas,
          ps.preco_eur,
          ps.status,
          ps.stripe_session_id,
          ps.created_at,
          ps.paid_at
        FROM pedidos_servicos ps
        LEFT JOIN servicos s ON s.id = ps.servico_id
        ORDER BY ps.created_at DESC
        `
      )
      .all();

    return NextResponse.json({
      ok: true,
      pedidos,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao carregar pedidos de serviços.",
      },
      { status: 500 }
    );
  }
}