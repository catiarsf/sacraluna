import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    const user = session.user;

    console.log("SESSION USER /api/cliente/me:", user);

    if (!user || !user.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Acesso negado." },
        { status: 403 }
      );
    }

    let wallet = db
      .prepare(
        `
        SELECT id, balance_eur, earned_eur, spent_eur
        FROM wallets
        WHERE user_type = 'cliente' AND user_id = ?
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
        .prepare(
          `
          SELECT id, balance_eur, earned_eur, spent_eur
          FROM wallets
          WHERE id = ?
          `
        )
        .get(info.lastInsertRowid) as any;
    }

    const saldo = Number(wallet?.balance_eur ?? 0);

    let historico: any[] = [];

    try {
      historico = db
        .prepare(
          `
          SELECT
            cs.id,
            datetime(cs.created_at, 'unixepoch') AS data,
            ROUND(COALESCE(cs.billed_seconds, 0) / 60.0, 1) AS duracao_min,
            COALESCE(cs.total_charged_eur, 0) AS total_eur,
            COALESCE(c.nome, 'Consultor') AS consultor_nome
          FROM chat_sessions cs
          LEFT JOIN consultores c ON c.id = cs.consultor_id
          WHERE cs.cliente_id = ?
          ORDER BY cs.created_at DESC
          LIMIT 20
          `
        )
        .all(user.id) as any[];
    } catch (err) {
      console.warn("Histórico indisponível:", err);
      historico = [];
    }

    return NextResponse.json({
      ok: true,
      id: Number(user.id),
      cliente: {
        id: Number(user.id),
        nome: String((user as any).nome ?? ""),
        email: String((user as any).email ?? ""),
        role: "cliente",
      },
      saldo_eur: saldo,
      historico,
    });
  } catch (e) {
    console.error("ERRO /api/cliente/me:", e);

    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}