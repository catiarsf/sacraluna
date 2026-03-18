import { NextResponse } from "next/server";
import db from "@/lib/db";

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = String(url.searchParams.get("sessionId") ?? "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId em falta." },
        { status: 400 }
      );
    }

    const form = await req.formData();

    const callStatus = String(form.get("CallStatus") ?? "").trim().toLowerCase();
    const dialCallStatus = String(form.get("DialCallStatus") ?? "").trim().toLowerCase();
    const callDuration = toNumber(form.get("CallDuration"));
    const dialCallDuration = toNumber(form.get("DialCallDuration"));
    const callbackSource = String(form.get("CallbackSource") ?? "").trim();

    const sessao = db
      .prepare(
        `
        SELECT
          id,
          cliente_id,
          consultor_id,
          status,
          price_per_min,
          total_charged_eur,
          consultor_earned_eur
        FROM chat_sessions
        WHERE id = ?
        `
      )
      .get(sessionId) as any;

    if (!sessao) {
      return NextResponse.json(
        { ok: false, error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (callbackSource === "call-progress-events") {
      if (callStatus === "ringing") {
        db.prepare(
          `
          UPDATE chat_sessions
          SET status = 'ringing'
          WHERE id = ?
          `
        ).run(sessionId);
      }

      if (callStatus === "in-progress") {
        db.prepare(
          `
          UPDATE chat_sessions
          SET status = 'in_progress',
              started_at = COALESCE(started_at, strftime('%s','now'))
          WHERE id = ?
          `
        ).run(sessionId);
      }

      return NextResponse.json({ ok: true });
    }

    // evento final do child call / do dial
    const duracaoSegundos = Math.max(callDuration, dialCallDuration, 0);
    const precoPorMin = Number(sessao.price_per_min ?? 0);

    const totalCobrado = round2((duracaoSegundos / 60) * precoPorMin);
    const ganhoConsultor = round2(totalCobrado * 0.4); // 40%
    const jaCobrado = Number(sessao.total_charged_eur ?? 0) > 0;

    const tx = db.transaction(() => {
      if (!jaCobrado && duracaoSegundos > 0 && totalCobrado > 0) {
        const walletCliente = db
          .prepare(
            `
            SELECT id, balance_eur, spent_eur
            FROM wallets
            WHERE user_type = 'cliente' AND user_id = ?
            `
          )
          .get(sessao.cliente_id) as any;

        if (!walletCliente) {
          throw new Error("Wallet do cliente não encontrada.");
        }

        const saldoAtual = Number(walletCliente.balance_eur ?? 0);
        const valorCobrado = Math.min(saldoAtual, totalCobrado);
        const novoSaldo = round2(saldoAtual - valorCobrado);
        const novoSpent = round2(Number(walletCliente.spent_eur ?? 0) + valorCobrado);

        db.prepare(
          `
          UPDATE wallets
          SET
            balance_eur = ?,
            spent_eur = ?,
            updated_at = strftime('%s','now')
          WHERE id = ?
          `
        ).run(novoSaldo, novoSpent, walletCliente.id);

        db.prepare(
          `
          INSERT INTO wallet_transactions (
            wallet_id,
            session_id,
            type,
            amount_eur,
            description
          )
          VALUES (?, ?, 'debit', ?, ?)
          `
        ).run(
          walletCliente.id,
          sessionId,
          round2(-valorCobrado),
          `Consulta voz (${duracaoSegundos}s)`
        );

        let walletConsultor = db
          .prepare(
            `
            SELECT id, balance_eur, earned_eur
            FROM wallets
            WHERE user_type = 'consultor' AND user_id = ?
            `
          )
          .get(sessao.consultor_id) as any;

        if (!walletConsultor) {
          const info = db
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
              VALUES ('consultor', ?, 0, 0, 0, strftime('%s','now'), strftime('%s','now'))
              `
            )
            .run(sessao.consultor_id);

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

        const ganhoRealConsultor = round2(valorCobrado * 0.4);
        const saldoConsultor = round2(Number(walletConsultor.balance_eur ?? 0) + ganhoRealConsultor);
        const earnedConsultor = round2(Number(walletConsultor.earned_eur ?? 0) + ganhoRealConsultor);

        db.prepare(
          `
          UPDATE wallets
          SET
            balance_eur = ?,
            earned_eur = ?,
            updated_at = strftime('%s','now')
          WHERE id = ?
          `
        ).run(saldoConsultor, earnedConsultor, walletConsultor.id);

        db.prepare(
          `
          INSERT INTO wallet_transactions (
            wallet_id,
            session_id,
            type,
            amount_eur,
            description
          )
          VALUES (?, ?, 'credit', ?, ?)
          `
        ).run(
          walletConsultor.id,
          sessionId,
          ganhoRealConsultor,
          `Ganho consulta voz (${duracaoSegundos}s)`
        );

        db.prepare(
          `
          UPDATE chat_sessions
          SET
            billed_seconds = ?,
            total_charged_eur = ?,
            consultor_earned_eur = ?,
            started_at = COALESCE(started_at, strftime('%s','now')),
            ended_at = strftime('%s','now'),
            status = ?
          WHERE id = ?
          `
        ).run(
          duracaoSegundos,
          valorCobrado,
          ganhoRealConsultor,
          dialCallStatus || callStatus || "completed",
          sessionId
        );
      } else {
        db.prepare(
          `
          UPDATE chat_sessions
          SET
            ended_at = strftime('%s','now'),
            status = ?
          WHERE id = ?
          `
        ).run(dialCallStatus || callStatus || "completed", sessionId);
      }

      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 0, last_seen_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(sessao.consultor_id);
    });

    tx();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("ERRO /api/twilio/status:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no status callback." },
      { status: 500 }
    );
  }
}