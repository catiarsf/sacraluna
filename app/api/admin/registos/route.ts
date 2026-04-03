import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const clientes = db
      .prepare(
        `
        SELECT
          id,
          nome,
          email,
          telefone,
          created_at
        FROM users
        WHERE role = 'cliente'
        ORDER BY created_at DESC
        `
      )
      .all();

    return NextResponse.json({
      ok: true,
      clientes,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao carregar clientes.",
      },
      { status: 500 }
    );
  }
}