export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function ensureWallet(userType: string, userId: number) {
  const existing = db
    .prepare(
      `
      SELECT id
      FROM wallets
      WHERE user_type = ? AND user_id = ?
      LIMIT 1
      `
    )
    .get(userType, userId) as any;

  if (existing?.id) return Number(existing.id);

  const created = db
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
      VALUES (?, ?, 0, 0, 0, strftime('%s','now'), strftime('%s','now'))
      `
    )
    .run(userType, userId);

  return Number(created.lastInsertRowid);
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const pedidoId = String(body?.pedido_id ?? "").trim();
    const action = String(body?.action ?? "").trim().toLowerCase();

    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: "Pedido inválido." },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { ok: false, error: "Ação inválida." },
        { status: 400 }
      );
    }

    const pedido = db
      .prepare(
        `
        SELECT *
        FROM pergunta_pedidos
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(pedidoId) as any;

    if (!pedido) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (Number(pedido.consultor_id) !== consultorId) {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    if (!pedido.stripe_payment_id) {
      return NextResponse.json(
        { ok: false, error: "Este pedido ainda não está pago." },
        { status: 400 }
      );
    }

    if (String(pedido.status ?? "") !== "aguarda_aceitacao") {
      return NextResponse.json(
        { ok: false, error: "Este pedido já não aguarda aceitação." },
        { status: 400 }
      );
    }

    if (action === "reject") {
      db.prepare(
        `
        UPDATE pergunta_pedidos
        SET status = 'rejeitado'
        WHERE id = ?
        `
      ).run(pedidoId);

      return NextResponse.json({
        ok: true,
        status: "rejeitado",
        pedido_id: pedidoId,
      });
    }

    const existingEarnTx = db
      .prepare(
        `
        SELECT wt.id
        FROM wallet_transactions wt
        JOIN wallets w ON w.id = wt.wallet_id
        WHERE wt.session_id = ?
          AND wt.type = 'consultor_earned'
          AND w.user_type = 'consultor'
          AND w.user_id = ?
        LIMIT 1
        `
      )
      .get(String(pedido.stripe_payment_id), consultorId) as any;

    if (existingEarnTx) {
      db.prepare(
        `
        UPDATE pergunta_pedidos
        SET status = 'aguarda_resposta'
        WHERE id = ?
        `
      ).run(pedidoId);

      return NextResponse.json({
        ok: true,
        duplicate: true,
        status: "aguarda_resposta",
        pedido_id: pedidoId,
      });
    }

    const consultor = db
      .prepare(
        `
        SELECT percentagem_ganho
        FROM consultores
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    const percentagem = round2(Number(consultor?.percentagem_ganho ?? 40));
    const preco = round2(Number(pedido.preco_eur ?? 0));
    const consultorShare = round2(preco * (percentagem / 100));
    const walletId = ensureWallet("consultor", consultorId);

    db.transaction(() => {
      db.prepare(
        `
        UPDATE wallets
        SET
          balance_eur = balance_eur + ?,
          earned_eur = earned_eur + ?,
          updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(consultorShare, consultorShare, walletId);

      db.prepare(
        `
        INSERT INTO wallet_transactions (
          wallet_id,
          session_id,
          type,
          amount_eur,
          description
        )
        VALUES (?, ?, 'consultor_earned', ?, ?)
        `
      ).run(
        walletId,
        String(pedido.stripe_payment_id),
        consultorShare,
        `Comissão pacote perguntas ${pedidoId}`
      );

      db.prepare(
        `
        UPDATE pergunta_pedidos
        SET status = 'aguarda_resposta'
        WHERE id = ?
        `
      ).run(pedidoId);
    })();

    return NextResponse.json({
      ok: true,
      status: "aguarda_resposta",
      pedido_id: pedidoId,
      consultor_share: consultorShare,
      percentagem,
    });
  } catch (e: any) {
    console.error("ERRO /api/consultor/emails/respond:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}