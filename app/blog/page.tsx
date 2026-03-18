import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";

type Post = {
  id: number;
  titulo: string;
  slug: string;
  resumo: string;
  imagem_url: string;
  created_at: number;
};

function formatDate(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("pt-PT");
}

export default function BlogPage() {
  const posts = db
    .prepare(
      `
      SELECT
        id,
        titulo,
        slug,
        resumo,
        imagem_url,
        created_at
      FROM blog_posts
      WHERE ativo = 1
      ORDER BY created_at DESC
      `
    )
    .all() as Post[];

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <h1 style={styles.h1}>Blog Espiritual</h1>
          <p style={styles.sub}>
            Conselhos, reflexões, cartas do dia e conteúdos espirituais para orientar o teu caminho.
          </p>
        </div>

        {posts.length === 0 ? (
          <div style={styles.empty}>Ainda não existem artigos publicados.</div>
        ) : (
          <div style={styles.grid}>
            {posts.map((p) => (
              <article key={p.id} style={styles.card}>
                <div style={styles.imageWrap}>
                  <img
                    src={p.imagem_url || "/servicos/default.jpg"}
                    alt={p.titulo}
                    style={styles.image}
                  />
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.date}>{formatDate(p.created_at)}</div>
                  <h2 style={styles.title}>{p.titulo}</h2>
                  <p style={styles.text}>{p.resumo || "Sem resumo disponível."}</p>

                  <Link href={`/blog/${p.slug}`} style={styles.link}>
                    Ler artigo
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px 14px 42px",
    color: "white",
  },

  wrap: {
    maxWidth: 1200,
    margin: "0 auto",
  },

  top: {
    textAlign: "center",
    marginBottom: 24,
  },

  h1: {
    fontSize: "clamp(28px, 5vw, 36px)",
    fontWeight: 900,
    marginBottom: 10,
    lineHeight: 1.1,
  },

  sub: {
    maxWidth: 760,
    margin: "0 auto",
    opacity: 0.9,
    lineHeight: 1.65,
    fontSize: "clamp(14px, 2.5vw, 16px)",
  },

  empty: {
    padding: 24,
    borderRadius: 18,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "center",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(270px, 340px))",
    gap: 18,
    justifyContent: "center",
  },

  card: {
    borderRadius: 20,
    overflow: "hidden",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(212,175,55,0.15)",
    boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
  },

  imageWrap: {
    width: "100%",
    height: 240,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10,10,20,0.75)",
    padding: 10,
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  cardBody: {
    padding: 16,
    display: "grid",
    gap: 10,
  },

  date: {
    fontSize: 12,
    opacity: 0.7,
  },

  title: {
    margin: 0,
    fontSize: "clamp(20px, 4vw, 22px)",
    fontWeight: 900,
    lineHeight: 1.2,
  },

  text: {
    lineHeight: 1.6,
    opacity: 0.9,
    minHeight: 72,
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    fontSize: "clamp(14px, 2.5vw, 15px)",
  },

  link: {
    marginTop: 6,
    textDecoration: "none",
    background:
      "linear-gradient(180deg, rgba(212,175,55,1) 0%, rgba(180,140,35,1) 100%)",
    color: "#111",
    padding: "11px 14px",
    borderRadius: 12,
    fontWeight: 900,
    width: "fit-content",
    fontSize: 15,
  },
};