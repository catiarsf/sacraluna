export const dynamic = "force-dynamic";
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
        { ok: false, error: "Só clientes podem pedir chat." },
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
        SELECT id, nome, preco_por_min, preco_chat, ativo, online, ocupado
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

    if (Number(consultor.ativo ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor indisponível." },
        { status: 400 }
      );
    }

    if (Number(consultor.online ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor está offline." },
        { status: 400 }
      );
    }

    if (Number(consultor.ocupado ?? 0) === 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor ocupado neste momento." },
        { status: 409 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Fecha sessões ativas antigas ou presas antes de criar novo pedido
    db.prepare(
      `
      UPDATE chat_sessions
      SET status = 'ended',
          ended_at = ?
      WHERE status = 'active'
        AND consultor_id = ?
        AND (
          started_at IS NULL
          OR started_at < ?
        )
      `
    ).run(now, consultorId, now - 300);

    // Fecha quaisquer sessões ativas antigas do mesmo cliente + consultor
    const oldActiveSessions = db
      .prepare(
        `
        SELECT id
        FROM chat_sessions
        WHERE cliente_id = ?
          AND consultor_id = ?
          AND status = 'active'
        `
      )
      .all(user.id, consultorId) as any[];

    if (oldActiveSessions.length > 0) {
      for (const row of oldActiveSessions) {
        db.prepare(
          `
          UPDATE chat_sessions
          SET status = 'ended',
              ended_at = ?
          WHERE id = ?
          `
        ).run(now, row.id);
      }
    }

    const alreadyPendingSamePair = db
      .prepare(
        `
        SELECT id
        FROM chat_sessions
        WHERE cliente_id = ?
          AND consultor_id = ?
          AND status = 'pending'
        LIMIT 1
        `
      )
      .get(user.id, consultorId) as any;

    const precoPorMin = toNumber(
      consultor.preco_chat ?? consultor.preco_por_min
    );

    if (alreadyPendingSamePair) {
      return NextResponse.json({
        ok: true,
        status: "pending",
        session_id: alreadyPendingSamePair.id,
        consultor_id: consultorId,
        preco_por_min: precoPorMin,
      });
    }

    const pendingForConsultor = db
      .prepare(
        `
        SELECT id
        FROM chat_sessions
        WHERE consultor_id = ?
          AND status = 'pending'
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    if (pendingForConsultor) {
      return NextResponse.json(
        { ok: false, error: "Este consultor já tem um pedido pendente." },
        { status: 409 }
      );
    }

    const wallet = getOrCreateWallet("cliente", Number(user.id));
    const saldo = toNumber(wallet?.balance_eur);

    if (precoPorMin <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço por minuto inválido." },
        { status: 400 }
      );
    }

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
      VALUES (?, ?, ?, ?, 'pending', ?, NULL, 0, 0, 0, strftime('%s','now'))
      `
    ).run(
      chatSessionId,
      user.id,
      consultorId,
      String((user as any).nome ?? "Cliente"),
      precoPorMin
    );

    return NextResponse.json({
      ok: true,
      status: "pending",
      session_id: chatSessionId,
      consultor_id: consultorId,
      preco_por_min: precoPorMin,
      saldo_eur: saldo,
      minutos_estimados: Math.floor(saldo / precoPorMin),
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/request:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}