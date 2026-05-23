export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function xml(text: string) {
  return new NextResponse(text, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    status: 200,
  });
}

function normPhone(v: any) {
  return String(v ?? "").trim().replace(/\s+/g, "");
}

function escapeXml(v: any) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const consultorId = Number(searchParams.get("consultorId") || 0);
    const clienteId = Number(searchParams.get("clienteId") || 0);
    const callSessionId = String(searchParams.get("callSessionId") || "").trim();
    const maxSeconds = Number(searchParams.get("maxSeconds") || 0);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const twilioPhoneNumber = normPhone(process.env.TWILIO_PHONE_NUMBER);

    if (!siteUrl || !twilioPhoneNumber.startsWith("+")) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt">Configuração da chamada incompleta.</Say>
  <Hangup/>
</Response>`);
    }

    if (!consultorId || !clienteId || !callSessionId) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt">Dados da chamada inválidos.</Say>
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

    const clienteTelefone = normPhone(cliente?.telefone);
    const clienteNome = escapeXml(cliente?.nome || "Cliente");

    if (!clienteTelefone.startsWith("+")) {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt">O número do cliente não está válido.</Say>
  <Hangup/>
</Response>`);
    }

    const statusUrl =
      `${siteUrl}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&clienteId=${clienteId}` +
      `&callSessionId=${encodeURIComponent(callSessionId)}`;

    const timeLimitAttr = maxSeconds > 0 ? ` timeLimit="${maxSeconds}"` : "";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt">Nova consulta SacraLuna.</Say>
  <Say language="pt">A ligar ao cliente ${clienteNome}.</Say>

  <Dial
    callerId="${twilioPhoneNumber}"
    answerOnBridge="true"
    timeout="20"
    record="record-from-answer"
    recordingStatusCallback="${statusUrl}"
    recordingStatusCallbackMethod="POST"
    action="${statusUrl}"
    method="POST"${timeLimitAttr}
  >
    ${clienteTelefone}
  </Dial>
</Response>`;

    return xml(twiml);
  } catch (e: any) {
    console.error("ERRO /api/twilio/voice:", e);

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt">Erro ao estabelecer a chamada.</Say>
  <Hangup/>
</Response>`);
  }
}