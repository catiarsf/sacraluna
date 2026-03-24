export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const contactos = db
      .prepare(
        `
        SELECT
          id,
          nome,
          email,
          telefone,
          assunto,
          mensagem,
          status,
          created_at,
          responded_at
        FROM contactos
        ORDER BY created_at DESC
        `
      )
      .all();

    return NextResponse.json({ ok: true, contactos });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor." },
      { status: 500 }
    );
  }
}