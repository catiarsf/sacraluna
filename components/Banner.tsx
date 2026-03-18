"use client";

import React from "react";

export default function Banner() {
  return (
    <div style={styles.wrap}>
      <div style={styles.inner}>
        <div style={styles.bannerImage} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: "100%",
    backgroundImage: "url('/fundo.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    borderBottom: "1px solid rgba(212,175,55,0.35)",
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    height: 170,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
  },
  bannerImage: {
    position: "absolute",
    inset: 0,
    backgroundImage: "url('/banner-sacraluna.jpg')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "contain", // mostra a imagem toda
    filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.35))",
  },
};