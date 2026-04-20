export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    pedidoId: string;
  }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { pedidoId } = await context.params;

    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: "ID do pedido em falta." },
        { status: 400 }
      );
    }

    const { db } = await import("@/lib/db");

    const pedido = db
      .prepare(
        `
        SELECT
          id,
          cliente_id,
          consultor_id,
          pacote,
          preco_eur,
          status,
          stripe_payment_id,
          created_at,
          respondido_at
        FROM pergunta_pedidos
        WHERE id = ?
        `
      )
      .get(pedidoId);

    if (!pedido) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      pedido,
    });
  } catch (e: any) {
    console.error("ERRO /api/perguntas/[pedidoId]:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}