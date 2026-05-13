export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{
    anexoId: string;
  }>;
};

function getMimeType(filename: string) {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "application/octet-stream";
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { anexoId } = await ctx.params;
    const id = Number(anexoId);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { ok: false, error: "Anexo inválido." },
        { status: 400 }
      );
    }

    const anexo = db
      .prepare(
        `
        SELECT
          id,
          ticket_id,
          nome_ficheiro,
          caminho_ficheiro,
          tipo_ficheiro
        FROM ticket_anexos
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(id) as any;

    if (!anexo) {
      return NextResponse.json(
        { ok: false, error: "Ficheiro não encontrado." },
        { status: 404 }
      );
    }

    const basePath =
      process.env.SQLITE_DIR ||
      process.env.RAILWAY_VOLUME_MOUNT_PATH ||
      (process.env.NODE_ENV === "production" ? "/data" : process.cwd());

    const ticketDir = path.join(
      basePath,
      "uploads",
      "entregas",
      String(anexo.ticket_id)
    );

    if (!fs.existsSync(ticketDir)) {
      return NextResponse.json(
        { ok: false, error: "Pasta do ficheiro não encontrada." },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(ticketDir);

    const foundFile = files.find((file) => {
      const extOriginal = path.extname(String(anexo.nome_ficheiro)).toLowerCase();
      return file.toLowerCase().endsWith(extOriginal);
    });

    if (!foundFile) {
      return NextResponse.json(
        { ok: false, error: "Ficheiro físico não encontrado." },
        { status: 404 }
      );
    }

    const absolutePath = path.join(ticketDir, foundFile);

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { ok: false, error: "Ficheiro inexistente." },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const mimeType = anexo.tipo_ficheiro || getMimeType(anexo.nome_ficheiro);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": String(mimeType),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          String(anexo.nome_ficheiro || "ficheiro")
        )}"`,
      },
    });
  } catch (e: any) {
    console.error("ERRO DOWNLOAD ANEXO:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao descarregar ficheiro." },
      { status: 500 }
    );
  }
}