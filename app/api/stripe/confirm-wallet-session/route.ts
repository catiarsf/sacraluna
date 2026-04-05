export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import db, { creditWallet } from "@/lib/db";
import { getSession } from "@/lib/auth";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY no .env.local");
  }

  return new Stripe(secretKey);
}

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function alreadyCredited(sessionId: string) {
  const row = db
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

  return !!row;
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
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

    // Se o webhook já creditou, devolve logo sucesso sem complicar
    if (alreadyCredited(sessionId)) {
      return NextResponse.json({
        ok: true,
        already_confirmed: true,
        sessionId,
      });
    }

    let checkoutSession: Stripe.Checkout.Session | null = null;

    // Tenta durante alguns segundos para evitar o falso "pending"
    for (let i = 0; i < 5; i++) {
      checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

      if (checkoutSession?.payment_status === "paid") {
        break;
      }

      // Entretanto o webhook pode ter creditado
      if (alreadyCredited(sessionId)) {
        return NextResponse.json({
          ok: true,
          already_confirmed: true,
          sessionId,
        });
      }

      await sleep(1500);
    }

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

    if (Number(sessionAuth.user.id) !== userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Esta sessão Stripe não pertence ao utilizador autenticado.",
        },
        { status: 403 }
      );
    }

    if (checkoutSession.payment_status !== "paid") {
      // Última verificação: talvez o webhook tenha creditado enquanto esperávamos
      if (alreadyCredited(sessionId)) {
        return NextResponse.json({
          ok: true,
          already_confirmed: true,
          sessionId,
        });
      }

      return NextResponse.json({
        ok: true,
        pending: true,
        payment_status: checkoutSession.payment_status,
        sessionId,
      });
    }

    ensureWallet(userType, userId);

    if (alreadyCredited(sessionId)) {
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