export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{ ticketId: string }>;
};

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { ticketId } = await ctx.params;

    const session = await getSession();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    const clienteId = Number(user.id);

    const body = await req.json().catch(() => ({}));
    const mensagem = String(body?.mensagem ?? "").trim();

    if (!mensagem) {
      return NextResponse.json(
        { ok: false, error: "Mensagem vazia." },
        { status: 400 }
      );
    }

    const ticket = db
      .prepare(
        `
        SELECT id, cliente_id, consultor_id, servico_nome, estado
        FROM tickets_servicos
        WHERE id = ?
          AND cliente_id = ?
        LIMIT 1
        `
      )
      .get(ticketId, clienteId) as any;

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (["cancelado", "concluido"].includes(String(ticket.estado ?? ""))) {
      return NextResponse.json(
        { ok: false, error: "Este pedido já está fechado." },
        { status: 400 }
      );
    }

    db.transaction(() => {
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
        VALUES (?, 'cliente', ?, ?, 'cliente_consultor_admin', strftime('%s','now'))
        `
      ).run(ticketId, clienteId, mensagem);

      db.prepare(
        `
        UPDATE tickets_servicos
        SET updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(ticketId);

      db.prepare(
        `
        INSERT INTO notificacoes (
          utilizador_tipo,
          utilizador_id,
          titulo,
          mensagem,
          lida,
          link_interno,
          created_at
        )
        VALUES ('consultor', ?, ?, ?, 0, ?, strftime('%s','now'))
        `
      ).run(
        Number(ticket.consultor_id),
        "Nova mensagem de cliente",
        `Tens uma nova mensagem no pedido ${String(ticket.servico_nome ?? "serviço")}.`,
        `/consultor/tickets/${ticketId}`
      );
    })();

    return NextResponse.json({
      ok: true,
    });
  } catch (e: any) {
    console.error("ERRO POST /api/cliente/tickets/[ticketId]/mensagens:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao enviar mensagem." },
      { status: 500 }
    );
  }
}