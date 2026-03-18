import { NextResponse } from "next/server";
import Twilio from "twilio";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

if (!accountSid) {
  throw new Error("Falta TWILIO_ACCOUNT_SID no .env.local");
}

if (!authToken) {
  throw new Error("Falta TWILIO_AUTH_TOKEN no .env.local");
}

if (!twilioPhoneNumber) {
  throw new Error("Falta TWILIO_PHONE_NUMBER no .env.local");
}

if (!siteUrl) {
  throw new Error("Falta NEXT_PUBLIC_SITE_URL no .env.local");
}

const client = Twilio(accountSid, authToken);

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {

    // VERIFICA LOGIN
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Tens de iniciar sessão para fazer uma chamada." },
        { status: 401 }
      );
    }

    // APENAS CLIENTES
    if (session.user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Só clientes podem iniciar chamadas." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const consultorId = toNumber(body?.consultorId);

    if (!consultorId || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "consultorId inválido." },
        { status: 400 }
      );
    }

    // CLIENTE
    const cliente = db.prepare(`
        SELECT id, nome, telefone
        FROM users
        WHERE id = ?
    `).get(session.user.id) as any;

    if (!cliente) {
      return NextResponse.json(
        { ok: false, error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    if (!cliente.telefone) {
      return NextResponse.json(
        { ok: false, error: "A tua conta não tem número de telemóvel." },
        { status: 400 }
      );
    }

    if (!String(cliente.telefone).startsWith("+")) {
      return NextResponse.json(
        { ok: false, error: "Telefone inválido. Usa formato +351XXXXXXXXX." },
        { status: 400 }
      );
    }

    // CONSULTOR
    const consultor = db.prepare(`
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
    `).get(consultorId) as any;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    if (!consultor.telefone) {
      return NextResponse.json(
        { ok: false, error: "Consultor não tem telefone configurado." },
        { status: 400 }
      );
    }

    if (!String(consultor.telefone).startsWith("+")) {
      return NextResponse.json(
        { ok: false, error: "Telefone do consultor inválido." },
        { status: 400 }
      );
    }

    if (Number(consultor.ativo ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor não está ativo." },
        { status: 400 }
      );
    }

    if (Number(consultor.online ?? 0) !== 1 || Number(consultor.ocupado ?? 0) === 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor não está disponível." },
        { status: 400 }
      );
    }

    const precoVoz = toNumber(
      consultor.preco_voz ?? consultor.preco_por_min ?? 0
    );

    if (!precoVoz || precoVoz <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço de voz inválido." },
        { status: 400 }
      );
    }

    // WALLET
    const wallet = db.prepare(`
        SELECT balance_eur
        FROM wallets
        WHERE user_type='cliente' AND user_id=?
    `).get(session.user.id) as any;

    const saldo = Number(wallet?.balance_eur ?? 0);

    // SALDO PARA 1 MINUTO
    if (saldo < precoVoz) {
      return NextResponse.json(
        {
          ok: false,
          error: `Saldo insuficiente. Precisas de pelo menos ${precoVoz.toFixed(2)}€.`,
          saldo_eur: saldo,
        },
        { status: 400 }
      );
    }

    // TWILIO CONNECT
    const connectUrl =
      `${siteUrl}/api/twilio/connect` +
      `?consultorId=${consultorId}` +
      `&clienteId=${session.user.id}`;

    const call = await client.calls.create({
      to: cliente.telefone,
      from: twilioPhoneNumber,
      url: connectUrl,
      method: "POST",
    });

    return NextResponse.json({
      ok: true,
      sid: call.sid,
      message: "A chamada está a ser iniciada. Atende o teu telemóvel.",
    });

  } catch (e: any) {

    console.error("ERRO TWILIO CALL:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao iniciar chamada." },
      { status: 500 }
    );
  }
}