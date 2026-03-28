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

  const closeMenu = () => setMobileOpen(false);

  const menuLinks = (
    <>
      <Link style={styles.link} href="/" onClick={closeMenu}>
        Início
      </Link>
      <Link style={styles.link} href="/como-se-consultar" onClick={closeMenu}>
        Como se consultar
      </Link>
      <Link style={styles.link} href="/loja" onClick={closeMenu}>
        Serviços
      </Link>
      <Link style={styles.link} href="/blog" onClick={closeMenu}>
        Blog
      </Link>
      <Link style={styles.link} href="/quem-somos" onClick={closeMenu}>
        Quem somos
      </Link>
      <Link style={styles.link} href="/trabalhe-conosco" onClick={closeMenu}>
        Trabalhe conosco
      </Link>
      <Link style={styles.link} href="/fale-conosco" onClick={closeMenu}>
        Fale conosco
      </Link>
    </>
  );

  const rightButtons = (
    <>
      <Link style={styles.cta} href="/login" onClick={closeMenu}>
        Registo / Login
      </Link>

      <Link
        style={styles.ctaConsultor}
        href="/login-consultor"
        onClick={closeMenu}
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
                aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
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
    background: "rgba(3, 8, 20, 0.78)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(212,175,55,0.16)",
    position: "relative",
    zIndex: 50,
    boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
  },

  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "10px 12px",
  },

  desktopLinks: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
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
    alignItems: "center",
  },

  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.28)",
    background: "rgba(255,255,255,0.04)",
    color: "#f4d78b",
    fontSize: 24,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
  },

  mobileMenu: {
    marginTop: 12,
    display: "grid",
    gap: 14,
    padding: "2px 0 4px",
  },

  mobileLinks: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  mobileButtons: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },

  link: {
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 15,
    lineHeight: 1.2,
    textAlign: "center",
    padding: "12px 8px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(212,175,55,0.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    boxSizing: "border-box",
  },

  cta: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.48)",
    background: "rgba(212,175,55,0.08)",
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 900,
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    boxSizing: "border-box",
  },

  ctaConsultor: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(110,200,255,0.45)",
    background: "rgba(110,200,255,0.07)",
    color: "#7dd3ff",
    textDecoration: "none",
    fontWeight: 900,
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    boxSizing: "border-box",
  },
};