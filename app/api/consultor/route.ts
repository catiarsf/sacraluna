export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // ⚠️ TEMPORÁRIO PARA TESTE
    // estamos a forçar consultorId = 1
    return NextResponse.json({
      ok: true,
      consultorId: 1,
      nome: "Consultor Teste",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}