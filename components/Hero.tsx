"use client";

import React from "react";

export default function Hero() {
  return (
    <section style={styles.hero}>
      <div style={styles.inner}>
        <div style={styles.scriptWrap}>
          <h1 className="hero-script-title" style={styles.title}>
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
    margin: "0 auto 10px",
    padding: "8px 10px 8px",
    textAlign: "center",
  },

  inner: {
    maxWidth: 920,
    margin: "0 auto",
  },

  scriptWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    margin: 0,
    fontSize: "clamp(22px, 6vw, 52px)",
    lineHeight: 1.25,
    fontWeight: 500,
    color: "#fff7d6",
    fontFamily:
      '"Brush Script MT", "Lucida Handwriting", "Segoe Script", "Snell Roundhand", cursive',
    letterSpacing: 0.3,
    textAlign: "center",
    padding: "0 8px",
  },
};