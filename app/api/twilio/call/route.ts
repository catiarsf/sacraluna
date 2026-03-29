export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const consultorId = Number(searchParams.get("consultorId") || 0);
    const clienteId = Number(searchParams.get("clienteId") || 0);
    const callSessionId = String(searchParams.get("callSessionId") || "").trim();
    const maxSeconds = Number(searchParams.get("maxSeconds") || 0);

    if (!consultorId || !clienteId) {
      const badTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Dados da chamada inválidos.</Say>
  <Hangup/>
</Response>`;

      return new NextResponse(badTwiml, {
        headers: { "Content-Type": "text/xml" },
        status: 200,
      });
    }

    const cliente = db.prepare(`
      SELECT id, nome, telefone
      FROM users
      WHERE id = ? AND role = 'cliente'
    `).get(clienteId) as any;

    if (!cliente?.telefone) {
      const noClientTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>O número do cliente não está disponível.</Say>
  <Hangup/>
</Response>`;

      return new NextResponse(noClientTwiml, {
        headers: { "Content-Type": "text/xml" },
        status: 200,
      });
    }

    const clienteNome = String(cliente.nome || "Cliente");

    const statusCallback =
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&callSessionId=${encodeURIComponent(callSessionId)}`;

    const recordingCallback =
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&callSessionId=${encodeURIComponent(callSessionId)}`;

    const timeLimitAttr = maxSeconds > 0 ? ` timeLimit="${maxSeconds}"` : "";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Nova consulta da plataforma Sacraluna.</Say>
  <Say language="pt-PT">A ligar ao cliente ${clienteNome}.</Say>
  <Dial
    answerOnBridge="true"${timeLimitAttr}
    record="record-from-answer"
    recordingStatusCallback="${recordingCallback}"
    recordingStatusCallbackMethod="POST"
    action="${statusCallback}"
    method="POST"
  >
    ${cliente.telefone}
  </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  } catch (e: any) {
    console.error("ERRO TWILIO CONNECT:", e);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Erro ao estabelecer a chamada.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(errorTwiml, {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  }
}