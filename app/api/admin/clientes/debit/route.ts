export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db, { debitWallet, getOrCreateWallet } from "@/lib/db";

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const userId = Number(body?.user_id);
    const amount = toNumber(body?.amount);
    const description = String(
      body?.description ?? "Retirada manual admin"
    ).trim();

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Cliente inválido." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valor inválido." },
        { status: 400 }
      );
    }

    const cliente = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE id = ?
          AND role = 'cliente'
        LIMIT 1
        `
      )
      .get(userId) as any;

    if (!cliente) {
      return NextResponse.json(
        { ok: false, error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    getOrCreateWallet("cliente", userId);

    const wallet = debitWallet({
      userType: "cliente",
      userId,
      amount,
      description,
      sessionId: `admin_debit_${Date.now()}`,
    });

    return NextResponse.json({
      ok: true,
      wallet,
    });
  } catch (e: any) {
    console.error("ERRO /api/admin/clientes/debit:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao retirar saldo.",
      },
      { status: 500 }
    );
  }
}