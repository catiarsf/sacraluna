export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

export async function GET() {
  try {
    const posts = db
      .prepare(
        `
        SELECT
          id,
          titulo,
          slug,
          resumo,
          conteudo,
          imagem_url,
          ativo,
          created_at
        FROM blog_posts
        ORDER BY created_at DESC
        `
      )
      .all();

    return NextResponse.json({
      ok: true,
      posts,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao carregar posts." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const titulo = norm(body?.titulo);
    const resumo = norm(body?.resumo);
    const conteudo = norm(body?.conteudo);
    const imagem_url = norm(body?.imagem_url) || "/servicos/default.jpg";
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

    let slug = slugify(titulo);
    if (!slug) slug = `post-${Date.now()}`;

    let finalSlug = slug;
    let n = 2;

    while (db.prepare("SELECT id FROM blog_posts WHERE slug = ?").get(finalSlug)) {
      finalSlug = `${slug}-${n}`;
      n++;
    }

    const info = db
      .prepare(
        `
        INSERT INTO blog_posts (
          titulo,
          slug,
          resumo,
          conteudo,
          imagem_url,
          ativo
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(titulo, finalSlug, resumo, conteudo, imagem_url, ativo);

    const post = db
      .prepare(
        `
        SELECT
          id,
          titulo,
          slug,
          resumo,
          conteudo,
          imagem_url,
          ativo,
          created_at
        FROM blog_posts
        WHERE id = ?
        `
      )
      .get(info.lastInsertRowid);

    return NextResponse.json({
      ok: true,
      post,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao criar post." },
      { status: 500 }
    );
  }
}