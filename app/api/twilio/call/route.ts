export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import twilio from "twilio";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

function normPhone(v: any) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "");
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export async function POST(req: Request) {
  let callSessionId = "";

  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (String(user.role) !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Só clientes podem iniciar chamadas." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const consultorId = Number(body?.consultorId);

    if (!consultorId) {
      return NextResponse.json(
        { ok: false, error: "Consultor inválido." },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (
      !accountSid ||
      !authToken ||
      !twilioPhone ||
      !siteUrl
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Variáveis Twilio em falta.",
        },
        { status: 500 }
      );
    }

    const cliente = db
      .prepare(
        `
        SELECT id, nome, telefone
        FROM users
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(Number(user.id)) as any;

    if (!cliente) {
      return NextResponse.json(
        { ok: false, error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT *
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

    if (Number(consultor.online ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor offline." },
        { status: 400 }
      );
    }

    if (Number(consultor.ocupado ?? 0) === 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor ocupado." },
        { status: 409 }
      );
    }

    const clienteTelefone = normPhone(cliente.telefone);
    const consultorTelefone = normPhone(consultor.telefone);

    if (!clienteTelefone.startsWith("+")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Telefone do cliente inválido.",
        },
        { status: 400 }
      );
    }

    if (!consultorTelefone.startsWith("+")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Telefone do consultor inválido.",
        },
        { status: 400 }
      );
    }

    const pricePerMin = Number(consultor.preco_voz ?? 0);

    if (pricePerMin <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Preço VOZ inválido.",
        },
        { status: 400 }
      );
    }

    const wallet = db
      .prepare(
        `
        SELECT *
        FROM wallets
        WHERE user_type = 'cliente'
        AND user_id = ?
        LIMIT 1
        `
      )
      .get(Number(user.id)) as any;

    const saldo = Number(wallet?.balance_eur ?? 0);

    if (saldo <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Saldo insuficiente.",
        },
        { status: 402 }
      );
    }

    const maxSeconds = Math.floor((saldo / pricePerMin) * 60);

    callSessionId =
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
const now = Math.floor(Date.now() / 1000);

    db.prepare(
      `
      INSERT INTO call_sessions (
        id,
        consultor_id,
        cliente_id,
        cliente_nome,
        status,
        call_sid,
        price_per_min,
        duration_seconds,
        total_charged_eur,
        consultor_earned_eur,
        billed,
        recording_url,
        created_at,
        started_at,
        ended_at
      )
      VALUES (?, ?, ?, ?, 'initiated', NULL, ?, 0, 0, 0, 0, NULL, strftime('%s','now'), NULL, NULL)
      `
    ).run(
      callSessionId,
      consultorId,
      Number(user.id),
      String(cliente.nome ?? "Cliente"),
      pricePerMin
    );

    const client = twilio(accountSid, authToken);

    const webhookUrl =
      `${siteUrl}/api/twilio/voice` +
      `?consultorId=${consultorId}` +
      `&clienteId=${Number(user.id)}` +
      `&callSessionId=${encodeURIComponent(callSessionId)}` +
      `&maxSeconds=${maxSeconds}`;

    const statusCallbackUrl =
      `${siteUrl}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&clienteId=${Number(user.id)}` +
      `&callSessionId=${encodeURIComponent(callSessionId)}`;

    const call = await client.calls.create({
      to: consultorTelefone,
      from: normPhone(twilioPhone),
      url: webhookUrl,
      method: "POST",
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    db.transaction(() => {
      db.prepare(
        `
        UPDATE call_sessions
        SET call_sid = ?
        WHERE id = ?
        `
      ).run(call.sid, callSessionId);

      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 1,
            online = 1,
            last_seen_at = ?
        WHERE id = ?
        `
      ).run(now, consultorId);
    })();

    return NextResponse.json({
      ok: true,
      call_sid: call.sid,
      callSessionId,
      max_seconds: maxSeconds,
      saldo_eur: round2(saldo),
      preco_voz_eur_min: round2(pricePerMin),
    });
  } catch (e: any) {
    console.error("ERRO /api/twilio/call:", e);

    if (callSessionId) {
      try {
        const row = db
          .prepare(
            `
            SELECT consultor_id
            FROM call_sessions
            WHERE id = ?
            LIMIT 1
            `
          )
          .get(callSessionId) as any;

        db.prepare(
          `
          UPDATE call_sessions
          SET status = 'failed',
              ended_at = COALESCE(ended_at, strftime('%s','now'))
          WHERE id = ?
          `
        ).run(callSessionId);

        if (row?.consultor_id) {
          db.prepare(
            `
            UPDATE consultores
            SET ocupado = 0,
                online = 1,
                last_seen_at = strftime('%s','now')
            WHERE id = ?
            `
          ).run(Number(row.consultor_id));
        }
      } catch (rollbackError) {
        console.error("ERRO rollback /api/twilio/call:", rollbackError);
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Não foi possível iniciar a chamada.",
      },
      { status: 500 }
    );
  }
}