import Link from "next/link";
import React from "react";

const passos = [
  {
    numero: "01",
    titulo: "Escolhe um consultor",
    texto:
      "Explora os perfis disponíveis e escolhe a consultora espiritual que mais combina contigo.",
  },
  {
    numero: "02",
    titulo: "Inicia a consulta",
    texto:
      "Podes entrar por chat, voz ou email, conforme o serviço que estiver disponível.",
  },
  {
    numero: "03",
    titulo: "Recebe orientação em tempo real",
    texto:
      "A consulta decorre de forma direta, privada e com total discrição dentro da plataforma.",
  },
  {
    numero: "04",
    titulo: "Pagamento simples e transparente",
    texto:
      "O valor é apresentado de forma clara e cobrado conforme o tipo de atendimento escolhido.",
  },
];

export default function ComoSeConsultarPage() {
  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.heroCard}>
          <div style={styles.kicker}>SacraLuna</div>
          <h1 style={styles.h1}>Como se consultar</h1>
          <p style={styles.lead}>
            Na SacraLuna podes falar com consultores espirituais em tempo real,
            com clareza, discrição e uma experiência simples de usar.
          </p>
        </div>

        <section style={styles.section}>
          <div style={styles.sectionTitle}>Como funciona</div>

          <div style={styles.grid}>
            {passos.map((passo) => (
              <article key={passo.numero} style={styles.stepCard}>
                <div style={styles.stepNumber}>{passo.numero}</div>
                <h2 style={styles.stepTitle}>{passo.titulo}</h2>
                <p style={styles.stepText}>{passo.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.infoCard}>
          <h2 style={styles.infoTitle}>Consulta com segurança e privacidade</h2>
          <p style={styles.infoText}>
            A plataforma foi pensada para te oferecer uma experiência espiritual
            segura, confortável e intuitiva. Escolhes o profissional, inicias o
            atendimento e recebes a tua orientação de forma reservada.
          </p>
        </section>

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
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: 12,
    marginBottom: 10,
    opacity: 0.95,
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
    maxWidth: 760,
    fontSize: "clamp(16px, 2.5vw, 19px)",
    lineHeight: 1.75,
    opacity: 0.92,
  },

  section: {
    marginTop: 8,
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 14,
    textAlign: "center",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },

  stepCard: {
    borderRadius: 22,
    padding: 18,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.20)",
  },

  stepNumber: {
    fontSize: 13,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 10,
    letterSpacing: 1,
  },

  stepTitle: {
    margin: "0 0 10px",
    fontSize: 22,
    fontWeight: 900,
    lineHeight: 1.2,
  },

  stepText: {
    margin: 0,
    lineHeight: 1.7,
    opacity: 0.9,
    fontSize: 15,
  },

  infoCard: {
    borderRadius: 22,
    padding: "22px 20px",
    background: "rgba(212,175,55,0.08)",
    border: "1px solid rgba(212,175,55,0.20)",
    marginBottom: 18,
  },

  infoTitle: {
    margin: "0 0 10px",
    fontSize: 24,
    fontWeight: 900,
    color: "#f4d78b",
  },

  infoText: {
    margin: 0,
    lineHeight: 1.8,
    opacity: 0.95,
    fontSize: 16,
  },

  actions: {
    display: "flex",
    justifyContent: "center",
    marginTop: 10,
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