export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Só clientes podem guardar perguntas." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const pedido_id = String(body?.pedido_id ?? "").trim();
    const perguntas = Array.isArray(body?.perguntas) ? body.perguntas : [];

    if (!pedido_id) {
      return NextResponse.json(
        { ok: false, error: "pedido_id em falta." },
        { status: 400 }
      );
    }

    const pedido = db
      .prepare(
        `
        SELECT id, cliente_id, pacote, status
        FROM pergunta_pedidos
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(pedido_id) as any;

    if (!pedido) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (Number(pedido.cliente_id) !== Number(user.id)) {
      return NextResponse.json(
        { ok: false, error: "Sem permissão para este pedido." },
        { status: 403 }
      );
    }

    if (String(pedido.status) === "respondido") {
      return NextResponse.json(
        { ok: false, error: "Este pedido já foi respondido." },
        { status: 400 }
      );
    }

    const perguntasLimpas = perguntas
      .map((p: any) => String(p ?? "").trim())
      .filter((p: string) => p.length > 0);

    if (perguntasLimpas.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Escreve pelo menos uma pergunta." },
        { status: 400 }
      );
    }

    if (perguntasLimpas.length > Number(pedido.pacote ?? 0)) {
      return NextResponse.json(
        { ok: false, error: "Número de perguntas acima do pacote comprado." },
        { status: 400 }
      );
    }

    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM pergunta_itens WHERE pedido_id = ?`).run(pedido_id);

      for (const pergunta of perguntasLimpas) {
        db.prepare(
          `
          INSERT INTO pergunta_itens (pedido_id, pergunta, resposta, created_at, responded_at)
          VALUES (?, ?, '', strftime('%s','now'), NULL)
          `
        ).run(pedido_id, pergunta);
      }

      db.prepare(
        `
        UPDATE pergunta_pedidos
        SET status = 'aguarda_resposta'
        WHERE id = ?
        `
      ).run(pedido_id);
    });

    tx();

    return NextResponse.json({
      ok: true,
      pedido_id,
      total_perguntas: perguntasLimpas.length,
    });
  } catch (e: any) {
    console.error("ERRO /api/perguntas/guardar:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}