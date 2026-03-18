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

    const pedidos = db
      .prepare(`
        SELECT
          pp.id,
          pp.pacote,
          pp.preco_eur,
          pp.status,
          pp.created_at,
          pp.respondido_at,
          u.nome AS cliente_nome,
          u.email AS cliente_email
        FROM pergunta_pedidos pp
        LEFT JOIN users u ON u.id = pp.cliente_id
        WHERE pp.consultor_id = ?
          AND pp.status IN ('perguntas_enviadas', 'respondido')
        ORDER BY pp.created_at DESC
      `)
      .all(consultorId) as any[];

    const pedidosComPerguntas = pedidos.map((pedido) => {
      const perguntas = db
        .prepare(`
          SELECT id, pergunta, resposta, created_at, responded_at
          FROM pergunta_itens
          WHERE pedido_id = ?
          ORDER BY id ASC
        `)
        .all(pedido.id) as any[];

      return {
        id: String(pedido.id),
        pacote: Number(pedido.pacote ?? 0),
        preco_eur: Number(pedido.preco_eur ?? 0),
        status: String(pedido.status ?? ""),
        created_at: Number(pedido.created_at ?? 0),
        respondido_at: pedido.respondido_at ? Number(pedido.respondido_at) : null,
        cliente_nome: String(pedido.cliente_nome ?? "Cliente"),
        cliente_email: String(pedido.cliente_email ?? ""),
        perguntas: perguntas.map((p) => ({
          id: Number(p.id),
          pergunta: String(p.pergunta ?? ""),
          resposta: p.resposta ? String(p.resposta) : "",
          created_at: Number(p.created_at ?? 0),
          responded_at: p.responded_at ? Number(p.responded_at) : null,
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      pedidos: pedidosComPerguntas,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar pedidos." },
      { status: 500 }
    );
  }
}