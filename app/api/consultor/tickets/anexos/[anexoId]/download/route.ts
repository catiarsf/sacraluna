export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import mime from "mime-types";
import { NextResponse } from "next/server";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{
    anexoId: string;
  }>;
};

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { anexoId } = await ctx.params;

    const anexo = db
      .prepare(
        `
        SELECT
          id,
          nome_ficheiro,
          caminho_ficheiro
        FROM ticket_anexos
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(anexoId) as any;

    if (!anexo) {
      return NextResponse.json(
        { ok: false, error: "Ficheiro não encontrado." },
        { status: 404 }
      );
    }

    const filePath = path.join(process.cwd(), anexo.caminho_ficheiro);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { ok: false, error: "Ficheiro físico não existe." },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    const mimeType =
      mime.lookup(anexo.nome_ficheiro) || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": String(mimeType),
        "Content-Disposition": `inline; filename="${anexo.nome_ficheiro}"`,
      },
    });
  } catch (e: any) {
    console.error("ERRO DOWNLOAD ANEXO:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao descarregar ficheiro.",
      },
      { status: 500 }
    );
  }
}