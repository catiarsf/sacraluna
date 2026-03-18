import { NextResponse } from "next/server";
import db from "@/lib/db";

type ConsultorPacks = {
  pack_1_preco: number;
  pack_3_preco: number;
  pack_5_preco: number;
  pack_10_preco: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const consultor_id = Number(body.consultor_id);
    const pacote = Number(body.pacote);

    const consultor = db
      .prepare(`
        SELECT
          pack_1_preco,
          pack_3_preco,
          pack_5_preco,
          pack_10_preco
        FROM consultores
        WHERE id = ?
      `)
      .get(consultor_id) as ConsultorPacks | undefined;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado" },
        { status: 404 }
      );
    }

    let preco = 0;

    if (pacote === 1) preco = Number(consultor.pack_1_preco ?? 0);
    if (pacote === 3) preco = Number(consultor.pack_3_preco ?? 0);
    if (pacote === 5) preco = Number(consultor.pack_5_preco ?? 0);
    if (pacote === 10) preco = Number(consultor.pack_10_preco ?? 0);

    if (preco <= 0) {
      return NextResponse.json(
        { ok: false, error: "Pacote inválido ou sem preço definido." },
        { status: 400 }
      );
    }

    const pedido_id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO pergunta_pedidos
      (id, consultor_id, pacote, preco_eur)
      VALUES (?,?,?,?)
    `).run(pedido_id, consultor_id, pacote, preco);

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