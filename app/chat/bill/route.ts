import { NextResponse } from "next/server";
import db, { getOrCreateWallet } from "@/lib/db";

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
      .prepare(
        `
        SELECT *
        FROM chat_sessions
        WHERE id = ?
        `
      )
      .get(sessionId) as any;

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (!session.cliente_id) {
      return NextResponse.json(
        { ok: false, error: "Sessão sem cliente associado." },
        { status: 400 }
      );
    }

    if (!session.consultor_id) {
      return NextResponse.json(
        { ok: false, error: "Sessão sem consultor associado." },
        { status: 400 }
      );
    }

    if (session.status === "ended") {
      return NextResponse.json(
        { ok: false, error: "A sessão já terminou." },
        { status: 400 }
      );
    }

    const pricePerMin = Number(session.price_per_min || 0);

    if (pricePerMin <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço por minuto inválido." },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const startedAt = Number(session.started_at || now);
    const alreadyBilledSeconds = Number(session.billed_seconds || 0);
    const totalElapsedSeconds = Math.max(0, now - startedAt);
    const unbilledSeconds = totalElapsedSeconds - alreadyBilledSeconds;

    if (unbilledSeconds <= 0) {
      return NextResponse.json({
        ok: true,
        charged: 0,
        wallet_balance: null,
        billed_seconds: alreadyBilledSeconds,
        total_charged_eur: Number(session.total_charged_eur || 0),
        consultor_earned_eur: Number(session.consultor_earned_eur || 0),
        message: "Nada para faturar.",
      });
    }

    const amountToCharge = round2((unbilledSeconds / 60) * pricePerMin);

    if (amountToCharge <= 0) {
      return NextResponse.json({
        ok: true,
        charged: 0,
        wallet_balance: null,
        billed_seconds: alreadyBilledSeconds,
        total_charged_eur: Number(session.total_charged_eur || 0),
        consultor_earned_eur: Number(session.consultor_earned_eur || 0),
        message: "Valor calculado igual a zero.",
      });
    }

    const clienteWallet = getOrCreateWallet("cliente", Number(session.cliente_id));
    const currentClientBalance = round2(Number(clienteWallet.balance_eur || 0));

    if (currentClientBalance < amountToCharge) {
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

      const clientBalanceNow = round2(Number(freshClientWallet.balance_eur || 0));

      if (clientBalanceNow < amountToCharge) {
        throw new Error("Saldo insuficiente.");
      }

      const newClientBalance = round2(clientBalanceNow - amountToCharge);
      const newClientSpent = round2(Number(freshClientWallet.spent_eur || 0) + amountToCharge);

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
        ) VALUES (?, ?, 'debit', ?, ?)
        `
      ).run(
        freshClientWallet.id,
        sessionId,
        round2(-amountToCharge),
        `Cobrança chat sessão ${sessionId}`
      );

      const consultorShare = round2(amountToCharge * 0.4);
      const newConsultorEarnedWallet = round2(
        Number(freshConsultorWallet.earned_eur || 0) + consultorShare
      );

      db.prepare(
        `
        UPDATE wallets
        SET earned_eur = ?,
            updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(newConsultorEarnedWallet, freshConsultorWallet.id);

      db.prepare(
        `
        INSERT INTO wallet_transactions (
          wallet_id, session_id, type, amount_eur, description
        ) VALUES (?, ?, 'consultor_earned', ?, ?)
        `
      ).run(
        freshConsultorWallet.id,
        sessionId,
        consultorShare,
        `Ganho do consultor na sessão ${sessionId}`
      );

      const newBilledSeconds = alreadyBilledSeconds + unbilledSeconds;
      const newTotalCharged = round2(Number(session.total_charged_eur || 0) + amountToCharge);
      const newConsultorEarnedSession = round2(
        Number(session.consultor_earned_eur || 0) + consultorShare
      );

      db.prepare(
        `
        UPDATE chat_sessions
        SET billed_seconds = ?,
            total_charged_eur = ?,
            consultor_earned_eur = ?
        WHERE id = ?
        `
      ).run(
        newBilledSeconds,
        newTotalCharged,
        newConsultorEarnedSession,
        sessionId
      );

      return {
        charged: amountToCharge,
        wallet_balance: newClientBalance,
        billed_seconds: newBilledSeconds,
        total_charged_eur: newTotalCharged,
        consultor_earned_eur: newConsultorEarnedSession,
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
        { ok: false, error: "Saldo insuficiente." },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao faturar chat." },
      { status: 500 }
    );
  }
}