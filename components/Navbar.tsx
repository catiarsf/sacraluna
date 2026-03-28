"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= 900);
    }

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const menuLinks = (
    <>
      <Link style={styles.link} href="/" onClick={() => setMobileOpen(false)}>
        Início
      </Link>
      <Link style={styles.link} href="/como-se-consultar" onClick={() => setMobileOpen(false)}>
        Como se consultar
      </Link>
      <Link style={styles.link} href="/loja" onClick={() => setMobileOpen(false)}>
        Serviços
      </Link>
      <Link style={styles.link} href="/blog" onClick={() => setMobileOpen(false)}>
        Blog
      </Link>
      <Link style={styles.link} href="/quem-somos" onClick={() => setMobileOpen(false)}>
        Quem somos
      </Link>
      <Link style={styles.link} href="/trabalhe-conosco" onClick={() => setMobileOpen(false)}>
        Trabalhe conosco
      </Link>
      <Link style={styles.link} href="/fale-conosco" onClick={() => setMobileOpen(false)}>
        Fale conosco
      </Link>
    </>
  );

  const rightButtons = (
    <>
      <Link style={styles.cta} href="/login" onClick={() => setMobileOpen(false)}>
        Registo / Login
      </Link>

      <Link
        style={styles.ctaConsultor}
        href="/login-consultor"
        onClick={() => setMobileOpen(false)}
      >
        Login Consultores
      </Link>
    </>
  );

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {!isMobile ? (
          <>
            <div style={styles.desktopLinks}>{menuLinks}</div>
            <div style={styles.desktopRight}>{rightButtons}</div>
          </>
        ) : (
          <>
            <div style={styles.mobileTopBar}>
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                style={styles.menuButton}
              >
                {mobileOpen ? "✕" : "☰"}
              </button>
            </div>

            {mobileOpen && (
              <div style={styles.mobileMenu}>
                <div style={styles.mobileLinks}>{menuLinks}</div>
                <div style={styles.mobileButtons}>{rightButtons}</div>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    width: "100%",
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 16px",
  },

  desktopLinks: {
    display: "flex",
    justifyContent: "center",
    gap: 22,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  desktopRight: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  mobileTopBar: {
    display: "flex",
    justifyContent: "flex-start",
  },

  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.35)",
    background: "rgba(0,0,0,0.28)",
    color: "#f4d78b",
    fontSize: 24,
    fontWeight: 900,
    cursor: "pointer",
  },

  mobileMenu: {
    marginTop: 14,
    display: "grid",
    gap: 16,
  },

  mobileLinks: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
  },

  mobileButtons: {
    display: "grid",
    gap: 12,
  },

  link: {
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 16,
    textAlign: "center",
    padding: "12px 10px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(212,175,55,0.12)",
  },

  cta: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(0,0,0,0.28)",
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 950,
    textAlign: "center",
  },

  ctaConsultor: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(110,200,255,0.65)",
    background: "rgba(0,0,0,0.28)",
    color: "#7dd3ff",
    textDecoration: "none",
    fontWeight: 950,
    textAlign: "center",
  },
};