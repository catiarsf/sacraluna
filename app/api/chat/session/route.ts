import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Rota desativada. Usa /api/chat/request para iniciar o fluxo do chat.",
    },
    { status: 410 }
  );
}