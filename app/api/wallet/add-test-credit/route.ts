import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const user = session.user;

    if (!user || user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const valor = Number(body?.valor);

    if (!valor || valor <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valor inválido." },
        { status: 400 }
      );
    }

    let wallet = db
      .prepare(
        `
        SELECT id, balance_eur
        FROM wallets
        WHERE user_type='cliente' AND user_id=?
        `
      )
      .get(user.id) as any;

    if (!wallet) {
      const info = db
        .prepare(
          `
          INSERT INTO wallets (user_type, user_id, balance_eur, earned_eur, spent_eur)
          VALUES ('cliente', ?, 0, 0, 0)
          `
        )
        .run(user.id);

      wallet = db
        .prepare(`SELECT id, balance_eur FROM wallets WHERE id=?`)
        .get(info.lastInsertRowid) as any;
    }

    db.prepare(
      `
      UPDATE wallets
      SET balance_eur = balance_eur + ?
      WHERE id = ?
      `
    ).run(valor, wallet.id);

    const novoSaldo = db
      .prepare(`SELECT balance_eur FROM wallets WHERE id=?`)
      .get(wallet.id) as any;

    return NextResponse.json({
      ok: true,
      saldo: novoSaldo.balance_eur,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { ok: false, error: "Erro interno." },
      { status: 500 }
    );
  }
}