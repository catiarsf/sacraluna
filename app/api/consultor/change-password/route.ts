import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
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

    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Preenche a password atual e a nova." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "A nova password deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const consultor = db
      .prepare(
        `
        SELECT id, password
        FROM consultores
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(consultorId) as any;

    if (!consultor) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado." },
        { status: 404 }
      );
    }

    let passwordOk = false;

    try {
      passwordOk = await bcrypt.compare(currentPassword, String(consultor.password ?? ""));
    } catch {
      passwordOk = false;
    }

    if (!passwordOk && String(consultor.password ?? "") !== currentPassword) {
      return NextResponse.json(
        { ok: false, error: "Password atual incorreta." },
        { status: 401 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    db.prepare(
      `
      UPDATE consultores
      SET password = ?
      WHERE id = ?
      `
    ).run(newHash, consultorId);

    return NextResponse.json({
      ok: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao alterar password." },
      { status: 500 }
    );
  }
}