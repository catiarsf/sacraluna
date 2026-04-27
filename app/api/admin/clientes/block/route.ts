export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

async function getDb() {
  const mod = await import("@/lib/db");
  return mod.db ?? mod.default;
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json().catch(() => ({}));

    const userId = Number(body?.user_id);
    const bloqueado = body?.bloqueado ? 1 : 0;

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Cliente inválido." },
        { status: 400 }
      );
    }

    const cliente = db
      .prepare(`SELECT id FROM users WHERE id = ? AND role = 'cliente'`)
      .get(userId) as any;

    if (!cliente) {
      return NextResponse.json(
        { ok: false, error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    db.prepare(
      `
      UPDATE users
      SET bloqueado = ?
      WHERE id = ? AND role = 'cliente'
      `
    ).run(bloqueado, userId);

    return NextResponse.json({
      ok: true,
      user_id: userId,
      bloqueado,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao bloquear/desbloquear cliente." },
      { status: 500 }
    );
  }
}