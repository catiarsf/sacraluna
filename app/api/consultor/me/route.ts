export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT
          id,
          nome,
          email,
          preco_por_min AS valor_min_eur,
          foto_url,
          especialidades,
          apresentacao,
          ativo,
          online,
          ocupado
        FROM consultores
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    const activeSession = db
      .prepare(
        `
        SELECT id
        FROM chat_sessions
        WHERE consultor_id = ?
          AND status = 'active'
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    let ocupadoFinal = Number(consultor.ocupado ?? 0);

    if (ocupadoFinal === 1 && !activeSession) {
      db.prepare(
        `
        UPDATE consultores
        SET ocupado = 0,
            online = 1,
            last_seen_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(consultorId);

      ocupadoFinal = 0;
    }

    return NextResponse.json({
      ok: true,
      consultor: {
        id: Number(consultor.id),
        nome: String(consultor.nome ?? ""),
        email: String(consultor.email ?? ""),
        valor_min_eur: Number(consultor.valor_min_eur ?? 0),
        foto_url: String(consultor.foto_url ?? ""),
        especialidades: String(consultor.especialidades ?? ""),
        apresentacao: String(consultor.apresentacao ?? ""),
        ativo: Number(consultor.ativo ?? 0),
        online: Number(consultor.online ?? 0),
        ocupado: ocupadoFinal,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}