export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => ({}));
    const pedidoId = String(body?.pedido_id ?? "").trim();

    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: "Pedido inválido." },
        { status: 400 }
      );
    }

    const pedido = db
      .prepare(
        `
        SELECT *
        FROM pergunta_pedidos
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(pedidoId) as any;

    if (!pedido) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (Number(pedido.cliente_id) !== Number(user.id)) {
      return NextResponse.json(
        { ok: false, error: "Este pedido não pertence a este cliente." },
        { status: 403 }
      );
    }

    const status = String(pedido.status ?? "");

    const podeCancelar =
      status === "aguarda_pagamento" ||
      status === "aguarda_aceitacao";

    if (!podeCancelar) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este pedido já não pode ser cancelado porque já foi aceite, está em resposta ou já foi respondido.",
        },
        { status: 400 }
      );
    }

    db.prepare(
      `
      UPDATE pergunta_pedidos
      SET status = 'cancelado_cliente'
      WHERE id = ?
      `
    ).run(pedidoId);

    return NextResponse.json({
      ok: true,
      pedido_id: pedidoId,
      status: "cancelado_cliente",
    });
  } catch (e: any) {
    console.error("ERRO /api/cliente/emails/cancelar:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao cancelar pedido." },
      { status: 500 }
    );
  }
}