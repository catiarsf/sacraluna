export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{ ticketId: string }>;
};

export async function GET(_req: Request, ctx: Ctx) {
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

    const ticket = db
      .prepare(
        `
        SELECT
          t.id,
          t.estado,
          t.prioridade,
          t.servico_nome,
          COALESCE(s.descricao, '') AS servico_descricao,
          c.nome AS consultor_nome,
          t.preco_eur,
          t.observacoes_cliente,
          t.created_at,
          t.updated_at,
          t.entregue_at
        FROM tickets_servicos t
        LEFT JOIN servicos s ON s.id = t.servico_id
        LEFT JOIN consultores c ON c.id = t.consultor_id
        WHERE t.id = ?
          AND t.cliente_id = ?
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
          AND visibilidade = 'cliente_consultor_admin'
        ORDER BY created_at ASC, id ASC
        `
      )
      .all(ticketId) as any[];

    const anexos = db
      .prepare(
        `
        SELECT
          id,
          nome_ficheiro,
          caminho_ficheiro,
          tipo_ficheiro,
          tamanho,
          created_at
        FROM ticket_anexos
        WHERE ticket_id = ?
          AND visivel_cliente = 1
        ORDER BY created_at DESC, id DESC
        `
      )
      .all(ticketId) as any[];

    return NextResponse.json({
      ok: true,
      ticket: {
        id: String(ticket.id),
        estado: String(ticket.estado ?? ""),
        prioridade: String(ticket.prioridade ?? "normal"),
        servico_nome: String(ticket.servico_nome ?? "Serviço"),
        servico_descricao: String(ticket.servico_descricao ?? ""),
        consultor_nome: String(ticket.consultor_nome ?? "SacraLuna"),
        preco_eur: Number(ticket.preco_eur ?? 0),
        observacoes_cliente: String(ticket.observacoes_cliente ?? ""),
        created_at: Number(ticket.created_at ?? 0),
        updated_at: Number(ticket.updated_at ?? 0),
        entregue_at: ticket.entregue_at ? Number(ticket.entregue_at) : null,
      },
      mensagens: mensagens.map((m) => ({
        id: Number(m.id),
        autor_tipo: String(m.autor_tipo ?? ""),
        autor_id: m.autor_id ? Number(m.autor_id) : null,
        mensagem: String(m.mensagem ?? ""),
        visibilidade: String(m.visibilidade ?? ""),
        created_at: Number(m.created_at ?? 0),
      })),
      anexos: anexos.map((a) => ({
        id: Number(a.id),
        nome_ficheiro: String(a.nome_ficheiro ?? ""),
        caminho_ficheiro: String(a.caminho_ficheiro ?? ""),
        tipo_ficheiro: String(a.tipo_ficheiro ?? ""),
        tamanho: Number(a.tamanho ?? 0),
        created_at: Number(a.created_at ?? 0),
      })),
    });
  } catch (e: any) {
    console.error("ERRO GET /api/cliente/tickets/[ticketId]:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar pedido." },
      { status: 500 }
    );
  }
}