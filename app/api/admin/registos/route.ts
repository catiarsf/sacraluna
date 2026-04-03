import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const clientes = db
      .prepare(
        `
        SELECT
          u.id,
          u.nome,
          u.email,
          u.telefone,
          u.created_at,
          COALESCE(w.balance_eur, 0) AS saldo
        FROM users u
        LEFT JOIN wallets w
          ON w.user_type = 'cliente'
         AND w.user_id = u.id
        WHERE u.role = 'cliente'
        ORDER BY u.created_at DESC
        `
      )
      .all();

    return NextResponse.json({
      ok: true,
      clientes,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao carregar clientes.",
      },
      { status: 500 }
    );
  }
}