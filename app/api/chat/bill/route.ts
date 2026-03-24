import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function toNumber(v: any) {
  const n = Number.parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const authSession = await getSession();
    const user = authSession.user;

    if (!user || !user.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Só clientes podem ser cobrados aqui." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(
      body?.sessionId ?? body?.session_id ?? ""
    ).trim();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Sessão inválida." },
        { status: 400 }
      );
    }

    const chatSession = db
      .prepare(
        `
        SELECT
          id,
          cliente_id,
          consultor_id,
          status,
          price_per_min,
          billed_seconds,
          total_charged_eur,
          consultor_earned_eur
        FROM chat_sessions
        WHERE id = ?
        `
      )
      .get(sessionId) as any;

    if (!chatSession) {
      return NextResponse.json(
        { ok: false, error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (Number(chatSession.cliente_id) !== Number(user.id)) {
      return NextResponse.json(
        { ok: false, error: "Sessão não pertence a este cliente." },
        { status: 403 }
      );
    }

    if (String(chatSession.status) !== "active") {
      return NextResponse.json(
        {
          ok: false,
          error: "Sessão não está ativa.",
          code: "SESSION_NOT_ACTIVE",
        },
        { status: 400 }
      );
    }

    const precoPorMin = toNumber(chatSession.price_per_min);

    if (precoPorMin <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço por minuto inválido." },
        { status: 400 }
      );
    }

    let walletCliente = db
      .prepare(
        `
        SELECT id, balance_eur, spent_eur
        FROM wallets
        WHERE user_type = 'cliente' AND user_id = ?
        `
      )
      .get(user.id) as any;

    if (!walletCliente) {
      return NextResponse.json(
        { ok: false, error: "Wallet do cliente não encontrada." },
        { status: 404 }
      );
    }

    const saldoCliente = toNumber(walletCliente.balance_eur);

    if (saldoCliente < precoPorMin) {
      db.prepare(
        `
        UPDATE chat_sessions
        SET status = 'ended',
            ended_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(sessionId);

      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 0,
            last_seen_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(chatSession.consultor_id);

      return NextResponse.json(
        {
          ok: false,
          error: "Saldo insuficiente.",
          code: "INSUFFICIENT_BALANCE",
          wallet_balance: saldoCliente,
        },
        { status: 402 }
      );
    }

    const consultorInfo = db
      .prepare(
        `
        SELECT id, percentagem
        FROM consultores
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(chatSession.consultor_id) as any;

    if (!consultorInfo) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    const percentagemConsultor = toNumber(
      consultorInfo?.percentagem ?? 40
    );

    const ganhoConsultor = round2(
      precoPorMin * (percentagemConsultor / 100)
    );

    let walletConsultor = db
      .prepare(
        `
        SELECT id, balance_eur, earned_eur
        FROM wallets
        WHERE user_type = 'consultor' AND user_id = ?
        `
      )
      .get(chatSession.consultor_id) as any;
 
      if (!walletConsultor) {
      const info = db
        .prepare(
          `
          INSERT INTO wallets (user_type, user_id, balance_eur, earned_eur, spent_eur)
          VALUES ('consultor', ?, 0, 0, 0)
          `
        )
        .run(chatSession.consultor_id);

      walletConsultor = db
        .prepare(
          `
          SELECT id, balance_eur, earned_eur
          FROM wallets
          WHERE id = ?
          `
        )
        .get(info.lastInsertRowid) as any;
    }

    const tx = db.transaction(() => {
      db.prepare(
        `
        UPDATE wallets
        SET
          balance_eur = balance_eur - ?,
          spent_eur = spent_eur + ?,
          updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(precoPorMin, precoPorMin, walletCliente.id);

      db.prepare(
        `
        UPDATE wallets
        SET
          earned_eur = earned_eur + ?,
          updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(ganhoConsultor, walletConsultor.id);

      db.prepare(
        `
        UPDATE chat_sessions
        SET
          billed_seconds = billed_seconds + 60,
          total_charged_eur = total_charged_eur + ?,
          consultor_earned_eur = consultor_earned_eur + ?
        WHERE id = ?
        `
      ).run(precoPorMin, ganhoConsultor, sessionId);

      db.prepare(
        `
        INSERT INTO wallet_transactions (wallet_id, session_id, type, amount_eur, description)
        VALUES (?, ?, 'debit', ?, ?)
        `
      ).run(
        walletCliente.id,
        sessionId,
        -precoPorMin,
        "Cobrança de 1 minuto de consulta"
      );

      db.prepare(
        `
        INSERT INTO wallet_transactions (wallet_id, session_id, type, amount_eur, description)
        VALUES (?, ?, 'consultor_earned', ?, ?)
        `
      ).run(
        walletConsultor.id,
        sessionId,
        ganhoConsultor,
        `Ganho de 1 minuto de consulta (${percentagemConsultor}%)`
      );
    });

    tx();

    walletCliente = db
      .prepare(
        `
        SELECT id, balance_eur, spent_eur
        FROM wallets
        WHERE id = ?
        `
      )
      .get(walletCliente.id) as any;

    const sessaoAtualizada = db
      .prepare(
        `
        SELECT billed_seconds, total_charged_eur, consultor_earned_eur
        FROM chat_sessions
        WHERE id = ?
        `
      )
      .get(sessionId) as any;

    return NextResponse.json({
      ok: true,
      wallet_balance: toNumber(walletCliente.balance_eur),
      billed_seconds: Number(sessaoAtualizada?.billed_seconds ?? 0),
      total_charged_eur: toNumber(
        sessaoAtualizada?.total_charged_eur ?? 0
      ),
      consultor_earned_eur: toNumber(
        sessaoAtualizada?.consultor_earned_eur ?? 0
      ),
      percentagem_consultor: percentagemConsultor,
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/bill:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}     