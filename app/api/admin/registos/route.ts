export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

async function getDb() {
  const mod = await import("@/lib/db");
  return mod.db ?? mod.default;
}

export async function GET() {
  try {
    const db = await getDb();

    const clientes = db
      .prepare(
        `
        SELECT
          u.id,
          u.nome,
          u.email,
          u.telefone,
          u.created_at,
          COALESCE(u.bloqueado, 0) AS bloqueado,
          COALESCE(w.balance_eur, 0) AS saldo,
          COALESCE(w.spent_eur, 0) AS gasto_total
        FROM users u
        LEFT JOIN wallets w
          ON w.user_type = 'cliente'
         AND w.user_id = u.id
        WHERE u.role = 'cliente'
        ORDER BY u.created_at DESC
        `
      )
      .all() as any[];

    const clientesComTransacoes = clientes.map((cliente) => {
      const transacoes = db
        .prepare(
          `
          SELECT
            wt.id,
            wt.type,
            wt.amount_eur,
            wt.description,
            wt.created_at
          FROM wallet_transactions wt
          JOIN wallets w ON w.id = wt.wallet_id
          WHERE w.user_type = 'cliente'
            AND w.user_id = ?
          ORDER BY wt.created_at DESC
          LIMIT 8
          `
        )
        .all(cliente.id) as any[];

      return {
        id: Number(cliente.id),
        nome: cliente.nome ? String(cliente.nome) : "",
        email: String(cliente.email ?? ""),
        telefone: cliente.telefone ? String(cliente.telefone) : "",
        created_at: Number(cliente.created_at ?? 0),
        bloqueado: Number(cliente.bloqueado ?? 0),
        saldo: Number(cliente.saldo ?? 0),
        gasto_total: Number(cliente.gasto_total ?? 0),
        transacoes: transacoes.map((t) => ({
          id: Number(t.id),
          type: String(t.type ?? ""),
          amount_eur: Number(t.amount_eur ?? 0),
          description: String(t.description ?? ""),
          created_at: Number(t.created_at ?? 0),
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      clientes: clientesComTransacoes,
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