import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const servicoId = Number(body?.servico_id ?? 0);

    if (!servicoId || servicoId <= 0) {
      return NextResponse.json(
        { ok: false, error: "servico_id inválido." },
        { status: 400 }
      );
    }

    const servico = db
      .prepare(
        `
        SELECT
          id,
          nome,
          consultor_id
        FROM servicos
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(servicoId) as any;

    if (!servico) {
      return NextResponse.json(
        { ok: false, error: "Serviço não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      servico: {
        id: Number(servico.id),
        nome: String(servico.nome ?? ""),
        consultor_id: Number(servico.consultor_id ?? 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar contexto do serviço." },
      { status: 500 }
    );
  }
}