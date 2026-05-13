export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

function norm(v: any) {
  return String(v ?? "").trim();
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  try {
    const params = await ctx.params;
    const ticketId = norm(params.ticketId);

    const cookieStore = await cookies();

    const clienteId = Number(
      cookieStore.get("cliente_id")?.value || 0
    );

    if (!clienteId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    const body = await req.json().catch(() => ({}));

    const mensagem = norm(body?.mensagem);

    if (!mensagem) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mensagem vazia.",
        },
        {
          status: 400,
        }
      );
    }

    const ticket = db
      .prepare(
        `
        SELECT
          id,
          cliente_id,
          estado
        FROM tickets_servicos
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(ticketId) as any;

    if (!ticket) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ticket não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (Number(ticket.cliente_id) !== clienteId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sem permissão.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      [
        "cancelado",
        "concluido",
      ].includes(String(ticket.estado))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Este ticket está fechado.",
        },
        {
          status: 400,
        }
      );
    }

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
        'cliente',
        ?,
        ?,
        'cliente_consultor_admin',
        strftime('%s','now')
      )
      `
    ).run(
      ticketId,
      clienteId,
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
    });
  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro interno.",
      },
      {
        status: 500,
      }
    );
  }
}