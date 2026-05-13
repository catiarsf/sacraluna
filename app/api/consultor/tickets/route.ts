export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const tickets = db
      .prepare(
        `
        SELECT
          t.id,
          t.pedido_servico_id,
          t.cliente_nome,
          t.cliente_email,
          t.cliente_telefone,
          t.consultor_id,
          t.servico_id,
          t.servico_nome,
          t.preco_eur,
          t.estado,
          t.prioridade,
          t.dados_servico,
          t.observacoes_cliente,
          t.created_at,
          t.updated_at,
          t.entregue_at,
          t.fechado_at,
          (
            SELECT COUNT(*)
            FROM ticket_mensagens tm
            WHERE tm.ticket_id = t.id
          ) AS total_mensagens,
          (
            SELECT COUNT(*)
            FROM ticket_anexos ta
            WHERE ta.ticket_id = t.id
          ) AS total_anexos
        FROM tickets_servicos t
        WHERE t.consultor_id = ?
        ORDER BY
          CASE
            WHEN t.estado = 'pago' THEN 1
            WHEN t.estado = 'em_analise' THEN 2
            WHEN t.estado = 'em_execucao' THEN 3
            WHEN t.estado = 'entregue' THEN 4
            WHEN t.estado = 'concluido' THEN 5
            WHEN t.estado = 'cancelado' THEN 6
            ELSE 7
          END,
          t.created_at DESC
        `
      )
      .all(consultorId) as any[];

    return NextResponse.json({
      ok: true,
      tickets: tickets.map((t) => ({
        id: String(t.id),
        pedido_servico_id: String(t.pedido_servico_id ?? ""),
        cliente_nome: String(t.cliente_nome ?? "Cliente"),
        cliente_email: String(t.cliente_email ?? ""),
        cliente_telefone: String(t.cliente_telefone ?? ""),
        consultor_id: Number(t.consultor_id ?? 0),
        servico_id: Number(t.servico_id ?? 0),
        servico_nome: String(t.servico_nome ?? "Serviço"),
        preco_eur: Number(t.preco_eur ?? 0),
        estado: String(t.estado ?? ""),
        prioridade: String(t.prioridade ?? "normal"),
        dados_servico: String(t.dados_servico ?? ""),
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
    console.error("ERRO /api/consultor/tickets:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar tickets." },
      { status: 500 }
    );
  }
}