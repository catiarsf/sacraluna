export const dynamic = "force-dynamic";

import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import db, { creditWallet } from "@/lib/db";

function getStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY no .env.local");
  }

  if (!webhookSecret) {
    throw new Error("Falta STRIPE_WEBHOOK_SECRET no .env.local");
  }

  return {
    stripe: new Stripe(secretKey),
    webhookSecret,
  };
}

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function ensureWallet(userType: string, userId: number) {
  const existing = db
    .prepare(
      `
      SELECT id
      FROM wallets
      WHERE user_type = ? AND user_id = ?
      `
    )
    .get(userType, userId) as { id: number } | undefined;

  if (existing) return existing.id;

  const created = db
    .prepare(
      `
      INSERT INTO wallets (
        user_type,
        user_id,
        balance_eur,
        earned_eur,
        spent_eur,
        created_at,
        updated_at
      )
      VALUES (?, ?, 0, 0, 0, strftime('%s','now'), strftime('%s','now'))
      `
    )
    .run(userType, userId);

  return Number(created.lastInsertRowid);
}

function applyWalletRefund(params: {
  userType: string;
  userId: number;
  amount: number;
  refundId: string;
  paymentIntentId?: string | null;
}) {
  const { userType, userId, amount, refundId, paymentIntentId } = params;

  if (!amount || amount <= 0) {
    throw new Error("Valor de reembolso inválido.");
  }

  const walletId = ensureWallet(userType, userId);

  const existingRefundTx = db
    .prepare(
      `
      SELECT id
      FROM wallet_transactions
      WHERE session_id = ?
        AND type = 'refund'
      LIMIT 1
      `
    )
    .get(refundId) as { id: number } | undefined;

  if (existingRefundTx) {
    return {
      handled: true,
      duplicate: true,
      refundId,
    };
  }

  const wallet = db
    .prepare(
      `
      SELECT id, balance_eur
      FROM wallets
      WHERE id = ?
      `
    )
    .get(walletId) as { id: number; balance_eur: number };

  const currentBalance = round2(Number(wallet?.balance_eur ?? 0));
  const newBalance = round2(currentBalance - amount);

  db.prepare(
    `
    UPDATE wallets
    SET
      balance_eur = ?,
      updated_at = strftime('%s','now')
    WHERE id = ?
    `
  ).run(newBalance, walletId);

  db.prepare(
    `
    INSERT INTO wallet_transactions (
      wallet_id,
      session_id,
      type,
      amount_eur,
      description
    )
    VALUES (?, ?, 'refund', ?, ?)
    `
  ).run(
    walletId,
    refundId,
    round2(-amount),
    paymentIntentId
      ? `Reembolso Stripe (${refundId}) / PaymentIntent ${paymentIntentId}`
      : `Reembolso Stripe (${refundId})`
  );

  return {
    handled: true,
    duplicate: false,
    refundId,
    newBalance,
  };
}

function processWalletTopup(session: Stripe.Checkout.Session) {
  const kind = norm(session.metadata?.kind);

  if (kind !== "wallet_topup") {
    return { handled: false, reason: "kind não é wallet_topup" };
  }

  if (norm(session.payment_status) !== "paid") {
    return {
      handled: false,
      reason: `payment_status=${norm(session.payment_status)}`,
    };
  }

  const userType = norm(session.metadata?.userType);
  const userId = toNumber(session.metadata?.userId);
  const amount = toNumber(session.metadata?.amount);

  if (!["cliente", "consultor"].includes(userType)) {
    throw new Error("userType inválido no metadata do Stripe.");
  }

  if (!userId || userId <= 0) {
    throw new Error("userId inválido no metadata do Stripe.");
  }

  if (!amount || amount <= 0) {
    throw new Error("amount inválido no metadata do Stripe.");
  }

  ensureWallet(userType, userId);

  const existingTx = db
    .prepare(
      `
      SELECT id
      FROM wallet_transactions
      WHERE session_id = ? AND type = 'credit'
      LIMIT 1
      `
    )
    .get(session.id ?? "") as { id: number } | undefined;

  if (existingTx) {
    return {
      handled: true,
      duplicate: true,
      reason: `wallet topup já creditado para session ${session.id}`,
    };
  }

  creditWallet({
    userType,
    userId,
    amount,
    description: `Carregamento Stripe (${session.id})`,
    sessionId: session.id ?? null,
  });

  return {
    handled: true,
    duplicate: false,
    userType,
    userId,
    amount,
  };
}

async function processRefund(stripe: Stripe, refund: Stripe.Refund) {
  const refundId = norm(refund.id);
  const refundAmount = round2(Number(refund.amount ?? 0) / 100);
  const paymentIntentId =
    typeof refund.payment_intent === "string" ? refund.payment_intent : "";

  if (!refundId) {
    throw new Error("Refund sem ID.");
  }

  if (!paymentIntentId) {
    return {
      handled: false,
      reason: "Refund sem payment_intent.",
    };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const kind = norm(paymentIntent.metadata?.kind);
  const userType = norm(paymentIntent.metadata?.userType);
  const userId = toNumber(paymentIntent.metadata?.userId);

  if (kind !== "wallet_topup") {
    return {
      handled: false,
      reason: "Refund não pertence a wallet_topup.",
    };
  }

  if (!["cliente", "consultor"].includes(userType)) {
    throw new Error("userType inválido no payment_intent metadata.");
  }

  if (!userId || userId <= 0) {
    throw new Error("userId inválido no payment_intent metadata.");
  }

  if (!refundAmount || refundAmount <= 0) {
    throw new Error("Valor de refund inválido.");
  }

  return applyWalletRefund({
    userType,
    userId,
    amount: refundAmount,
    refundId,
    paymentIntentId,
  });
}

export async function POST(req: Request) {
  try {
    const { stripe, webhookSecret } = getStripeConfig();

    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("WEBHOOK: Stripe-Signature em falta");
      return new NextResponse("Stripe-Signature em falta", { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("WEBHOOK RECEBIDO:", event.type, "ID:", event.id);
    } catch (err: any) {
      console.error("ERRO A VALIDAR WEBHOOK:", err?.message || err);
      return new NextResponse(`Webhook error: ${err.message}`, { status: 400 });
    }

    if (!event.id) {
      throw new Error("Evento Stripe sem ID.");
    }

    const alreadyProcessed = db
      .prepare("SELECT id FROM stripe_events WHERE id = ?")
      .get(String(event.id));

    if (alreadyProcessed) {
      console.log("WEBHOOK DUPLICADO IGNORADO:", event.id);
      return NextResponse.json({
        ok: true,
        duplicate: true,
        type: event.type,
      });
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("SESSION ID:", session.id);
      console.log("PAYMENT STATUS:", session.payment_status);
      console.log("METADATA RECEBIDA:", session.metadata);

      const walletResult = processWalletTopup(session);

      if (walletResult.handled) {
        console.log("RESULTADO WALLET:", walletResult);
      } else {
        console.log("EVENTO RECEBIDO MAS IGNORADO:", {
          eventType: event.type,
          reason: walletResult.reason,
        });
      }
    } else if (event.type === "refund.created") {
      const refund = event.data.object as Stripe.Refund;

      console.log("REFUND ID:", refund.id);
      console.log("REFUND PAYMENT INTENT:", refund.payment_intent);
      console.log("REFUND AMOUNT:", refund.amount);

      const refundResult = await processRefund(stripe, refund);

      if (refundResult.handled) {
        console.log("RESULTADO REFUND:", refundResult);
      } else {
        console.log(
          "REFUND IGNORADO:",
          "reason" in refundResult ? refundResult.reason : "Sem motivo definido"
        );
      }
    } else if (event.type === "checkout.session.async_payment_failed") {
      console.log("PAGAMENTO ASSÍNCRONO FALHOU:", event.id);
    } else {
      console.log("EVENTO IGNORADO PELO WEBHOOK:", event.type);
    }

    db.prepare("INSERT INTO stripe_events (id) VALUES (?)").run(String(event.id));

    return NextResponse.json({
      ok: true,
      type: event.type,
    });
  } catch (err: any) {
    console.error("ERRO AO PROCESSAR WEBHOOK:", err?.message || err);
    return new NextResponse(`Erro interno no webhook: ${err.message}`, {
      status: 500,
    });
  }
}