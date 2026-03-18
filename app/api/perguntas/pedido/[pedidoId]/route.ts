import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pedidoId: string }> }
) {
  try {
    const { pedidoId } = await params;

    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: "ID do pedido em falta." },
        { status: 400 }
      );
    }

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
      .get(pedidoId) as any;

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
    console.error("ERRO API PEDIDO:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}