import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const hasOnline = body?.online !== undefined;
    const hasOcupado = body?.ocupado !== undefined;

    const online = Number(body?.online ?? 0) === 1 ? 1 : 0;
    const ocupado = Number(body?.ocupado ?? 0) === 1 ? 1 : 0;

    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!consultorId) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const atual = db
      .prepare(
        `
        SELECT id, online, ocupado, ativo
        FROM consultores
        WHERE id = ?
        LIMIT 1
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

    if (!atual) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    if (Number(atual.ativo ?? 0) !== 1) {
      return NextResponse.json(
        { ok: false, error: "Consultor inativo." },
        { status: 403 }
      );
    }

    let novoOnline = Number(atual.online ?? 0);
    let novoOcupado = Number(atual.ocupado ?? 0);

    if (hasOnline) {
      novoOnline = online;
    }

    if (hasOcupado) {
      novoOcupado = ocupado;
    }

    // Regras automáticas:
    // se ficar offline -> nunca pode ficar ocupado
    if (novoOnline === 0) {
      novoOcupado = 0;
    }

    // se marcar ocupado manualmente -> tem de estar online
    if (novoOcupado === 1) {
      novoOnline = 1;
    }

    db.prepare(
      `
      UPDATE consultores
      SET
        online = ?,
        ocupado = ?,
        last_seen_at = strftime('%s','now')
      WHERE id = ?
      `
    ).run(novoOnline, novoOcupado, consultorId);

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
        online: Number(consultor?.online ?? novoOnline),
        ocupado: Number(consultor?.ocupado ?? novoOcupado),
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