export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function norm(v: any) {
  return String(v ?? "").trim();
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const post = db
      .prepare(`SELECT * FROM blog_posts WHERE id = ? LIMIT 1`)
      .get(id);

    if (!post) {
      return NextResponse.json(
        { ok: false, error: "Post não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, post });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar post." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const titulo = norm(body?.titulo);
    const resumo = norm(body?.resumo);
    const conteudo = norm(body?.conteudo);
    const imagem_url = norm(body?.imagem_url);
    const ativo = body?.ativo ? 1 : 0;

    if (!titulo) {
      return NextResponse.json(
        { ok: false, error: "O título é obrigatório." },
        { status: 400 }
      );
    }

    if (!conteudo) {
      return NextResponse.json(
        { ok: false, error: "O conteúdo é obrigatório." },
        { status: 400 }
      );
    }

    const existing = db
      .prepare(`SELECT * FROM blog_posts WHERE id = ? LIMIT 1`)
      .get(id) as any;

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Post não encontrado." },
        { status: 404 }
      );
    }

    let slug = slugify(titulo);
    if (!slug) slug = `post-${Date.now()}`;

    let finalSlug = slug;
    let n = 2;

    while (
      db
        .prepare(`SELECT id FROM blog_posts WHERE slug = ? AND id <> ? LIMIT 1`)
        .get(finalSlug, id)
    ) {
      finalSlug = `${slug}-${n}`;
      n++;
    }

    db.prepare(
      `
      UPDATE blog_posts
      SET titulo = ?,
          slug = ?,
          resumo = ?,
          conteudo = ?,
          imagem_url = ?,
          ativo = ?
      WHERE id = ?
      `
    ).run(
      titulo,
      finalSlug,
      resumo,
      conteudo,
      imagem_url || existing.imagem_url || "/servicos/default.jpg",
      ativo,
      id
    );

    const post = db
      .prepare(`SELECT * FROM blog_posts WHERE id = ? LIMIT 1`)
      .get(id);

    return NextResponse.json({ ok: true, post });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao atualizar post." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    db.prepare(`DELETE FROM blog_posts WHERE id = ?`).run(id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao apagar post." },
      { status: 500 }
    );
  }
}