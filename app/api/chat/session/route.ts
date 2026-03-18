import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function makeSessionId() {
  // Node 18+ tem crypto.randomUUID()
  // se der erro, trocamos depois por Date.now()+Math.random()
  return crypto.randomUUID();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const consultorId = Number(body?.consultorId);
    const clienteNome = body?.clienteNome ? String(body.clienteNome) : "Cliente";

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json({ ok: false, error: "consultorId inválido" }, { status: 400 });
    }

    const sessionId = makeSessionId();

    db.prepare(
      `
      INSERT INTO chat_sessions (id, consultor_id, cliente_nome, status)
      VALUES (?, ?, ?, 'open')
      `
    ).run(sessionId, consultorId, clienteNome);

    return NextResponse.json({ ok: true, sessionId });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao criar sessão", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}