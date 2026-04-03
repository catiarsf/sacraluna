import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const userId = Number(body?.user_id);
    const amount = Number(String(body?.amount ?? "0").replace(",", "."));

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Dados inválidos." },
        { status: 400 }
      );
    }

    const tx = db.transaction(() => {
      let wallet = db
        .prepare(
          `
          SELECT *
          FROM wallets
          WHERE user_type = 'cliente' AND user_id = ?
          `
        )
        .get(userId) as any;

      if (!wallet) {
        db.prepare(
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
          VALUES ('cliente', ?, 0, 0, 0, strftime('%s','now'), strftime('%s','now'))
          `
        ).run(userId);

        wallet = db
          .prepare(
            `
            SELECT *
            FROM wallets
            WHERE user_type = 'cliente' AND user_id = ?
            `
          )
          .get(userId) as any;
      }

      const novoSaldo = round2(Number(wallet.balance_eur || 0) + amount);

      db.prepare(
        `
        UPDATE wallets
        SET balance_eur = ?, updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(novoSaldo, wallet.id);

      db.prepare(
        `
        INSERT INTO wallet_transactions (
          wallet_id,
          session_id,
          type,
          amount_eur,
          description,
          created_at
        )
        VALUES (?, NULL, 'credit', ?, ?, strftime('%s','now'))
        `
      ).run(
        wallet.id,
        round2(amount),
        "Crédito manual admin"
      );

      return novoSaldo;
    });

    const saldo = tx();

    return NextResponse.json({
      ok: true,
      saldo,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}