export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "Rota desativada em produção." },
        { status: 403 }
      );
    }

    const userId = 3;

    const existe = db
      .prepare(
        `
        SELECT id
        FROM wallets
        WHERE user_type = 'cliente' AND user_id = ?
        `
      )
      .get(userId) as { id: number } | undefined;

    if (existe) {
      db.prepare(
        `
        UPDATE wallets
        SET
          balance_eur = 5,
          updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(existe.id);

      return NextResponse.json({
        ok: true,
        message: "Wallet do user_id 3 atualizada para 5€.",
      });
    }

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
      VALUES (
        'cliente',
        ?,
        5,
        0,
        0,
        strftime('%s','now'),
        strftime('%s','now')
      )
      `
    ).run(userId);

    return NextResponse.json({
      ok: true,
      message: "Wallet criada com 5€ para o user_id 3.",
    });
  } catch (e: any) {
    console.error("ERRO fix-wallet:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}