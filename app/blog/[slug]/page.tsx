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
    padding: "30px 16px 54px",
    color: "white",
  },

  wrap: {
    maxWidth: 920,
    margin: "0 auto",
  },

  backLink: {
    display: "inline-block",
    marginBottom: 20,
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: 0.2,
  },

  article: {
    borderRadius: 26,
    background: "rgba(8,10,18,0.84)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 18px 36px rgba(0,0,0,0.26)",
    overflow: "hidden",
    padding: 22,
  },

  meta: {
    fontSize: 12,
    opacity: 0.68,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  h1: {
    fontSize: "clamp(30px, 5vw, 46px)",
    margin: "0 0 20px",
    color: "#fff",
    lineHeight: 1.08,
    fontWeight: 950,
  },

  image: {
    width: "100%",
    maxHeight: 540,
    objectFit: "contain",
    borderRadius: 20,
    marginBottom: 22,
    display: "block",
    background: "rgba(10,10,20,0.75)",
    padding: 12,
    border: "1px solid rgba(255,255,255,0.06)",
  },

  resumo: {
    fontSize: "clamp(17px, 2.4vw, 20px)",
    lineHeight: 1.8,
    opacity: 0.94,
    margin: "0 0 22px",
    color: "#f4d78b",
    fontStyle: "italic",
  },

  contentBox: {
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    padding: 22,
  },

  conteudo: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.95,
    fontSize: "clamp(16px, 2.2vw, 18px)",
    opacity: 0.96,
  },

  notFoundBox: {
    maxWidth: 700,
    margin: "0 auto",
    textAlign: "center",
    borderRadius: 22,
    padding: 30,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 18px 36px rgba(0,0,0,0.22)",
  },

  notFoundTitle: {
    margin: "0 0 16px",
    color: "#f4d78b",
    fontSize: 28,
  },

  backBtn: {
    display: "inline-block",
    padding: "11px 16px",
    borderRadius: 14,
    textDecoration: "none",
    color: "#111",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    fontWeight: 900,
    border: "1px solid rgba(212,175,55,0.60)",
  },
};