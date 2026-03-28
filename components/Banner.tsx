"use client";

import React from "react";

export default function Banner() {
  return (
    <div style={styles.wrap}>
      <div style={styles.overlay} />

      <div style={styles.inner}>
        <div style={styles.bannerImage} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    backgroundImage: "url('/fundo.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    borderBottom: "1px solid rgba(212,175,55,0.25)",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.28))",
    pointerEvents: "none",
  },

  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    height: "clamp(120px, 22vw, 190px)",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 10px",
  },

  bannerImage: {
    position: "absolute",
    inset: 0,
    backgroundImage: "url('/banner-sacraluna.jpg')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",
    filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.35))",
  },
};