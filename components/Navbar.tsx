"use client";

import React from "react";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <div style={styles.links}>
          <Link style={styles.link} href="/">Início</Link>
          <Link style={styles.link} href="/como-se-consultar">Como se consultar</Link>
          <Link style={styles.link} href="/loja">Serviços</Link>
          <Link style={styles.link} href="/blog">Blog</Link>
          <Link style={styles.link} href="/quem-somos">Quem somos</Link>
          <Link style={styles.link} href="/trabalhe-conosco">Trabalhe conosco</Link>
          <Link style={styles.link} href="/fale-conosco">Fale conosco</Link>
        </div>

        <div style={styles.right}>
          <Link style={styles.cta} href="/login">
            Registo / Login
          </Link>

          <Link style={styles.ctaConsultor} href="/login-consultor">
            Login Consultores
          </Link>
        </div>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    width: "100%",
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(6px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 16px",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
  },

  links: {
    gridColumn: "2 / 3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    flexWrap: "wrap",
  },

  link: {
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: 0.2,
    opacity: 0.98,
    textShadow: "0 1px 10px rgba(0,0,0,0.55)",
  },

  right: {
    gridColumn: "3 / 4",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },

  cta: {
    display: "inline-block",
    padding: "10px 16px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(0,0,0,0.28)",
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 950,
    fontSize: 15,
    whiteSpace: "nowrap",
    boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
  },

  ctaConsultor: {
    display: "inline-block",
    padding: "10px 16px",
    borderRadius: 14,
    border: "1px solid rgba(110,200,255,0.65)",
    background: "rgba(0,0,0,0.28)",
    color: "#7dd3ff",
    textDecoration: "none",
    fontWeight: 950,
    fontSize: 15,
    whiteSpace: "nowrap",
    boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
  },
};