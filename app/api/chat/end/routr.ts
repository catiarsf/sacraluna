import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, getOrCreateWallet } from "@/lib/db";
import { getSession } from "@/lib/auth";

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const authSession = await getSession();
    const user = authSession?.user ?? null;

    const cookieStore = await cookies();
    const consultorIdCookie = Number(cookieStore.get("consultor_id")?.value || 0);

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.session_id ?? body?.sessionId ?? "").trim();

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Sessão inválida." },
        { status: 400 }
      );
    }

    const row = db
      .prepare(
        `
        SELECT *
        FROM chat_sessions
        WHERE id = ?
        `
      )
      .get(sessionId) as any;

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    const isCliente = !!user?.id && Number(row.cliente_id) === Number(user.id);
    const isConsultor =
      !!consultorIdCookie && Number(row.consultor_id) === Number(consultorIdCookie);

    if (!isCliente && !isConsultor) {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    if (String(row.status) === "ended") {
      return NextResponse.json({
        ok: true,
        session_id: sessionId,
        status: "ended",
        consultor_id: row.consultor_id,
        already_ended: true,
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const startedAt = Number(row.started_at || now);
    const billedSeconds = Number(row.billed_seconds || 0);
    const pricePerMin = Number(row.price_per_min || 0);

    const totalElapsedSeconds = Math.max(0, now - startedAt);

    // OPÇÃO B:
    // cobra também o minuto em curso ao terminar
    const totalMinutesToBill = Math.ceil(totalElapsedSeconds / 60);
    const alreadyBilledMinutes = Math.floor(billedSeconds / 60);
    const missingMinutes = Math.max(0, totalMinutesToBill - alreadyBilledMinutes);

    const consultor = db
      .prepare(
        `
        SELECT percentagem_ganho
        FROM consultores
        WHERE id = ?
        `
      )
      .get(row.consultor_id) as any;

    const percentagem = round2(Number(consultor?.percentagem_ganho ?? 40));

    let chargedNow = 0;
    let chargedMinutes = 0;
    let newClientBalance: number | null = null;
    let newTotalCharged = Number(row.total_charged_eur || 0);
    let newConsultorEarnedSession = Number(row.consultor_earned_eur || 0);
    let newBilledSeconds = billedSeconds;

    db.transaction(() => {
      if (
        missingMinutes > 0 &&
        pricePerMin > 0 &&
        row.cliente_id &&
        row.consultor_id
      ) {
        const clientWallet = getOrCreateWallet("cliente", Number(row.cliente_id));
        const consultorWallet = getOrCreateWallet("consultor", Number(row.consultor_id));

        const clientBalanceNow = round2(Number(clientWallet.balance_eur || 0));

        // quantos minutos ainda consegue pagar
        const affordableMinutes = Math.floor(clientBalanceNow / pricePerMin);
        chargedMinutes = Math.min(missingMinutes, affordableMinutes);

        if (chargedMinutes > 0) {
          chargedNow = round2(chargedMinutes * pricePerMin);

          const updatedClientBalance = round2(clientBalanceNow - chargedNow);
          const updatedClientSpent = round2(
            Number(clientWallet.spent_eur || 0) + chargedNow
          );

          db.prepare(
            `
            UPDATE wallets
            SET balance_eur = ?,
                spent_eur = ?,
                updated_at = strftime('%s','now')
            WHERE id = ?
            `
          ).run(updatedClientBalance, updatedClientSpent, clientWallet.id);

          db.prepare(
            `
            INSERT INTO wallet_transactions (
              wallet_id, session_id, type, amount_eur, description
            ) VALUES (?, ?, 'debit', ?, ?)
            `
          ).run(
            clientWallet.id,
            sessionId,
            round2(-chargedNow),
            `Cobrança final chat sessão ${sessionId}`
          );

          const consultorShare = round2(chargedNow * (percentagem / 100));

          const consultorBalanceNow = round2(Number(consultorWallet.balance_eur || 0));
          const consultorEarnedNow = round2(Number(consultorWallet.earned_eur || 0));

          db.prepare(
            `
            UPDATE wallets
            SET balance_eur = ?,
                earned_eur = ?,
                updated_at = strftime('%s','now')
            WHERE id = ?
            `
          ).run(
            round2(consultorBalanceNow + consultorShare),
            round2(consultorEarnedNow + consultorShare),
            consultorWallet.id
          );

          db.prepare(
            `
            INSERT INTO wallet_transactions (
              wallet_id, session_id, type, amount_eur, description
            ) VALUES (?, ?, 'consultor_earned', ?, ?)
            `
          ).run(
            consultorWallet.id,
            sessionId,
            consultorShare,
            `Ganho final do consultor na sessão ${sessionId}`
          );

          newBilledSeconds = billedSeconds + chargedMinutes * 60;
          newTotalCharged = round2(Number(row.total_charged_eur || 0) + chargedNow);
          newConsultorEarnedSession = round2(
            Number(row.consultor_earned_eur || 0) + consultorShare
          );
          newClientBalance = updatedClientBalance;
        }
      }

      db.prepare(
        `
        UPDATE chat_sessions
        SET status = 'ended',
            ended_at = COALESCE(ended_at, ?),
            billed_seconds = ?,
            total_charged_eur = ?,
            consultor_earned_eur = ?
        WHERE id = ?
        `
      ).run(
        now,
        newBilledSeconds,
        newTotalCharged,
        newConsultorEarnedSession,
        sessionId
      );

      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 0,
            online = 1,
            last_seen_at = ?
        WHERE id = ?
        `
      ).run(now, row.consultor_id);
    })();

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      status: "ended",
      consultor_id: row.consultor_id,
      charged_final_eur: chargedNow,
      charged_final_minutes: chargedMinutes,
      wallet_balance: newClientBalance,
      billed_seconds: newBilledSeconds,
      total_charged_eur: newTotalCharged,
      consultor_earned_eur: newConsultorEarnedSession,
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/end:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}