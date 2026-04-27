export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const sessoes = db.prepare(`
      SELECT
        cs.id,
        cs.cliente_id,
        cs.consultor_id,
        cs.cliente_nome,
        cs.status,
        cs.price_per_min,
        cs.started_at,
        cs.ended_at,
        cs.billed_seconds,
        cs.total_charged_eur,
        cs.consultor_earned_eur,
        cs.created_at,
        u.nome AS cliente_nome_user,
        u.email AS cliente_email,
        c.nome AS consultor_nome
      FROM chat_sessions cs
      LEFT JOIN users u ON u.id = cs.cliente_id
      LEFT JOIN consultores c ON c.id = cs.consultor_id
      ORDER BY cs.created_at DESC
      LIMIT 200
    `).all() as any[];

    const consultas = sessoes.map((s) => {
      const mensagens = db.prepare(`
        SELECT
          id,
          sender_role,
          text,
          sent_at
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY sent_at ASC, id ASC
      `).all(s.id) as any[];

      return {
        id: String(s.id),
        cliente_id: Number(s.cliente_id ?? 0),
        consultor_id: Number(s.consultor_id ?? 0),
        cliente_nome: String(s.cliente_nome_user || s.cliente_nome || "Cliente"),
        cliente_email: String(s.cliente_email || ""),
        consultor_nome: String(s.consultor_nome || "Consultor"),
        status: String(s.status || ""),
        price_per_min: Number(s.price_per_min ?? 0),
        started_at: Number(s.started_at ?? 0),
        ended_at: Number(s.ended_at ?? 0),
        billed_seconds: Number(s.billed_seconds ?? 0),
        total_charged_eur: Number(s.total_charged_eur ?? 0),
        consultor_earned_eur: Number(s.consultor_earned_eur ?? 0),
        created_at: Number(s.created_at ?? 0),
        mensagens: mensagens.map((m) => ({
          id: Number(m.id),
          sender_role: String(m.sender_role || ""),
          text: String(m.text || ""),
          sent_at: Number(m.sent_at ?? 0),
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      consultas,
    });
  } catch (e: any) {
    console.error("ERRO /api/admin/consultas:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar consultas." },
      { status: 500 }
    );
  }
}