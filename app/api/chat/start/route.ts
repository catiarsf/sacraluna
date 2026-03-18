import { NextResponse } from "next/server";
import { db, getOrCreateWallet } from "@/lib/db";
import { getSession } from "@/lib/auth";

function toNumber(v: any) {
  const n = Number.parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function makeSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: Request) {
  try {
    const authSession = await getSession();
    const user = authSession.user;

    if (!user || !user.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Só clientes podem iniciar chat." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const consultorId = Number(body?.consultor_id);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Consultor inválido." },
        { status: 400 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT id, nome, preco_por_min, ativo, ocupado
        FROM consultores
        WHERE id = ?
        `
      )
      .get(consultorId) as any;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    if (!Number(consultor.ativo)) {
      return NextResponse.json(
        { ok: false, error: "Consultor indisponível." },
        { status: 400 }
      );
    }

    if (Number(consultor.ocupado)) {
      return NextResponse.json(
        { ok: false, error: "Consultor ocupado neste momento." },
        { status: 409 }
      );
    }

    const alreadyActive = db
      .prepare(
        `
        SELECT id
        FROM chat_sessions
        WHERE cliente_id = ?
          AND consultor_id = ?
          AND status = 'active'
        LIMIT 1
        `
      )
      .get(user.id, consultorId) as any;

    if (alreadyActive) {
      return NextResponse.json(
        {
          ok: true,
          reused: true,
          session_id: alreadyActive.id,
          consultor_id: consultorId,
          preco_por_min: toNumber(consultor.preco_por_min),
        },
        { status: 200 }
      );
    }

    const wallet = getOrCreateWallet("cliente", Number(user.id));
    const saldo = toNumber(wallet?.balance_eur);
    const precoPorMin = toNumber(consultor.preco_por_min);

    if (precoPorMin <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço por minuto inválido." },
        { status: 400 }
      );
    }

    // Exige pelo menos 1 minuto disponível antes de iniciar
    if (saldo < precoPorMin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Saldo insuficiente para iniciar a consulta.",
          code: "INSUFFICIENT_BALANCE",
          saldo_eur: saldo,
          preco_por_min: precoPorMin,
          minimo_para_entrar_eur: precoPorMin,
        },
        { status: 402 }
      );
    }

    const chatSessionId = makeSessionId();

    db.transaction(() => {
      db.prepare(
        `
        INSERT INTO chat_sessions (
          id,
          cliente_id,
          consultor_id,
          cliente_nome,
          status,
          price_per_min,
          started_at,
          billed_seconds,
          total_charged_eur,
          consultor_earned_eur,
          created_at
        )
        VALUES (?, ?, ?, ?, 'active', ?, strftime('%s','now'), 0, 0, 0, strftime('%s','now'))
        `
      ).run(
        chatSessionId,
        user.id,
        consultorId,
        String((user as any).nome ?? ""),
        precoPorMin
      );

      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 1,
            online = 1,
            last_seen_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(consultorId);
    })();

    return NextResponse.json({
      ok: true,
      session_id: chatSessionId,
      consultor_id: consultorId,
      preco_por_min: precoPorMin,
      saldo_eur: saldo,
      minutos_estimados: Math.floor(saldo / precoPorMin),
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/start:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}