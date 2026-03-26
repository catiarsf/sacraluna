import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const foto_url = String(body?.foto_url ?? "").trim();
    const apresentacao = String(body?.apresentacao ?? "").trim();
    const especialidades = String(body?.especialidades ?? "").trim();

    db.prepare(
      `
      UPDATE consultores
      SET
        foto_url = ?,
        apresentacao = ?,
        especialidades = ?
      WHERE id = ?
      `
    ).run(foto_url, apresentacao, especialidades, consultorId);

    return NextResponse.json({
      ok: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao guardar perfil." },
      { status: 500 }
    );
  }
}