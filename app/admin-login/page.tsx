"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("sacraluna.geral@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Não foi possível iniciar sessão.");
      }

      if (json?.role !== "admin") {
        throw new Error("Esta conta não tem acesso de administrador.");
      }

      router.push("/admin");
      router.refresh();
    } catch (e: any) {
      setErro(e?.message || "Erro ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Administração</h1>
        <p style={styles.p}>
          Acesso reservado à administração SacraLuna.
        </p>

        <form onSubmit={entrar} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="username"
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="current-password"
          />

          {erro ? <div style={styles.erro}>{erro}</div> : null}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
    color: "#fff",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 18,
    padding: 24,
    background: "rgba(0,0,0,0.30)",
    border: "1px solid rgba(212,175,55,0.30)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  },
  h1: {
    margin: 0,
    fontSize: 30,
    fontWeight: 900,
    color: "#f4d78b",
  },
  p: {
    marginTop: 10,
    marginBottom: 22,
    opacity: 0.9,
  },
  form: {
    display: "grid",
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: 800,
    opacity: 0.9,
  },
  input: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "12px 14px",
    outline: "none",
  },
  erro: {
    color: "#ff9f9f",
    fontWeight: 700,
    marginTop: 4,
  },
  btn: {
    marginTop: 6,
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.95)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 950,
    cursor: "pointer",
    padding: "12px 16px",
  },
};