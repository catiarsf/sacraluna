import { NextResponse } from "next/server";
import db, { getOrCreateWallet } from "@/lib/db";

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const consultorId = Number(body?.consultor_id ?? 0);
    const action = String(body?.action ?? "").trim().toLowerCase();
    const amount = round2(Number(String(body?.amount ?? 0).replace(",", ".")));

    if (!consultorId || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "consultor_id inválido." },
        { status: 400 }
      );
    }

    if (!["add", "remove"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Ação inválida. Usa add ou remove." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valor inválido." },
        { status: 400 }
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

    const result = db.transaction(() => {
      const wallet = getOrCreateWallet("consultor", consultorId);

      const currentBalance = round2(Number(wallet.balance_eur || 0));
      const currentEarned = round2(Number(wallet.earned_eur || 0));
      const currentSpent = round2(Number(wallet.spent_eur || 0));

      let newBalance = currentBalance;
      let newEarned = currentEarned;
      let newSpent = currentSpent;

      if (action === "add") {
        newBalance = round2(currentBalance + amount);
        newEarned = round2(currentEarned + amount);

        db.prepare(
          `
          UPDATE wallets
          SET balance_eur = ?, earned_eur = ?, updated_at = strftime('%s','now')
          WHERE id = ?
          `
        ).run(newBalance, newEarned, wallet.id);

        db.prepare(
          `
          INSERT INTO wallet_transactions (
            wallet_id, session_id, type, amount_eur, description
          ) VALUES (?, NULL, 'admin_credit', ?, ?)
          `
        ).run(
          wallet.id,
          amount,
          `Crédito manual admin para consultor ${consultorId}`
        );
      } else {
        if (currentBalance < amount) {
          return {
            error: "Saldo insuficiente para retirar esse valor.",
          };
        }

        newBalance = round2(currentBalance - amount);
        newSpent = round2(currentSpent + amount);

        db.prepare(
          `
          UPDATE wallets
          SET balance_eur = ?, spent_eur = ?, updated_at = strftime('%s','now')
          WHERE id = ?
          `
        ).run(newBalance, newSpent, wallet.id);

        db.prepare(
          `
          INSERT INTO wallet_transactions (
            wallet_id, session_id, type, amount_eur, description
          ) VALUES (?, NULL, 'admin_debit', ?, ?)
          `
        ).run(
          wallet.id,
          -amount,
          `Débito manual admin para consultor ${consultorId}`
        );
      }

      return {
        balance_eur: newBalance,
        earned_eur: newEarned,
        spent_eur: newSpent,
      };
    })();

    if ("error" in result) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      consultor: {
        id: Number(consultor.id),
        nome: String(consultor.nome ?? ""),
      },
      wallet: result,
    });
  } catch (e: any) {
    console.error("ERRO wallet-adjust:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao ajustar saldo do consultor." },
      { status: 500 }
    );
  }
}