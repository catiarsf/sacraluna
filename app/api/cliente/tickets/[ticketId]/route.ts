export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  try {
    const params = await ctx.params;
    const ticketId = String(params.ticketId || "").trim();

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

    const ticket = db
      .prepare(
        `
        SELECT
          ts.*,
          s.nome AS servico_nome,
          s.descricao AS servico_descricao,
          c.nome AS consultor_nome,
          c.foto_url AS consultor_foto
        FROM tickets_servicos ts
        LEFT JOIN servicos s
          ON s.id = ts.servico_id
        LEFT JOIN consultores c
          ON c.id = ts.consultor_id
        WHERE ts.id = ?
          AND ts.cliente_id = ?
        LIMIT 1
        `
      )
      .get(ticketId, clienteId) as any;

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

    const mensagens = db
      .prepare(
        `
        SELECT
          id,
          autor_tipo,
          autor_id,
          mensagem,
          visibilidade,
          created_at
        FROM ticket_mensagens
        WHERE ticket_id = ?
          AND visibilidade != 'apenas_admin'
        ORDER BY created_at ASC
        `
      )
      .all(ticketId) as any[];

    const anexos = db
      .prepare(
        `
        SELECT
          id,
          enviado_por_tipo,
          nome_ficheiro,
          caminho_ficheiro,
          tipo_ficheiro,
          tamanho,
          visivel_cliente,
          created_at
        FROM ticket_anexos
        WHERE ticket_id = ?
          AND visivel_cliente = 1
        ORDER BY created_at DESC
        `
      )
      .all(ticketId) as any[];

    return NextResponse.json({
      ok: true,
      ticket,
      mensagens,
      anexos,
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