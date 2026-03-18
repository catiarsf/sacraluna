import React from "react";

const testemunhos = [
  {
    nome: "Ana M.",
    texto:
      "Fiquei impressionada com a consulta. Houve detalhes muito específicos que eu nunca tinha dito e fez-me pensar de forma diferente.",
    data: "12 Março 2026",
  },
  {
    nome: "Carla S.",
    texto:
      "Gostei porque foi direta, clara e sem rodeios. Saí da consulta com mais noção do que devia fazer.",
    data: "9 Março 2026",
  },
  {
    nome: "Joana R.",
    texto:
      "Senti-me compreendida do início ao fim. A orientação ajudou-me muito numa fase complicada.",
    data: "5 Março 2026",
  },
  {
    nome: "Patrícia L.",
    texto:
      "Muito profissional e com uma energia muito boa. Voltarei a marcar sem dúvida.",
    data: "1 Março 2026",
  },
];

const indicadores = [
  {
    numero: "+300",
    label: "Atendimentos realizados",
  },
  {
    numero: "Todos os dias",
    label: "Consultores disponíveis",
  },
  {
    numero: "100%",
    label: "Discrição e privacidade",
  },
];

export default function Testemunhos() {
  return (
    <section style={styles.section}>
      <div style={styles.top}>
        <div style={styles.badge}>Confiança & Experiência</div>
        <h2 style={styles.title}>Milhares de pessoas procuram respostas com seriedade</h2>
        <p style={styles.sub}>
          Atendimento espiritual com discrição, clareza e orientação direta para quem precisa de respostas.
        </p>
      </div>

      <div style={styles.statsGrid}>
        {indicadores.map((item, i) => (
          <div key={i} style={styles.statCard}>
            <div style={styles.statNumber}>{item.numero}</div>
            <div style={styles.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.reviewsTop}>
        <div style={styles.reviewsTitle}>O que dizem sobre as consultas</div>
        <div style={styles.reviewsStars}>★★★★★</div>
      </div>

      <div style={styles.grid}>
        {testemunhos.map((t, i) => (
          <article key={i} style={styles.card}>
            <div style={styles.stars}>★★★★★</div>

            <p style={styles.texto}>“{t.texto}”</p>

            <div style={styles.footer}>
              <div style={styles.nome}>{t.nome}</div>
              <div style={styles.data}>{t.data}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginTop: 34,
    padding: "14px 0 0",
  },

  top: {
    textAlign: "center",
    marginBottom: 22,
  },

  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(212,175,55,0.35)",
    background: "rgba(212,175,55,0.10)",
    color: "#f4d78b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.4,
    marginBottom: 12,
  },

  title: {
    margin: "0 0 10px",
    textAlign: "center",
    fontSize: "clamp(26px, 5vw, 34px)",
    fontWeight: 950,
    color: "#f7df99",
    lineHeight: 1.15,
    textShadow:
      "0 0 14px rgba(212,175,55,0.28), 0 8px 22px rgba(0,0,0,0.45)",
  },

  sub: {
    maxWidth: 760,
    margin: "0 auto",
    lineHeight: 1.65,
    opacity: 0.85,
    fontSize: "clamp(14px, 2.5vw, 16px)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 260px))",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
    marginBottom: 32,
  },

  statCard: {
    borderRadius: 18,
    border: "1px solid rgba(212,175,55,0.18)",
    background: "rgba(0,0,0,0.22)",
    boxShadow: "0 14px 28px rgba(0,0,0,0.18)",
    padding: 18,
    textAlign: "center",
  },

  statNumber: {
    fontSize: "clamp(24px, 5vw, 32px)",
    fontWeight: 950,
    color: "#f4d78b",
    marginBottom: 8,
  },

  statLabel: {
    fontSize: 14,
    opacity: 0.88,
    lineHeight: 1.45,
  },

  reviewsTop: {
    textAlign: "center",
    marginBottom: 18,
  },

  reviewsTitle: {
    fontSize: "clamp(22px, 4vw, 28px)",
    fontWeight: 900,
    color: "#ffffff",
    marginBottom: 8,
  },

  reviewsStars: {
    color: "#f4d78b",
    fontSize: 20,
    letterSpacing: 2,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 280px))",
    justifyContent: "center",
    gap: 18,
    marginTop: 22,
  },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(212,175,55,0.20)",
    background: "rgba(0,0,0,0.22)",
    boxShadow: "0 14px 28px rgba(0,0,0,0.22)",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    minHeight: 220,
  },

  stars: {
    color: "#f4d78b",
    fontSize: 18,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  texto: {
    margin: 0,
    lineHeight: 1.65,
    opacity: 0.92,
    fontStyle: "italic",
    flex: 1,
  },

  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  nome: {
    fontWeight: 800,
    color: "#ffffff",
    fontSize: 14,
  },

  data: {
    fontSize: 12,
    opacity: 0.7,
  },
};