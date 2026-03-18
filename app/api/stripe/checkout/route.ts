import { NextResponse } from "next/server";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("Falta STRIPE_SECRET_KEY no .env.local");
}

const stripe = new Stripe(secretKey);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const pedido_id = String(body?.pedido_id ?? "").trim();
    const consultor_id = Number(body?.consultor_id ?? 0);
    const preco = Number(body?.preco ?? 0);

    if (!pedido_id) {
      return NextResponse.json(
        { ok: false, error: "pedido_id em falta." },
        { status: 400 }
      );
    }

    if (!consultor_id || consultor_id <= 0) {
      return NextResponse.json(
        { ok: false, error: "consultor_id inválido." },
        { status: 400 }
      );
    }

    if (!preco || preco <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço inválido." },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json(
        { ok: false, error: "Falta NEXT_PUBLIC_SITE_URL no .env.local" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Consulta por Email - SacraLuna",
            },
            unit_amount: Math.round(preco * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        pedido_id,
        consultor_id: String(consultor_id),
      },
     success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/perguntas/pedido/${pedido_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/email/${consultor_id}`,
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
    });
  } catch (e: any) {
    console.error("ERRO STRIPE CHECKOUT:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro no checkout Stripe",
      },
      { status: 500 }
    );
  }
}