export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  try {
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

    const tickets = db
      .prepare(
        `
        SELECT
          t.id,
          t.pedido_servico_id,
          t.cliente_id,
          t.consultor_id,
          t.servico_id,
          t.servico_nome,
          t.preco_eur,
          t.estado,
          t.prioridade,
          t.observacoes_cliente,
          t.created_at,
          t.updated_at,
          t.entregue_at,
          t.fechado_at,
          c.nome AS consultor_nome,
          (
            SELECT COUNT(*)
            FROM ticket_mensagens tm
            WHERE tm.ticket_id = t.id
              AND tm.visibilidade = 'cliente_consultor_admin'
          ) AS total_mensagens,
          (
            SELECT COUNT(*)
            FROM ticket_anexos ta
            WHERE ta.ticket_id = t.id
              AND ta.visivel_cliente = 1
          ) AS total_anexos
        FROM tickets_servicos t
        LEFT JOIN consultores c ON c.id = t.consultor_id
        WHERE t.cliente_id = ?
        ORDER BY t.created_at DESC
        `
      )
      .all(clienteId) as any[];

    return NextResponse.json({
      ok: true,
      tickets: tickets.map((t) => ({
        id: String(t.id),
        pedido_servico_id: String(t.pedido_servico_id ?? ""),
        cliente_id: Number(t.cliente_id ?? 0),
        consultor_id: Number(t.consultor_id ?? 0),
        consultor_nome: String(t.consultor_nome ?? "Consultora SacraLuna"),
        servico_id: Number(t.servico_id ?? 0),
        servico_nome: String(t.servico_nome ?? "Serviço"),
        preco_eur: Number(t.preco_eur ?? 0),
        estado: String(t.estado ?? ""),
        prioridade: String(t.prioridade ?? "normal"),
        observacoes_cliente: String(t.observacoes_cliente ?? ""),
        created_at: Number(t.created_at ?? 0),
        updated_at: Number(t.updated_at ?? 0),
        entregue_at: Number(t.entregue_at ?? 0),
        fechado_at: Number(t.fechado_at ?? 0),
        total_mensagens: Number(t.total_mensagens ?? 0),
        total_anexos: Number(t.total_anexos ?? 0),
      })),
    });
  } catch (e: any) {
    console.error("ERRO /api/cliente/tickets:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar serviços do cliente." },
      { status: 500 }
    );
  }
}