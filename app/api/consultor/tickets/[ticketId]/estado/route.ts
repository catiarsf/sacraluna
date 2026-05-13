export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{ ticketId: string }>;
};

const ESTADOS_VALIDOS = [
  "pago",
  "em_analise",
  "em_execucao",
  "entregue",
  "concluido",
  "cancelado",
  "reaberto",
];

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

    const estado = String(body?.estado ?? "").trim();

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Estado inválido.",
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

    db.transaction(() => {
      db.prepare(
        `
        UPDATE tickets_servicos
        SET
          estado = ?,
          updated_at = strftime('%s','now'),
          entregue_at = CASE
            WHEN ? = 'entregue'
            THEN COALESCE(entregue_at, strftime('%s','now'))
            ELSE entregue_at
          END,
          fechado_at = CASE
            WHEN ? = 'concluido'
            THEN COALESCE(fechado_at, strftime('%s','now'))
            ELSE fechado_at
          END
        WHERE id = ?
          AND consultor_id = ?
        `
      ).run(
        estado,
        estado,
        estado,
        ticketId,
        consultorId
      );

      db.prepare(
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
          'sistema',
          NULL,
          ?,
          'cliente_consultor_admin',
          strftime('%s','now')
        )
        `
      ).run(
        ticketId,
        `Estado alterado para: ${estado}.`
      );
    })();

    return NextResponse.json({
      ok: true,
      estado,
      ticket_id: ticketId,
    });
  } catch (e: any) {
    console.error(
      "ERRO POST /api/consultor/tickets/[ticketId]/estado:",
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao alterar estado.",
      },
      { status: 500 }
    );
  }
}