export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import twilio from "twilio";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

function normPhone(v: any) {
  return String(v ?? "").trim().replace(/\s+/g, "");
}

export async function POST(req: Request) {
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

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Consultor inválido." },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!accountSid || !authToken || !twilioPhoneNumber || !siteUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltam variáveis da Twilio ou NEXT_PUBLIC_SITE_URL na Railway.",
        },
        { status: 500 }
      );
    }

    const cliente = db
      .prepare(
        `
        SELECT id, nome, telefone
        FROM users
        WHERE id = ? AND role = 'cliente'
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

    const clienteTelefone = normPhone(cliente.telefone);

    if (!clienteTelefone || !clienteTelefone.startsWith("+")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "O teu número de telefone não está válido. Usa formato +3519XXXXXXXX.",
        },
        { status: 400 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT id, nome, telefone, ativo, online, ocupado, voip_ativo, preco_voz
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

    if (Number(consultor.ativo ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor indisponível." },
        { status: 400 }
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
        { ok: false, error: "Consultor ocupado neste momento." },
        { status: 409 }
      );
    }

    if (Number(consultor.voip_ativo ?? 0) !== 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "As chamadas por voz estão desligadas para este consultor.",
        },
        { status: 400 }
      );
    }

    const consultorTelefone = normPhone(consultor.telefone);

    if (!consultorTelefone || !consultorTelefone.startsWith("+")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "O telefone da consultora não está válido. Usa formato +3519XXXXXXXX na administração.",
        },
        { status: 400 }
      );
    }

    const callSessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const pricePerMin = Number(consultor.preco_voz ?? 0);

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
      `&callSessionId=${encodeURIComponent(callSessionId)}`;

    const statusCallbackUrl =
      `${siteUrl}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&clienteId=${Number(user.id)}` +
      `&callSessionId=${encodeURIComponent(callSessionId)}`;

    const call = await client.calls.create({
      to: consultorTelefone,
      from: twilioPhoneNumber,
      url: webhookUrl,
      method: "POST",
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    db.prepare(
      `
      UPDATE call_sessions
      SET call_sid = ?
      WHERE id = ?
      `
    ).run(call.sid, callSessionId);

    return NextResponse.json({
      ok: true,
      call_sid: call.sid,
      callSessionId,
    });
  } catch (e: any) {
    console.error("ERRO /api/twilio/call:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Não foi possível iniciar a chamada.",
      },
      { status: 500 }
    );
  }
}