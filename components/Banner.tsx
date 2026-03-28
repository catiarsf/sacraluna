"use client";

import React, { useEffect, useState } from "react";

export default function Banner() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= 900);
    }

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.overlay} />
      <div style={styles.inner}>
        <div
          style={{
            ...styles.bannerImage,
            backgroundSize: isMobile ? "cover" : "contain",
            backgroundPosition: "center",
          }}
        />
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
      "linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.22))",
    pointerEvents: "none",
  },

  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    height: "clamp(130px, 18vw, 210px)",
    position: "relative",
    padding: "8px 12px",
  },

  bannerImage: {
    position: "absolute",
    inset: 0,
    backgroundImage: "url('/banner-sacraluna.jpg')",
    backgroundRepeat: "no-repeat",
    filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.35))",
  },
};