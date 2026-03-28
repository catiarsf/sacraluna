import Link from "next/link";
import React from "react";

export default function QuemSomosPage() {
  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.heroCard}>
          <div style={styles.kicker}>A essência da plataforma</div>
          <h1 style={styles.h1}>Quem somos</h1>
          <p style={styles.lead}>
            A SacraLuna é uma plataforma espiritual criada para aproximar quem
            procura orientação de profissionais sérios, intuitivos e preparados
            para ajudar com clareza e responsabilidade.
          </p>
        </div>

        <div style={styles.contentGrid}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>A nossa missão</h2>
            <p style={styles.text}>
              Queremos oferecer um espaço espiritual moderno, acessível e
              organizado, onde cada pessoa possa receber aconselhamento com
              discrição, profundidade e respeito pelo seu caminho.
            </p>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Com quem trabalhamos</h2>
            <p style={styles.text}>
              Trabalhamos com profissionais experientes em tarot, baralho
              cigano, mediunidade e terapias espirituais, escolhidos pela sua
              entrega, ética e sensibilidade no atendimento.
            </p>
          </section>

          <section style={styles.cardWide}>
            <h2 style={styles.cardTitle}>O que torna a SacraLuna diferente</h2>
            <div style={styles.points}>
              <div style={styles.point}>✦ Atendimento espiritual com discrição</div>
              <div style={styles.point}>✦ Consultas em formato simples e direto</div>
              <div style={styles.point}>✦ Profissionais selecionados com critério</div>
              <div style={styles.point}>✦ Ambiente pensado para confiança e conforto</div>
            </div>
          </section>
        </div>

        <div style={styles.quoteCard}>
          <p style={styles.quote}>
            “Mais do que uma plataforma, a SacraLuna é um espaço de orientação,
            escuta e conexão espiritual.”
          </p>
        </div>

        <div style={styles.actions}>
          <Link href="/" style={styles.backBtn}>
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px 16px 48px",
    color: "#fff",
  },

  wrap: {
    maxWidth: 1120,
    margin: "0 auto",
  },

  heroCard: {
    borderRadius: 26,
    padding: "28px 24px",
    background:
      "linear-gradient(180deg, rgba(8,10,18,0.82) 0%, rgba(14,18,30,0.72) 100%)",
    border: "1px solid rgba(212,175,55,0.18)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.30)",
    marginBottom: 22,
    textAlign: "center",
  },

  kicker: {
    color: "#f4d78b",
    fontWeight: 900,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontSize: 12,
    marginBottom: 10,
  },

  h1: {
    margin: "0 0 12px",
    fontSize: "clamp(34px, 6vw, 52px)",
    lineHeight: 1.05,
    fontWeight: 900,
    color: "#fff7d6",
  },

  lead: {
    margin: "0 auto",
    maxWidth: 780,
    fontSize: "clamp(16px, 2.5vw, 19px)",
    lineHeight: 1.75,
    opacity: 0.92,
  },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },

  card: {
    borderRadius: 22,
    padding: 20,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.20)",
  },

  cardWide: {
    gridColumn: "1 / -1",
    borderRadius: 22,
    padding: 20,
    background: "rgba(212,175,55,0.08)",
    border: "1px solid rgba(212,175,55,0.20)",
  },

  cardTitle: {
    margin: "0 0 12px",
    fontSize: 24,
    fontWeight: 900,
    color: "#f4d78b",
  },

  text: {
    margin: 0,
    lineHeight: 1.8,
    opacity: 0.94,
    fontSize: 16,
  },

  points: {
    display: "grid",
    gap: 10,
  },

  point: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    lineHeight: 1.5,
    fontWeight: 700,
  },

  quoteCard: {
    marginTop: 18,
    borderRadius: 22,
    padding: "22px 20px",
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
    textAlign: "center",
  },

  quote: {
    margin: 0,
    fontSize: "clamp(18px, 3vw, 24px)",
    lineHeight: 1.7,
    color: "#fff7d6",
    fontStyle: "italic",
  },

  actions: {
    display: "flex",
    justifyContent: "center",
    marginTop: 18,
  },

  backBtn: {
    display: "inline-block",
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.10)",
    color: "#f4d78b",
    fontWeight: 900,
  },
};