export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function xml(text: string) {
  return new NextResponse(text, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    status: 200,
  });
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const consultorId = Number(searchParams.get("consultorId") || 0);
    const clienteId = Number(searchParams.get("clienteId") || 0);
    const callSessionId = String(searchParams.get("callSessionId") || "").trim();

    if (!consultorId || !clienteId || !callSessionId) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Dados da chamada inválidos.</Say>
  <Hangup/>
</Response>`);
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
      .get(clienteId) as any;

    if (!cliente?.telefone) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">O número do cliente não está disponível.</Say>
  <Hangup/>
</Response>`);
    }

    const clienteNome = String(cliente.nome || "Cliente");
    const clienteTelefone = String(cliente.telefone || "").trim();

    if (!clienteTelefone.startsWith("+")) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">O número do cliente não está válido.</Say>
  <Hangup/>
</Response>`);
    }

    const statusCallback =
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&clienteId=${clienteId}` +
      `&callSessionId=${encodeURIComponent(callSessionId)}`;

    const recordingCallback =
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&clienteId=${clienteId}` +
      `&callSessionId=${encodeURIComponent(callSessionId)}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Nova consulta da plataforma Sacraluna.</Say>
  <Say language="pt-PT">A ligar ao cliente ${clienteNome}.</Say>
  <Dial
    answerOnBridge="true"
    record="record-from-answer"
    recordingStatusCallback="${recordingCallback}"
    recordingStatusCallbackMethod="POST"
    action="${statusCallback}"
    method="POST"
  >
    ${clienteTelefone}
  </Dial>
</Response>`;

    return xml(twiml);
  } catch (e: any) {
    console.error("ERRO /api/twilio/voice:", e);

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Erro ao estabelecer a chamada.</Say>
  <Hangup/>
</Response>`);
  }
}