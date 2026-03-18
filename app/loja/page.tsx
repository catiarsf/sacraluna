import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";

type Servico = {
  id: number;
  nome: string;
  descricao: string;
  preco_eur: number;
  imagem_url: string;
  ativo: number;
};

export default function LojaPage() {
  const servicos = db
    .prepare(
      `
      SELECT
        id,
        nome,
        descricao,
        preco_eur,
        imagem_url,
        ativo
      FROM servicos
      WHERE ativo = 1
      ORDER BY id DESC
      `
    )
    .all() as Servico[];

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <h1 style={styles.h1}>Serviços</h1>
          <p style={styles.sub}>
            Escolhe o serviço que melhor se adapta ao que procuras. Após o pagamento
            entrarei em contacto contigo para realizar o serviço.
          </p>
        </div>

        {servicos.length === 0 ? (
          <div style={styles.emptyBox}>
            <h2 style={styles.emptyTitle}>Em breve</h2>
            <p style={styles.emptyText}>Ainda não existem serviços publicados.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {servicos.map((s) => (
              <article key={s.id} style={styles.card}>
                <div style={styles.imageWrap}>
                  <img
                    src={s.imagem_url || "/servicos/default.jpg"}
                    alt={s.nome}
                    style={styles.image}
                  />
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.cardTop}>
                    <h2 style={styles.cardTitle}>{s.nome}</h2>
                    <div style={styles.price}>
                      {Number(s.preco_eur ?? 0).toFixed(2)}€
                    </div>
                  </div>

                  <p style={styles.cardDesc}>
                    {s.descricao || "Sem descrição disponível."}
                  </p>

                  <div style={styles.actions}>
                    <Link href={`/loja/${s.id}`} style={styles.buyBtn}>
                      Comprar
                    </Link>
                  </div>
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
    marginBottom: 24,
    textAlign: "center",
  },

  h1: {
    fontSize: "clamp(28px, 5vw, 36px)",
    margin: "0 0 10px",
    fontWeight: 900,
    lineHeight: 1.1,
  },

  sub: {
    maxWidth: 760,
    margin: "0 auto",
    lineHeight: 1.65,
    opacity: 0.9,
    fontSize: "clamp(14px, 2.5vw, 16px)",
  },

  emptyBox: {
    borderRadius: 18,
    padding: 24,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "center",
  },

  emptyTitle: {
    fontSize: 24,
    margin: "0 0 8px",
    color: "#f4d78b",
  },

  emptyText: {
    opacity: 0.85,
    margin: 0,
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
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(212,175,55,0.16)",
    boxShadow: "0 14px 30px rgba(0,0,0,0.24)",
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },

  imageWrap: {
    width: "100%",
    height: 240,
    background: "rgba(10,10,20,0.75)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },

  cardBody: {
    padding: 16,
    display: "grid",
    gap: 12,
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  cardTitle: {
    margin: 0,
    fontSize: "clamp(20px, 4vw, 22px)",
    fontWeight: 900,
    color: "#ffffff",
    lineHeight: 1.2,
  },

  price: {
    fontSize: "clamp(20px, 4vw, 22px)",
    fontWeight: 900,
    color: "#f4d78b",
    whiteSpace: "nowrap",
  },

  cardDesc: {
    margin: 0,
    lineHeight: 1.6,
    opacity: 0.9,
    minHeight: 72,
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    fontSize: "clamp(14px, 2.5vw, 15px)",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-start",
    marginTop: 4,
  },

  buyBtn: {
    display: "inline-block",
    padding: "12px 16px",
    borderRadius: 14,
    textDecoration: "none",
    border: "1px solid rgba(212,175,55,0.60)",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 900,
    whiteSpace: "nowrap",
    fontSize: 15,
  },
};