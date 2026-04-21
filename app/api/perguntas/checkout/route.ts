export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

function norm(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const sessionAuth = await getSession();
    const user = sessionAuth?.user;

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const pedidoId = norm(body?.pedidoId);

    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: "Pedido inválido." },
        { status: 400 }
      );
    }

    const pedido = db.prepare(`
      SELECT *
      FROM pergunta_pedidos
      WHERE id = ?
    `).get(pedidoId) as any;

    if (!pedido) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Consulta por Email (${pedido.pacote} perguntas)`,
            },
            unit_amount: Math.round(Number(pedido.preco_eur) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sucesso`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancelado`,

      // 🔥 CRÍTICO
      metadata: {
        kind: "pergunta_checkout",
        pedidoId: String(pedido.id),
        consultorId: String(pedido.consultor_id),
        clienteId: String(pedido.cliente_id),
        amount: String(pedido.preco_eur),
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
    });
  } catch (e: any) {
    console.error("ERRO checkout perguntas:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no checkout" },
      { status: 500 }
    );
  }
}