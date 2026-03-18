export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!secretKey) {
  throw new Error("Falta STRIPE_SECRET_KEY no .env.local");
}

if (!siteUrl) {
  throw new Error("Falta NEXT_PUBLIC_SITE_URL no .env.local");
}

const stripe = new Stripe(secretKey);

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const userType = norm(body?.userType);
    const userId = toNumber(body?.userId);
    const amount = toNumber(body?.amount);

    if (!["cliente", "consultor"].includes(userType)) {
      return NextResponse.json(
        { ok: false, error: "userType inválido." },
        { status: 400 }
      );
    }

    if (!userId || userId <= 0) {
      return NextResponse.json(
        { ok: false, error: "userId inválido." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valor inválido." },
        { status: 400 }
      );
    }

    const returnPath = userType === "consultor" ? "/consultor" : "/cliente";

    const metadata = {
      kind: "wallet_topup",
      userType,
      userId: String(userId),
      amount: String(amount),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Carregamento de saldo - SacraLuna (${amount.toFixed(2)}€)`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
      },
      success_url:
        `${siteUrl}${returnPath}` +
        `?wallet=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${returnPath}?wallet=cancel`,
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (e: any) {
    console.error("ERRO STRIPE WALLET CHECKOUT:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao criar checkout wallet",
      },
      { status: 500 }
    );
  }
}