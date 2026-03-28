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
          <div style={styles.kicker}>SacraLuna</div>
          <h1 style={styles.h1}>Blog espiritual</h1>
          <p style={styles.sub}>
            Conselhos, reflexões, cartas do dia e conteúdos espirituais para orientar o teu caminho
            com mais consciência e sensibilidade.
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
    padding: "28px 14px 48px",
    color: "white",
  },

  wrap: {
    maxWidth: 1200,
    margin: "0 auto",
  },

  top: {
    textAlign: "center",
    marginBottom: 28,
  },

  kicker: {
    color: "#f4d78b",
    fontWeight: 800,
    letterSpacing: 1.2,
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 10,
    opacity: 0.9,
  },

  h1: {
    fontSize: "clamp(30px, 5vw, 42px)",
    fontWeight: 950,
    margin: "0 0 12px",
    lineHeight: 1.05,
    color: "#fff7d6",
    textShadow: "0 6px 18px rgba(0,0,0,0.28)",
  },

  sub: {
    maxWidth: 760,
    margin: "0 auto",
    opacity: 0.9,
    lineHeight: 1.7,
    fontSize: "clamp(14px, 2.5vw, 16px)",
  },

  empty: {
    padding: 28,
    borderRadius: 22,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "center",
    boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(270px, 340px))",
    gap: 20,
    justifyContent: "center",
    alignItems: "start",
  },

  card: {
    borderRadius: 24,
    overflow: "hidden",
    background: "rgba(8,10,18,0.82)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 18px 36px rgba(0,0,0,0.26)",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: 500,
  },

  imageWrap: {
    width: "100%",
    height: 240,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10,10,20,0.75)",
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },

  cardBody: {
    padding: 18,
    display: "grid",
    gap: 12,
    flex: 1,
  },

  date: {
    fontSize: 12,
    opacity: 0.68,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  title: {
    margin: 0,
    fontSize: "clamp(22px, 4vw, 24px)",
    fontWeight: 900,
    lineHeight: 1.2,
    color: "#fff",
  },

  text: {
    margin: 0,
    lineHeight: 1.7,
    opacity: 0.9,
    minHeight: 96,
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    fontSize: "clamp(14px, 2.5vw, 15px)",
  },

  link: {
    marginTop: "auto",
    textDecoration: "none",
    color: "#f4d78b",
    padding: "12px 0 0",
    fontWeight: 900,
    width: "fit-content",
    fontSize: 15,
    borderBottom: "1px solid rgba(212,175,55,0.35)",
  },
};