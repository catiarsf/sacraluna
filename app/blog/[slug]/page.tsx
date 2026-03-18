import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";

type Ctx = {
  params: Promise<{ slug: string }>;
};

function formatDate(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function BlogPostPage(ctx: Ctx) {
  const { slug } = await ctx.params;

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
        created_at
      FROM blog_posts
      WHERE slug = ? AND ativo = 1
      LIMIT 1
      `
    )
    .get(slug) as any;

  if (!post) {
    return (
      <main style={styles.page}>
        <div style={styles.notFoundBox}>
          <h1 style={styles.notFoundTitle}>Artigo não encontrado</h1>
          <Link href="/blog" style={styles.backBtn}>
            Voltar ao blog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <Link href="/blog" style={styles.backLink}>
          ← Voltar ao blog
        </Link>

        <article style={styles.article}>
          <div style={styles.meta}>{formatDate(post.created_at)}</div>

          <h1 style={styles.h1}>{post.titulo}</h1>

          <img
            src={post.imagem_url || "/servicos/default.jpg"}
            alt={post.titulo}
            style={styles.image}
          />

          {post.resumo ? <p style={styles.resumo}>{post.resumo}</p> : null}

          <div style={styles.contentBox}>
            <div style={styles.conteudo}>{post.conteudo}</div>
          </div>
        </article>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px 16px 48px",
    color: "white",
  },

  wrap: {
    maxWidth: 900,
    margin: "0 auto",
  },

  backLink: {
    display: "inline-block",
    marginBottom: 18,
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 800,
  },

  article: {
    borderRadius: 22,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(212,175,55,0.16)",
    boxShadow: "0 14px 30px rgba(0,0,0,0.24)",
    overflow: "hidden",
    padding: 18,
  },

  meta: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 10,
  },

  h1: {
    fontSize: 38,
    margin: "0 0 18px",
    color: "#ffffff",
    lineHeight: 1.15,
    fontWeight: 900,
  },

  image: {
    width: "100%",
    maxHeight: 520,
    objectFit: "contain",
    borderRadius: 18,
    marginBottom: 20,
    display: "block",
    background: "rgba(10,10,20,0.75)",
    padding: 10,
  },

  resumo: {
    fontSize: 18,
    lineHeight: 1.7,
    opacity: 0.92,
    marginBottom: 20,
    color: "#f4d78b",
  },

  contentBox: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    padding: 18,
  },

  conteudo: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.9,
    fontSize: 17,
    opacity: 0.95,
  },

  notFoundBox: {
    maxWidth: 700,
    margin: "0 auto",
    textAlign: "center",
    borderRadius: 20,
    padding: 28,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  notFoundTitle: {
    margin: "0 0 16px",
    color: "#f4d78b",
  },

  backBtn: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 12,
    textDecoration: "none",
    color: "#111",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    fontWeight: 900,
    border: "1px solid rgba(212,175,55,0.60)",
  },
};