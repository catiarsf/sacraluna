export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{ ticketId: string }>;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function safeName(name: string) {
  return String(name || "ficheiro")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

function getUploadBasePath() {
  const basePath =
    process.env.SQLITE_DIR ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    (process.env.NODE_ENV === "production" ? "/data" : process.cwd());

  const uploadPath = path.join(basePath, "uploads", "entregas");

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  return uploadPath;
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { ticketId } = await ctx.params;

    const cookieStore = await cookies();
    const consultorId = Number(cookieStore.get("consultor_id")?.value || 0);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const ticket = db
      .prepare(
        `
        SELECT id, consultor_id, cliente_id, servico_nome
        FROM tickets_servicos
        WHERE id = ?
          AND consultor_id = ?
        LIMIT 1
        `
      )
      .get(ticketId, consultorId) as any;

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket não encontrado." },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Nenhum ficheiro enviado." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "O ficheiro é demasiado grande. Máximo: 15MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de ficheiro não permitido." },
        { status: 400 }
      );
    }

    const originalName = safeName(file.name);
    const ext = path.extname(originalName);
    const finalName = `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}${ext || ""}`;

    const ticketDir = path.join(getUploadBasePath(), ticketId);

    if (!fs.existsSync(ticketDir)) {
      fs.mkdirSync(ticketDir, { recursive: true });
    }

    const absolutePath = path.join(ticketDir, finalName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    fs.writeFileSync(absolutePath, buffer);

    const inserted = db
      .prepare(
        `
        INSERT INTO ticket_anexos (
          ticket_id,
          enviado_por_tipo,
          enviado_por_id,
          nome_ficheiro,
          caminho_ficheiro,
          tipo_ficheiro,
          tamanho,
          visivel_cliente,
          created_at
        )
        VALUES (?, 'consultor', ?, ?, '', ?, ?, 1, strftime('%s','now'))
        `
      )
      .run(
        ticketId,
        consultorId,
        originalName,
        file.type,
        file.size
      );

    const anexoId = Number(inserted.lastInsertRowid);
    const downloadPath = `/api/tickets/anexos/${anexoId}/download`;

    db.prepare(
      `
      UPDATE ticket_anexos
      SET caminho_ficheiro = ?
      WHERE id = ?
      `
    ).run(downloadPath, anexoId);

    db.transaction(() => {
      db.prepare(
        `
        UPDATE tickets_servicos
        SET
          estado = 'entregue',
          entregue_at = COALESCE(entregue_at, strftime('%s','now')),
          updated_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(ticketId);

      db.prepare(
        `
        INSERT INTO ticket_mensagens (
          ticket_id,
          autor_tipo,
          autor_id,
          mensagem,
          visibilidade,
          created_at
        )
        VALUES (?, 'sistema', NULL, ?, 'cliente_consultor_admin', strftime('%s','now'))
        `
      ).run(ticketId, `Ficheiro entregue: ${originalName}`);

      if (ticket.cliente_id) {
        db.prepare(
          `
          INSERT INTO notificacoes (
            utilizador_tipo,
            utilizador_id,
            titulo,
            mensagem,
            lida,
            link_interno,
            created_at
          )
          VALUES ('cliente', ?, 'Serviço entregue', ?, 0, ?, strftime('%s','now'))
          `
        ).run(
          Number(ticket.cliente_id),
          `O teu serviço ${String(ticket.servico_nome ?? "serviço")} já foi entregue.`,
          `/cliente/tickets/${ticketId}`
        );
      }
    })();

    return NextResponse.json({
      ok: true,
      anexo_id: anexoId,
      nome_ficheiro: originalName,
      download_url: downloadPath,
    });
  } catch (e: any) {
    console.error("ERRO UPLOAD TICKET:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao enviar ficheiro." },
      { status: 500 }
    );
  }
}