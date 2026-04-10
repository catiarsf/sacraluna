import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";

type Servico = {
  id: number;
  nome: string;
  descricao: string;
  preco_tipo: "fixo" | "sob_consulta";
  preco_eur: number;
  preco_texto: string | null;
  imagem_url: string;
  ativo: number;
  consultor_id: number | null;
  consultor_nome: string | null;
};

function renderPreco(servico: Servico) {
  if (servico.preco_tipo === "sob_consulta") {
    return servico.preco_texto?.trim() || "Preço sob consulta";
  }

  return `${Number(servico.preco_eur ?? 0).toFixed(2)}€`;
}

export default function LojaPage() {
  const servicos = db
    .prepare(
      `
      SELECT
        s.id,
        s.nome,
        s.descricao,
        s.preco_tipo,
        s.preco_eur,
        s.preco_texto,
        s.imagem_url,
        s.ativo,
        s.consultor_id,
        c.nome AS consultor_nome
      FROM servicos s
      LEFT JOIN consultores c ON c.id = s.consultor_id
      WHERE s.ativo = 1
      ORDER BY s.id DESC
      `
    )
    .all() as Servico[];

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <div style={styles.kicker}>SacraLuna</div>
          <h1 style={styles.h1}>Serviços espirituais</h1>
          <p style={styles.sub}>
            Escolhe o serviço mais adequado ao que procuras. Cada trabalho está
            associado a uma consultora específica para que saibas exatamente quem
            o irá realizar.
          </p>
        </div>

        {servicos.length === 0 ? (
          <div style={styles.emptyBox}>
            <h2 style={styles.emptyTitle}>Em breve</h2>
            <p style={styles.emptyText}>Ainda não existem serviços publicados.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {servicos.map((s) => {
              const isSobConsulta = s.preco_tipo === "sob_consulta";
              const consultoraNome = s.consultor_nome?.trim() || "Consultora SacraLuna";

              return (
                <article key={s.id} style={styles.card}>
                  <div style={styles.imageWrap}>
                    <img
                      src={s.imagem_url || "/servicos/default.jpg"}
                      alt={s.nome}
                      style={styles.image}
                    />
                  </div>

                  <div style={styles.cardBody}>
                    <div
                      style={
                        isSobConsulta ? styles.priceBadgeConsult : styles.priceBadge
                      }
                    >
                      {renderPreco(s)}
                    </div>

                    <h2 style={styles.cardTitle}>{s.nome}</h2>

                    <div style={styles.consultoraBox}>
                      <span style={styles.consultoraLabel}>Será realizado por:</span>
                      <span style={styles.consultoraName}>{consultoraNome}</span>
                    </div>

                    <p style={styles.cardDesc}>
                      {s.descricao || "Sem descrição disponível."}
                    </p>

                    <div style={styles.actions}>
                      {isSobConsulta ? (
                        <>
                          {s.consultor_id ? (
                            <>
                              <Link
                                href={`/consultores/${s.consultor_id}`}
                                style={styles.secondaryBtn}
                              >
                                Ver consultora
                              </Link>

                              <Link
                                href={`/consultores/${s.consultor_id}`}
                                style={styles.buyBtn}
                              >
                                Consultar primeiro
                              </Link>
                            </>
                          ) : (
                            <span style={styles.mutedWarning}>
                              Consultora não definida
                            </span>
                          )}
                        </>
                      ) : (
                        <Link href={`/loja/${s.id}`} style={styles.buyBtn}>
                          Comprar serviço
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
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
    marginBottom: 28,
    textAlign: "center",
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
    margin: "0 0 12px",
    fontWeight: 950,
    lineHeight: 1.05,
    color: "#fff7d6",
    textShadow: "0 6px 18px rgba(0,0,0,0.28)",
  },

  sub: {
    maxWidth: 820,
    margin: "0 auto",
    lineHeight: 1.7,
    opacity: 0.9,
    fontSize: "clamp(14px, 2.5vw, 16px)",
  },

  emptyBox: {
    borderRadius: 22,
    padding: 28,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "center",
    boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
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
    gap: 20,
    justifyContent: "center",
    alignItems: "start",
  },

  card: {
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, rgba(10,10,18,0.88) 0%, rgba(22,18,10,0.82) 100%)",
    border: "1px solid rgba(212,175,55,0.18)",
    boxShadow: "0 18px 36px rgba(0,0,0,0.28)",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: 560,
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

  priceBadge: {
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(212,175,55,0.14)",
    border: "1px solid rgba(212,175,55,0.35)",
    color: "#f4d78b",
    fontWeight: 900,
    fontSize: 16,
  },

  priceBadgeConsult: {
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(140,180,255,0.12)",
    border: "1px solid rgba(140,180,255,0.35)",
    color: "#dce8ff",
    fontWeight: 900,
    fontSize: 16,
  },

  cardTitle: {
    margin: 0,
    fontSize: "clamp(22px, 4vw, 24px)",
    fontWeight: 950,
    color: "#ffffff",
    lineHeight: 1.15,
  },

  consultoraBox: {
    display: "grid",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  consultoraLabel: {
    fontSize: 12,
    opacity: 0.75,
    fontWeight: 700,
  },

  consultoraName: {
    fontSize: 15,
    fontWeight: 900,
    color: "#f4d78b",
  },

  cardDesc: {
    margin: 0,
    lineHeight: 1.7,
    opacity: 0.92,
    minHeight: 96,
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    fontSize: "clamp(14px, 2.5vw, 15px)",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-start",
    gap: 10,
    flexWrap: "wrap",
    marginTop: "auto",
    paddingTop: 6,
  },

  buyBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 18px",
    borderRadius: 14,
    textDecoration: "none",
    border: "1px solid rgba(212,175,55,0.60)",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 900,
    whiteSpace: "nowrap",
    fontSize: 15,
    boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
  },

  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 18px",
    borderRadius: 14,
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 800,
    whiteSpace: "nowrap",
    fontSize: 15,
  },

  mutedWarning: {
    opacity: 0.7,
    fontSize: 13,
  },
};