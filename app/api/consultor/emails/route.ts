export const dynamic = "force-dynamic";

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
      .prepare(
        `
        SELECT
          p.id,
          p.pacote,
          p.preco_eur,
          p.status,
          p.created_at,
          p.respondido_at,
          u.nome AS cliente_nome,
          u.email AS cliente_email
        FROM pergunta_pedidos p
        LEFT JOIN users u ON u.id = p.cliente_id
        WHERE p.consultor_id = ?
          AND p.stripe_payment_id IS NOT NULL
          AND p.status IN ('aguarda_aceitacao', 'aguarda_resposta', 'em_resposta', 'respondido')
        ORDER BY 
          CASE 
            WHEN p.status = 'aguarda_aceitacao' THEN 1
            WHEN p.status = 'aguarda_resposta' THEN 2
            WHEN p.status = 'em_resposta' THEN 3
            WHEN p.status = 'respondido' THEN 4
            ELSE 5
          END,
          p.created_at DESC
        `
      )
      .all(consultorId) as any[];

    const pedidosComItens = pedidos.map((pedido) => {
      const itens = db
        .prepare(
          `
          SELECT
            id,
            pergunta,
            resposta,
            created_at,
            responded_at
          FROM pergunta_itens
          WHERE pedido_id = ?
          ORDER BY created_at ASC
          `
        )
        .all(pedido.id) as any[];

      return {
        id: String(pedido.id),
        cliente_nome: String(pedido.cliente_nome ?? "Cliente"),
        cliente_email: String(pedido.cliente_email ?? ""),
        pacote: Number(pedido.pacote ?? 0),
        preco_eur: Number(pedido.preco_eur ?? 0),
        status: String(pedido.status ?? ""),
        created_at: Number(pedido.created_at ?? 0),
        respondido_at: Number(pedido.respondido_at ?? 0),
        itens: itens.map((it) => ({
          id: Number(it.id),
          pergunta: String(it.pergunta ?? ""),
          resposta: String(it.resposta ?? ""),
          created_at: Number(it.created_at ?? 0),
          responded_at: Number(it.responded_at ?? 0),
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      pedidos: pedidosComItens,
    });
  } catch (e: any) {
    console.error("ERRO /api/consultor/emails:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}