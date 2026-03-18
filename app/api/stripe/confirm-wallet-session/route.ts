import { NextResponse } from "next/server";
import Stripe from "stripe";
import db, { creditWallet } from "@/lib/db";
import { getSession } from "@/lib/auth";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("Falta STRIPE_SECRET_KEY no .env.local");
}

const stripe = new Stripe(secretKey);

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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

export async function POST(req: Request) {
  try {
    const sessionAuth = await getSession();

    if (!sessionAuth?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = norm(body?.sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId em falta." },
        { status: 400 }
      );
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (!checkoutSession) {
      return NextResponse.json(
        { ok: false, error: "Sessão Stripe não encontrada." },
        { status: 404 }
      );
    }

    const kind = norm(checkoutSession.metadata?.kind);
    const userType = norm(checkoutSession.metadata?.userType);
    const userId = toNumber(checkoutSession.metadata?.userId);
    const amount = toNumber(checkoutSession.metadata?.amount);

    if (kind !== "wallet_topup") {
      return NextResponse.json(
        { ok: false, error: "Esta sessão não é de wallet_topup." },
        { status: 400 }
      );
    }

    if (!["cliente", "consultor"].includes(userType)) {
      return NextResponse.json(
        { ok: false, error: "userType inválido na metadata." },
        { status: 400 }
      );
    }

    if (!userId || userId <= 0) {
      return NextResponse.json(
        { ok: false, error: "userId inválido na metadata." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "amount inválido na metadata." },
        { status: 400 }
      );
    }

    // Garante que o cliente autenticado só confirma a própria sessão
    if (Number(sessionAuth.user.id) !== userId) {
      return NextResponse.json(
        { ok: false, error: "Esta sessão Stripe não pertence ao utilizador autenticado." },
        { status: 403 }
      );
    }

    // Se ainda não estiver pago, não rebenta; devolve estado pendente
    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({
        ok: true,
        pending: true,
        payment_status: checkoutSession.payment_status,
        sessionId,
      });
    }

    // Garante a wallet antes de creditar
    ensureWallet(userType, userId);

    const alreadyCredited = db
      .prepare(
        `
        SELECT wt.id
        FROM wallet_transactions wt
        WHERE wt.session_id = ?
          AND wt.type = 'credit'
        LIMIT 1
        `
      )
      .get(sessionId) as { id: number } | undefined;

    if (alreadyCredited) {
      return NextResponse.json({
        ok: true,
        already_confirmed: true,
        sessionId,
      });
    }

    creditWallet({
      userType,
      userId,
      amount,
      description: `Carregamento Stripe confirmado (${checkoutSession.id})`,
      sessionId: checkoutSession.id,
    });

    return NextResponse.json({
      ok: true,
      credited: true,
      sessionId,
    });
  } catch (e: any) {
    console.error("ERRO CONFIRM WALLET SESSION:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao confirmar sessão Stripe.",
      },
      { status: 500 }
    );
  }
}