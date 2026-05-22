import { NextResponse } from "next/server";
import db, { getOrCreateWallet } from "@/lib/db";

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round4(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.sessionId ?? "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId em falta." },
        { status: 400 }
      );
    }

    const session = db
      .prepare(`SELECT * FROM chat_sessions WHERE id = ?`)
      .get(sessionId) as any;

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (String(session.status) !== "active") {
      return NextResponse.json(
        { ok: false, error: "Sessão não está ativa.", code: "SESSION_NOT_ACTIVE" },
        { status: 400 }
      );
    }

    if (!session.cliente_id || !session.consultor_id) {
      return NextResponse.json(
        { ok: false, error: "Sessão incompleta." },
        { status: 400 }
      );
    }

    const consultor = db
      .prepare(`SELECT percentagem_ganho FROM consultores WHERE id = ?`)
      .get(session.consultor_id) as any;

    const percentagem = round2(Number(consultor?.percentagem_ganho ?? 40));
    const pricePerMin = Number(session.price_per_min || 0);
    const pricePerSecond = round4(pricePerMin / 60);

    if (pricePerMin <= 0 || pricePerSecond <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço inválido." },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const startedAt = Number(session.started_at || now);
    const alreadyBilledSeconds = Number(session.billed_seconds || 0);

    const elapsedSeconds = Math.max(0, now - startedAt);
    const secondsToBill = Math.max(0, elapsedSeconds - alreadyBilledSeconds);

    if (secondsToBill <= 0) {
      const clienteWallet = getOrCreateWallet("cliente", Number(session.cliente_id));
      const balance = round4(Number(clienteWallet.balance_eur || 0));

      return NextResponse.json({
        ok: true,
        charged: 0,
        charged_seconds: 0,
        wallet_balance: balance,
        billed_seconds: alreadyBilledSeconds,
        total_charged_eur: round4(Number(session.total_charged_eur || 0)),
        consultor_earned_eur: round4(Number(session.consultor_earned_eur || 0)),
        remaining_seconds: Math.floor(balance / pricePerSecond),
      });
    }

    const amountToCharge = round4(secondsToBill * pricePerSecond);

    const clienteWallet = getOrCreateWallet("cliente", Number(session.cliente_id));
    const currentClientBalance = round4(Number(clienteWallet.balance_eur || 0));

    if (currentClientBalance <= 0 || currentClientBalance < amountToCharge) {
      db.prepare(
        `
        UPDATE chat_sessions
        SET status = 'ended',
            ended_at = COALESCE(ended_at, ?)
        WHERE id = ?
        `
      ).run(now, sessionId);

      return NextResponse.json(
        {
          ok: false,
          error: "Saldo insuficiente.",
          code: "INSUFFICIENT_BALANCE",
          needed_eur: amountToCharge,
          balance_eur: currentClientBalance,
          session_ended: true,
        },
        { status: 402 }
      );
    }

    const result = db.transaction(() => {
      const freshClientWallet = getOrCreateWallet("cliente", Number(session.cliente_id));
      const freshConsultorWallet = getOrCreateWallet("consultor", Number(session.consultor_id));

      const clientBalanceNow = round4(Number(freshClientWallet.balance_eur || 0));

      if (clientBalanceNow < amountToCharge) {
        throw new Error("Saldo insuficiente.");
      }

      const newClientBalance = round4(clientBalanceNow - amountToCharge);
      const newClientSpent = round4(Number(freshClientWallet.spent_eur || 0) + amountToCharge);

      db.prepare(
        `
        UPDATE wallets
        SET balance_eur = ?,
            spent_eur = ?,
            updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(newClientBalance, newClientSpent, freshClientWallet.id);

      db.prepare(
        `
        INSERT INTO wallet_transactions (
          wallet_id, session_id, type, amount_eur, description
        )
        VALUES (?, ?, 'debit', ?, ?)
        `
      ).run(
        freshClientWallet.id,
        sessionId,
        round4(-amountToCharge),
        `Cobrança chat ${secondsToBill}s sessão ${sessionId}`
      );

      const consultorShare = round4(amountToCharge * (percentagem / 100));

      const consultorBalanceNow = round4(Number(freshConsultorWallet.balance_eur || 0));
      const consultorEarnedNow = round4(Number(freshConsultorWallet.earned_eur || 0));

      db.prepare(
        `
        UPDATE wallets
        SET balance_eur = ?,
            earned_eur = ?,
            updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(
        round4(consultorBalanceNow + consultorShare),
        round4(consultorEarnedNow + consultorShare),
        freshConsultorWallet.id
      );

      db.prepare(
        `
        INSERT INTO wallet_transactions (
          wallet_id, session_id, type, amount_eur, description
        )
        VALUES (?, ?, 'consultor_earned', ?, ?)
        `
      ).run(
        freshConsultorWallet.id,
        sessionId,
        consultorShare,
        `Ganho consultor chat ${secondsToBill}s sessão ${sessionId}`
      );

      const newBilledSeconds = alreadyBilledSeconds + secondsToBill;
      const newTotalCharged = round4(Number(session.total_charged_eur || 0) + amountToCharge);
      const newConsultorEarnedSession = round4(
        Number(session.consultor_earned_eur || 0) + consultorShare
      );

      db.prepare(
        `
        UPDATE chat_sessions
        SET billed_seconds = ?,
            total_charged_eur = ?,
            consultor_earned_eur = ?,
            started_at = COALESCE(started_at, ?)
        WHERE id = ?
        `
      ).run(
        newBilledSeconds,
        newTotalCharged,
        newConsultorEarnedSession,
        startedAt,
        sessionId
      );

      return {
        charged: amountToCharge,
        charged_seconds: secondsToBill,
        wallet_balance: newClientBalance,
        billed_seconds: newBilledSeconds,
        total_charged_eur: newTotalCharged,
        consultor_earned_eur: newConsultorEarnedSession,
        remaining_seconds: Math.floor(newClientBalance / pricePerSecond),
      };
    })();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (e: any) {
    console.error("ERRO BILL CHAT:", e);

    if (String(e?.message || "").includes("Saldo insuficiente")) {
      return NextResponse.json(
        { ok: false, error: "Saldo insuficiente.", code: "INSUFFICIENT_BALANCE" },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao faturar chat." },
      { status: 500 }
    );
  }
}