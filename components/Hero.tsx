"use client";

import React from "react";

export default function Hero() {
  return (
    <section style={styles.hero}>
      <div style={styles.inner}>
        <div style={styles.scriptWrap}>
          <h1 style={styles.title}>
            Orientação espiritual com clareza, discrição e verdade
          </h1>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroFloatGlow {
          0% {
            transform: translateY(0px);
            opacity: 0.92;
            text-shadow:
              0 0 10px rgba(212, 175, 55, 0.18),
              0 6px 18px rgba(0, 0, 0, 0.35);
          }
          50% {
            transform: translateY(-4px);
            opacity: 1;
            text-shadow:
              0 0 18px rgba(212, 175, 55, 0.28),
              0 10px 24px rgba(0, 0, 0, 0.4);
          }
          100% {
            transform: translateY(0px);
            opacity: 0.92;
            text-shadow:
              0 0 10px rgba(212, 175, 55, 0.18),
              0 6px 18px rgba(0, 0, 0, 0.35);
          }
        }

        .hero-script-title {
          animation: heroFloatGlow 4.2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    maxWidth: 1180,
    margin: "0 auto 14px",
    padding: "14px 16px 10px",
    textAlign: "center",
  },

  inner: {
    maxWidth: 860,
    margin: "0 auto",
  },

  scriptWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    margin: 0,
    fontSize: "clamp(28px, 4.8vw, 52px)",
    lineHeight: 1.2,
    fontWeight: 500,
    color: "#fff7d6",
    fontFamily:
      '"Brush Script MT", "Lucida Handwriting", "Segoe Script", "Snell Roundhand", cursive',
    letterSpacing: 0.4,
    textAlign: "center",
  },
};