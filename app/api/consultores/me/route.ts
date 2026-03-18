export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Sem login." }, { status: 401 });
    }
    if (session.user.role !== "consultor") {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const consultorId = session.user.id;

    // ✅ Ganho total / saldo do consultor
    let ganho_eur = 0;
    try {
      // Ajusta isto ao teu schema se for diferente
      const row =
        db
          .prepare(
            "SELECT balance_eur AS ganho_eur FROM wallets WHERE consultor_id=?"
          )
          .get(consultorId) ?? { ganho_eur: 0 };

      ganho_eur = Number((row as any)?.ganho_eur ?? 0);
    } catch (e) {
      console.error("ERRO WALLET CONSULTOR /api/consultor/me:", e);
      ganho_eur = 0;
    }

    // ✅ Histórico das últimas consultas do consultor
    let historico: any[] = [];
    try {
      historico = db
        .prepare(
          `SELECT c.created_at as data, c.minutes as duracao_min, c.total_eur as total_eur,
                  cl.nome as cliente_nome
           FROM consultas c
           JOIN clientes cl ON cl.id = c.cliente_id
           WHERE c.consultor_id=?
           ORDER BY c.created_at DESC
           LIMIT 20`
        )
        .all(consultorId)
        .map((r: any) => ({
          data: new Date(r.data).toLocaleString("pt-PT"),
          duracao_min: Number(r.duracao_min || 0),
          total_eur: Number(r.total_eur || 0),
          cliente_nome: r.cliente_nome || "Cliente",
        }));
    } catch (e) {
      console.error("ERRO HISTORICO CONSULTOR /api/consultor/me:", e);
      historico = [];
    }

    return NextResponse.json({
      ok: true,
      ganho_eur,
      historico,
    });
  } catch (e) {
    console.error("ERRO GERAL /api/consultor/me:", e);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}