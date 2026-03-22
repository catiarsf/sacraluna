import { NextResponse } from "next/server";
import db from "@/lib/db";

type ConsultorPacks = {
  pack_1_qtd: number;
  pack_1_preco: number;
  pack_2_qtd: number;
  pack_2_preco: number;
  pack_3_qtd: number;
  pack_3_preco: number;
  pack_4_qtd: number;
  pack_4_preco: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const consultor_id = Number(body.consultor_id);
    const pacote = Number(body.pacote);

    if (!consultor_id || consultor_id <= 0) {
      return NextResponse.json(
        { ok: false, error: "consultor_id inválido." },
        { status: 400 }
      );
    }

    if (!pacote || pacote <= 0) {
      return NextResponse.json(
        { ok: false, error: "Pacote inválido." },
        { status: 400 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT
          pack_1_qtd,
          pack_1_preco,
          pack_2_qtd,
          pack_2_preco,
          pack_3_qtd,
          pack_3_preco,
          pack_4_qtd,
          pack_4_preco
        FROM consultores
        WHERE id = ?
        `
      )
      .get(consultor_id) as ConsultorPacks | undefined;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    let preco = 0;

    if (pacote === Number(consultor.pack_1_qtd ?? 0)) {
      preco = Number(consultor.pack_1_preco ?? 0);
    } else if (pacote === Number(consultor.pack_2_qtd ?? 0)) {
      preco = Number(consultor.pack_2_preco ?? 0);
    } else if (pacote === Number(consultor.pack_3_qtd ?? 0)) {
      preco = Number(consultor.pack_3_preco ?? 0);
    } else if (pacote === Number(consultor.pack_4_qtd ?? 0)) {
      preco = Number(consultor.pack_4_preco ?? 0);
    }

    if (preco <= 0) {
      return NextResponse.json(
        { ok: false, error: "Pacote inválido ou sem preço definido." },
        { status: 400 }
      );
    }

    const pedido_id = crypto.randomUUID();

    db.prepare(
      `
      INSERT INTO pergunta_pedidos
      (id, consultor_id, pacote, preco_eur)
      VALUES (?, ?, ?, ?)
      `
    ).run(pedido_id, consultor_id, pacote, preco);

    return NextResponse.json({
      ok: true,
      pedido_id,
      preco,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor" },
      { status: 500 }
    );
  }
}