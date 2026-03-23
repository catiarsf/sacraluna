import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const online = Number(body?.online ?? 0) === 1 ? 1 : 0;

    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!consultorId) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    db.prepare(
      `
      UPDATE consultores
      SET
        online = ?,
        ocupado = CASE WHEN ? = 0 THEN 0 ELSE ocupado END,
        last_seen_at = strftime('%s','now')
      WHERE id = ?
      `
    ).run(online, online, consultorId);

    const consultor = db
      .prepare(
        `
        SELECT id, online, ocupado, ativo
        FROM consultores
        WHERE id = ?
        `
      )
      .get(consultorId) as
      | {
          id: number;
          online: number;
          ocupado: number;
          ativo: number;
        }
      | undefined;

    return NextResponse.json({
      ok: true,
      consultor: {
        id: Number(consultor?.id ?? consultorId),
        online: Number(consultor?.online ?? online),
        ocupado: Number(consultor?.ocupado ?? 0),
        ativo: Number(consultor?.ativo ?? 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao atualizar estado." },
      { status: 500 }
    );
  }
}