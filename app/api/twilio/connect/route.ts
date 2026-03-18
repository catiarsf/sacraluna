import { NextResponse } from "next/server";
import twilio from "twilio";
import db from "@/lib/db";

const VoiceResponse = twilio.twiml.VoiceResponse;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    const consultorId = toNumber(url.searchParams.get("consultorId"));
    const clienteId = toNumber(url.searchParams.get("clienteId"));

    if (!consultorId || !clienteId) {
      return new NextResponse("Parâmetros inválidos.", { status: 400 });
    }

    const cliente = db
      .prepare(
        `
        SELECT id, nome
        FROM users
        WHERE id = ?
        `
      )
      .get(clienteId) as any;

    if (!cliente) {
      return new NextResponse("Cliente não encontrado.", { status: 404 });
    }

    const consultor = db
      .prepare(
        `
        SELECT
          id,
          nome,
          telefone,
          ativo,
          online,
          ocupado,
          preco_voz,
          preco_por_min
        FROM consultores
        WHERE id = ?
        `
      )
      .get(consultorId) as any;

    if (!consultor) {
      return new NextResponse("Consultor não encontrado.", { status: 404 });
    }

    if (!consultor.telefone) {
      return new NextResponse("Consultor sem telefone.", { status: 400 });
    }

    if (Number(consultor.ativo ?? 0) !== 1) {
      return new NextResponse("Consultor inativo.", { status: 400 });
    }

    if (Number(consultor.online ?? 0) !== 1 || Number(consultor.ocupado ?? 0) === 1) {
      return new NextResponse("Consultor indisponível.", { status: 400 });
    }

    const wallet = db
      .prepare(
        `
        SELECT id, balance_eur
        FROM wallets
        WHERE user_type = 'cliente' AND user_id = ?
        `
      )
      .get(clienteId) as any;

    const saldo = Number(wallet?.balance_eur ?? 0);
    const precoVoz = toNumber(consultor.preco_voz ?? consultor.preco_por_min ?? 0);

    if (!precoVoz || precoVoz <= 0) {
      return new NextResponse("Preço de voz inválido.", { status: 400 });
    }

    if (saldo < precoVoz) {
      return new NextResponse("Saldo insuficiente.", { status: 400 });
    }

    const maxSeconds = Math.max(60, Math.floor((saldo / precoVoz) * 60));

    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `voz-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    db.prepare(
      `
      INSERT INTO chat_sessions (
        id,
        cliente_id,
        consultor_id,
        cliente_nome,
        status,
        price_per_min,
        created_at
      )
      VALUES (?, ?, ?, ?, 'dialing', ?, strftime('%s','now'))
      `
    ).run(
      sessionId,
      clienteId,
      consultorId,
      String(cliente.nome ?? ""),
      round2(precoVoz)
    );

    db.prepare(
      `
      UPDATE consultores
      SET ocupado = 1, last_seen_at = strftime('%s','now')
      WHERE id = ?
      `
    ).run(consultorId);

    const vr = new VoiceResponse();

    const dial = vr.dial({
      answerOnBridge: true,
      timeLimit: maxSeconds,
    });

    dial.number(
      {
        statusCallback: `${siteUrl}/api/twilio/status?sessionId=${encodeURIComponent(
          sessionId
        )}`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      },
      String(consultor.telefone)
    );

    return new NextResponse(vr.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (e: any) {
    console.error("ERRO /api/twilio/connect:", e);
    return new NextResponse("Erro ao ligar chamada.", { status: 500 });
  }
}