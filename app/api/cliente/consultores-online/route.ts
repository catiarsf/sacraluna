export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const consultores = db.prepare(`
      SELECT
        id,
        nome,
        foto,
        especialidades,
        preco_chat,
        preco_voz,
        online,
        ocupado
      FROM consultores
      WHERE ativo = 1
        AND online = 1
      ORDER BY nome ASC
    `).all();

    return NextResponse.json({
      ok: true,
      consultores,
    });

  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro interno",
      },
      {
        status: 500,
      }
    );
  }
}