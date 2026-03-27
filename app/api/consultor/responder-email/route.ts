export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const pedidoId = String(body?.pedido_id ?? "").trim();
    const itens = Array.isArray(body?.itens) ? body.itens : [];

    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: "Pedido inválido." },
        { status: 400 }
      );
    }

    if (!itens.length) {
      return NextResponse.json(
        { ok: false, error: "Não foram enviadas respostas." },
        { status: 400 }
      );
    }

    const pedido = db
      .prepare(
        `
        SELECT id, consultor_id
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

    if (Number(pedido.consultor_id) !== consultorId) {
      return NextResponse.json(
        { ok: false, error: "Sem permissão." },
        { status: 403 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    const tx = db.transaction(() => {
      for (const item of itens) {
        const itemId = Number(item?.id);
        const resposta = String(item?.resposta ?? "").trim();

        if (!Number.isFinite(itemId) || itemId <= 0) continue;

        db.prepare(
          `
          UPDATE pergunta_itens
          SET
            resposta = ?,
            responded_at = CASE
              WHEN trim(?) <> '' THEN ?
              ELSE responded_at
            END
          WHERE id = ?
            AND pedido_id = ?
          `
        ).run(
          resposta,
          resposta,
          now,
          itemId,
          pedidoId
        );
      }

      const faltaResponder = db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM pergunta_itens
          WHERE pedido_id = ?
            AND (resposta IS NULL OR trim(resposta) = '')
          `
        )
        .get(pedidoId) as any;

      const tudoRespondido = Number(faltaResponder?.total ?? 0) === 0;

      db.prepare(
        `
        UPDATE pergunta_pedidos
        SET
          status = ?,
          respondido_at = CASE
            WHEN ? = 1 THEN ?
            ELSE respondido_at
          END
        WHERE id = ?
        `
      ).run(
        tudoRespondido ? "respondido" : "em_resposta",
        tudoRespondido ? 1 : 0,
        now,
        pedidoId
      );
    });

    tx();

    return NextResponse.json({
      ok: true,
      pedido_id: pedidoId,
      status: "guardado",
    });
  } catch (e: any) {
    console.error("ERRO /api/consultor/responder-email:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}