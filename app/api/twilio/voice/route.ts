export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function xml(text: string) {
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
    status: 200,
  });
}

function normPhone(v: any) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "");
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const clienteId = Number(searchParams.get("clienteId") || 0);
    const maxSeconds = Number(searchParams.get("maxSeconds") || 0);

    if (!clienteId) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Cliente inválido.</Say>
  <Hangup/>
</Response>`);
    }

    const cliente = db
      .prepare(`
        SELECT telefone
        FROM users
        WHERE id = ?
        LIMIT 1
      `)
      .get(clienteId) as any;

    if (!cliente) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Cliente não encontrado.</Say>
  <Hangup/>
</Response>`);
    }

    const clienteTelefone = normPhone(cliente.telefone);

    if (!clienteTelefone.startsWith("+")) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Número do cliente inválido.</Say>
  <Hangup/>
</Response>`);
    }

    const callerId = normPhone(process.env.TWILIO_PHONE_NUMBER);

    const timeLimit =
      maxSeconds > 0
        ? `timeLimit="${maxSeconds}"`
        : "";

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>

  <Say language="pt-PT">
    Nova consulta Sacra Luna.
  </Say>

  <Dial
    callerId="${callerId}"
    answerOnBridge="true"
    timeout="20"
    ${timeLimit}
  >
    ${clienteTelefone}
  </Dial>

</Response>`);
  } catch (e: any) {
    console.error("VOICE ROUTE ERROR:", e);

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">
    Erro interno na chamada.
  </Say>
  <Hangup/>
</Response>`);
  }
}