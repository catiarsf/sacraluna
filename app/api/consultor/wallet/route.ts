import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

function toNumber(v: any) {
  const n = Number.parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT id, nome
        FROM consultores
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    let wallet = db
      .prepare(
        `
        SELECT id, balance_eur, earned_eur, spent_eur
        FROM wallets
        WHERE user_type = 'consultor' AND user_id = ?
        `
      )
      .get(consultorId) as any;

    if (!wallet) {
      const info = db
        .prepare(
          `
          INSERT INTO wallets (user_type, user_id, balance_eur, earned_eur, spent_eur)
          VALUES ('consultor', ?, 0, 0, 0)
          `
        )
        .run(consultorId);

      wallet = db
        .prepare(
          `
          SELECT id, balance_eur, earned_eur, spent_eur
          FROM wallets
          WHERE id = ?
          `
        )
        .get(info.lastInsertRowid) as any;
    }

    const ganhosHoje = db
      .prepare(
        `
        SELECT COALESCE(SUM(amount_eur), 0) AS total
        FROM wallet_transactions
        WHERE wallet_id = ?
          AND type = 'consultor_earned'
          AND date(created_at, 'unixepoch', 'localtime') = date('now', 'localtime')
        `
      )
      .get(wallet.id) as any;

    const consultasHoje = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM chat_sessions
        WHERE consultor_id = ?
          AND date(created_at, 'unixepoch', 'localtime') = date('now', 'localtime')
        `
      )
      .get(consultorId) as any;

    const consultasTotal = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM chat_sessions
        WHERE consultor_id = ?
        `
      )
      .get(consultorId) as any;

    return NextResponse.json({
      ok: true,
      consultor: {
        id: Number(consultor.id),
        nome: String(consultor.nome ?? ""),
      },
      wallet: {
        balance_eur: toNumber(wallet.balance_eur),
        earned_eur: toNumber(wallet.earned_eur),
        spent_eur: toNumber(wallet.spent_eur),
      },
      stats: {
        ganhos_hoje_eur: toNumber(ganhosHoje?.total),
        consultas_hoje: Number(consultasHoje?.total ?? 0),
        consultas_total: Number(consultasTotal?.total ?? 0),
      },
    });
  } catch (e: any) {
    console.error("ERRO /api/consultor/wallet:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}