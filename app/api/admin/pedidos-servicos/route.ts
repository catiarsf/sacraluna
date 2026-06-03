export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function hasColumn(table: string, column: string) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    return rows.some((r) => String(r.name) === column);
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const hasPedidos = db
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        AND name = 'pedidos_servicos'
        LIMIT 1
      `)
      .get();

    if (!hasPedidos) {
      return NextResponse.json({
        ok: true,
        pedidos: [],
      });
    }

    const hasServicos = db
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        AND name = 'servicos'
        LIMIT 1
      `)
      .get();

    const hasPaidAt = hasColumn(
      "pedidos_servicos",
      "paid_at"
    );

    const hasStripeSession = hasColumn(
      "pedidos_servicos",
      "stripe_session_id"
    );

    const paidAtSelect = hasPaidAt
      ? "ps.paid_at"
      : "NULL AS paid_at";

    const stripeSelect = hasStripeSession
      ? "ps.stripe_session_id"
      : "NULL AS stripe_session_id";

    const pedidos = db
      .prepare(`
        SELECT
          ps.id,
          ps.servico_id,
          ${
            hasServicos
              ? "COALESCE(s.nome, 'Serviço') AS servico_nome"
              : "'Serviço' AS servico_nome"
          },
          ps.nome_cliente,
          ps.email_cliente,
          ps.telefone_cliente,
          ps.notas,
          ps.preco_eur,
          ps.status,
          ${stripeSelect},
          ps.created_at,
          ${paidAtSelect}
        FROM pedidos_servicos ps
        ${
          hasServicos
            ? "LEFT JOIN servicos s ON s.id = ps.servico_id"
            : ""
        }
        ORDER BY ps.created_at DESC
      `)
      .all();

    return NextResponse.json({
      ok: true,
      pedidos,
    });
  } catch (e: any) {
    console.error(
      "ERRO /api/admin/pedidos-servicos:",
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          e?.message ||
          "Erro ao carregar pedidos de serviços.",
      },
      {
        status: 500,
      }
    );
  }
}