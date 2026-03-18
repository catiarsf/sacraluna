import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { sendMail } from "@/lib/email";

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

    const pedido_id = String(body?.pedido_id ?? "").trim();
    const respostas = Array.isArray(body?.respostas) ? body.respostas : [];

    if (!pedido_id || !respostas.length) {
      return NextResponse.json(
        { ok: false, error: "Dados em falta." },
        { status: 400 }
      );
    }

    const pedido = db
      .prepare(`
        SELECT
          pp.id,
          pp.consultor_id,
          pp.status,
          pp.pacote,
          u.nome AS cliente_nome,
          u.email AS cliente_email,
          c.nome AS consultor_nome
        FROM pergunta_pedidos pp
        LEFT JOIN users u ON u.id = pp.cliente_id
        LEFT JOIN consultores c ON c.id = pp.consultor_id
        WHERE pp.id = ?
        LIMIT 1
      `)
      .get(pedido_id) as any;

    if (!pedido) {
      return NextResponse.json(
        { ok: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (Number(pedido.consultor_id) !== consultorId) {
      return NextResponse.json(
        { ok: false, error: "Este pedido não pertence a este consultor." },
        { status: 403 }
      );
    }

    if (String(pedido.status) !== "perguntas_enviadas") {
      return NextResponse.json(
        { ok: false, error: "Este pedido não está disponível para resposta." },
        { status: 400 }
      );
    }

    const update = db.prepare(`
      UPDATE pergunta_itens
      SET resposta = ?, responded_at = strftime('%s','now')
      WHERE id = ? AND pedido_id = ?
    `);

    const tx = db.transaction(() => {
      for (const r of respostas) {
        const itemId = Number(r?.item_id ?? 0);
        const texto = String(r?.resposta ?? "").trim();

        if (!itemId || !texto) {
          throw new Error("Há respostas vazias.");
        }

        update.run(texto, itemId, pedido_id);
      }

      db.prepare(`
        UPDATE pergunta_pedidos
        SET
          status = 'respondido',
          respondido_at = strftime('%s','now')
        WHERE id = ?
      `).run(pedido_id);
    });

    tx();

    const itens = db
      .prepare(`
        SELECT pergunta, resposta
        FROM pergunta_itens
        WHERE pedido_id = ?
        ORDER BY id ASC
      `)
      .all(pedido_id) as any[];

    const htmlCliente = `
      <h2>A tua consulta foi respondida</h2>
      <p><b>Pedido:</b> ${pedido_id}</p>
      <p><b>Consultor:</b> ${String(pedido.consultor_nome ?? "")}</p>
      ${itens
        .map(
          (i, idx) => `
            <p><b>Pergunta ${idx + 1}:</b> ${String(i.pergunta ?? "")}</p>
            <p><b>Resposta ${idx + 1}:</b> ${String(i.resposta ?? "")}</p>
          `
        )
        .join("")}
    `;

    await sendMail(
      [String(pedido.cliente_email ?? ""), process.env.ADMIN_EMAIL || ""].filter(Boolean),
      "Resposta da tua consulta - SacraLuna",
      htmlCliente
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao guardar respostas." },
      { status: 500 }
    );
  }
}