export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const consultorId = Number(searchParams.get("consultorId") || 0);
    const clienteId = Number(searchParams.get("clienteId") || 0);
    const callSessionId = String(searchParams.get("callSessionId") || "").trim();

    if (!consultorId) {
      return new NextResponse("Consultor inválido", { status: 400 });
    }

    // 🔍 buscar telefone real do consultor
    const consultor = db.prepare(`
      SELECT id, telefone
      FROM consultores
      WHERE id = ?
      LIMIT 1
    `).get(consultorId) as any;

    if (!consultor || !consultor.telefone) {
      return new NextResponse("Consultor sem telefone", { status: 400 });
    }

    const numero = String(consultor.telefone);

    const statusCallback =
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&callSessionId=${callSessionId}`;

    const recordingCallback =
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/twilio/status` +
      `?consultorId=${consultorId}` +
      `&callSessionId=${callSessionId}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">A ligar ao consultor. Aguarde.</Say>

  <Dial
    record="record-from-answer"
    recordingStatusCallback="${recordingCallback}"
    recordingStatusCallbackMethod="POST"
    action="${statusCallback}"
    method="POST"
  >
    ${numero}
  </Dial>

</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e: any) {
    console.error("ERRO VOICE:", e);

    return new NextResponse("Erro interno", { status: 500 });
  }
}