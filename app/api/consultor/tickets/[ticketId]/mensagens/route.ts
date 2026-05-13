export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{ ticketId: string }>;
};

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { ticketId } = await ctx.params;

    const cookieStore = await cookies();

    const consultorId = Number(
      cookieStore.get("consultor_id")?.value || 0
    );

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Não autenticado.",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const mensagem = String(body?.mensagem ?? "").trim();

    if (!mensagem) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mensagem vazia.",
        },
        { status: 400 }
      );
    }

    const ticket = db
      .prepare(
        `
        SELECT id
        FROM tickets_servicos
        WHERE id = ?
          AND consultor_id = ?
        LIMIT 1
        `
      )
      .get(ticketId, consultorId) as any;

    if (!ticket) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ticket não encontrado.",
        },
        { status: 404 }
      );
    }

    const inserted = db
      .prepare(
        `
        INSERT INTO ticket_mensagens (
          ticket_id,
          autor_tipo,
          autor_id,
          mensagem,
          visibilidade,
          created_at
        )
        VALUES (
          ?,
          'consultor',
          ?,
          ?,
          'cliente_consultor_admin',
          strftime('%s','now')
        )
        `
      )
      .run(
        ticketId,
        consultorId,
        mensagem
      );

    db.prepare(
      `
      UPDATE tickets_servicos
      SET updated_at = strftime('%s','now')
      WHERE id = ?
      `
    ).run(ticketId);

    return NextResponse.json({
      ok: true,
      message_id: Number(inserted.lastInsertRowid),
    });
  } catch (e: any) {
    console.error(
      "ERRO POST /api/consultor/tickets/[ticketId]/mensagens:",
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao enviar mensagem.",
      },
      { status: 500 }
    );
  }
}