export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (String(user.role) !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Só clientes podem comprar perguntas." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
   const pedidoId = String(body?.pedidoId ?? body?.pedido_id ?? "").trim();

    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: "Pedido inválido." },
        { status: 400 }
      );
    }

    const pedido = db
      .prepare(
        `
        SELECT *
        FROM pergunta_pedidos
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(pedidoId) as any;

    if (!pedido) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (Number(pedido.cliente_id) !== Number(user.id)) {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    if (String(pedido.status) === "pago") {
      return NextResponse.json(
        { ok: false, error: "Este pedido já está pago." },
        { status: 400 }
      );
    }

    const amount = toNumber(pedido.preco_eur);

    if (amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço inválido." },
        { status: 400 }
      );
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!stripeSecret || !siteUrl) {
      return NextResponse.json(
        { ok: false, error: "Stripe não configurado." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecret);

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${siteUrl}/sucesso?pedidoId=${pedidoId}`,
      cancel_url: `${siteUrl}/cancelado?pedidoId=${pedidoId}`,

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Consulta por email (${pedido.pacote} perguntas)`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        kind: "pergunta_checkout",
        pedidoId: String(pedidoId),
        consultorId: String(pedido.consultor_id),
        clienteId: String(user.id),
        amount: String(amount),
      },
    });

    return NextResponse.json({
      ok: true,
      url: checkout.url,
    });
  } catch (e: any) {
    console.error("ERRO /api/perguntas/checkout:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao criar checkout." },
      { status: 500 }
    );
  }
}