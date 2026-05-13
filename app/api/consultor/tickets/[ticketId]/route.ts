export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{ ticketId: string }>;
};

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { ticketId } = await ctx.params;

    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const ticket = db
      .prepare(
        `
        SELECT
          t.id,
          t.estado,
          t.prioridade,
          t.cliente_nome,
          t.cliente_email,
          t.cliente_telefone,
          t.servico_nome,
          COALESCE(s.descricao, '') AS servico_descricao,
          t.preco_eur,
          t.observacoes_cliente,
          t.observacoes_internas,
          t.created_at,
          t.updated_at,
          t.entregue_at,
          t.fechado_at
        FROM tickets_servicos t
        LEFT JOIN servicos s ON s.id = t.servico_id
        WHERE t.id = ?
          AND t.consultor_id = ?
        LIMIT 1
        `
      )
      .get(ticketId, consultorId) as any;

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket não encontrado." },
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
          AND visibilidade IN ('cliente_consultor_admin', 'consultor_admin')
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
          visivel_cliente,
          created_at
        FROM ticket_anexos
        WHERE ticket_id = ?
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

        cliente_nome: String(ticket.cliente_nome ?? ""),
        cliente_email: String(ticket.cliente_email ?? ""),
        cliente_telefone: String(ticket.cliente_telefone ?? ""),

        servico_nome: String(ticket.servico_nome ?? "Serviço"),
        servico_descricao: String(ticket.servico_descricao ?? ""),

        preco_eur: Number(ticket.preco_eur ?? 0),

        observacoes_cliente: String(ticket.observacoes_cliente ?? ""),
        observacoes_internas: String(ticket.observacoes_internas ?? ""),

        created_at: Number(ticket.created_at ?? 0),
        updated_at: Number(ticket.updated_at ?? 0),

        entregue_at: ticket.entregue_at
          ? Number(ticket.entregue_at)
          : null,

        fechado_at: ticket.fechado_at
          ? Number(ticket.fechado_at)
          : null,
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
        visivel_cliente: Number(a.visivel_cliente ?? 0),
        created_at: Number(a.created_at ?? 0),
      })),
    });
  } catch (e: any) {
    console.error(
      "ERRO GET /api/consultor/tickets/[ticketId]:",
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao carregar ticket.",
      },
      { status: 500 }
    );
  }
}