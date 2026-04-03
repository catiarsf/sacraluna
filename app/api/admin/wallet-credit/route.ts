import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = Number(body?.user_id);
    const amount = Number(body?.amount);

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Dados inválidos." },
        { status: 400 }
      );
    }

    // Ver se existe wallet
    const wallet = db
      .prepare("SELECT * FROM wallets WHERE user_id = ?")
      .get(userId);

    if (!wallet) {
      db.prepare(
        "INSERT INTO wallets (user_id, balance_eur, spent_eur) VALUES (?, 0, 0)"
      ).run(userId);
    }

    // Atualizar saldo
    db.prepare(
      "UPDATE wallets SET balance_eur = balance_eur + ? WHERE user_id = ?"
    ).run(amount, userId);

    // Guardar histórico
    db.prepare(`
      INSERT INTO wallet_transactions (user_id, amount_eur, type, description, created_at)
      VALUES (?, ?, 'credit', 'Crédito manual admin', strftime('%s','now'))
    `).run(userId, amount);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}