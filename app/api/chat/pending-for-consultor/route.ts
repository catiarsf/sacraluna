export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!consultorId) {
      return NextResponse.json(
        { ok: false, error: "Consultor não autenticado." },
        { status: 401 }
      );
    }

    const row = db
      .prepare(
        `
        SELECT
          id,
          cliente_id,
          consultor_id,
          cliente_nome,
          status,
          price_per_min,
          created_at
        FROM chat_sessions
        WHERE consultor_id = ?
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    if (!row) {
      return NextResponse.json({
        ok: true,
        pending: null,
      });
    }

    return NextResponse.json({
      ok: true,
      pending: {
        id: String(row.id),
        cliente_id: Number(row.cliente_id),
        consultor_id: Number(row.consultor_id),
        cliente_nome: String(row.cliente_nome ?? "Cliente"),
        status: String(row.status ?? "pending"),
        price_per_min: Number(row.price_per_min ?? 0),
        created_at: Number(row.created_at ?? 0),
      },
    });
  } catch (e: any) {
    console.error("ERRO /api/chat/pending-for-consultor:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar pedido pendente." },
      { status: 500 }
    );
  }
}