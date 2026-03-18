"use client";

import React from "react";

export default function Hero() {
  function goToConsultores() {
    const el = document.getElementById("consultores");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <section style={styles.hero}>
      <div style={styles.inner}>
        <h1 style={styles.title}>
          Orientação espiritual com clareza, discrição e verdade
        </h1>

        <button type="button" style={styles.cta} onClick={goToConsultores}>
          Ver consultores
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    maxWidth: 1180,
    margin: "0 auto 8px",
    padding: "10px 16px 6px",
    textAlign: "center",
  },

  inner: {
    maxWidth: 700,
    margin: "0 auto",
  },

  title: {
    margin: "0 0 10px",
    fontSize: "clamp(22px, 4vw, 34px)",
    lineHeight: 1.08,
    fontWeight: 950,
    color: "#fff7d6",
    textShadow:
      "0 0 10px rgba(212,175,55,0.15), 0 6px 18px rgba(0,0,0,0.35)",
  },

  cta: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.92)",
    color: "#111",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
  },
};