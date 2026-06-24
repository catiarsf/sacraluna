"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function AdminPasswordPage() {
  const [passwordAtual, setPasswordAtual] = useState("");
  const [novaPassword, setNovaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function alterarPassword(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          passwordAtual,
          novaPassword,
          confirmarPassword,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao alterar password.");
      }

      setSucesso("Password alterada com sucesso.");
      setPasswordAtual("");
      setNovaPassword("");
      setConfirmarPassword("");
    } catch (e: any) {
      setErro(e?.message || "Erro ao alterar password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <Link href="/admin" style={styles.back}>
          ← Voltar à admin
        </Link>

        <h1 style={styles.h1}>Alterar password da admin</h1>

        {erro ? <div style={styles.err}>{erro}</div> : null}
        {sucesso ? <div style={styles.success}>{sucesso}</div> : null}

        <form onSubmit={alterarPassword} style={styles.form}>
          <label style={styles.label}>Password atual</label>
          <input
            style={styles.input}
            type="password"
            value={passwordAtual}
            onChange={(e) => setPasswordAtual(e.target.value)}
            required
          />

          <label style={styles.label}>Nova password</label>
          <input
            style={styles.input}
            type="password"
            value={novaPassword}
            onChange={(e) => setNovaPassword(e.target.value)}
            required
          />

          <label style={styles.label}>Confirmar nova password</label>
          <input
            style={styles.input}
            type="password"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            required
          />

          <button style={styles.btn} disabled={loading}>
            {loading ? "A alterar..." : "Alterar password"}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    color: "#fff",
    background:
      "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
  },
  card: {
    maxWidth: 520,
    margin: "0 auto",
    padding: 22,
    borderRadius: 18,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  back: {
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 800,
  },
  h1: {
    fontSize: 28,
    fontWeight: 900,
    marginTop: 18,
    marginBottom: 18,
  },
  form: {
    display: "grid",
    gap: 10,
  },
  label: {
    fontWeight: 800,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.95)",
    color: "#111",
  },
  btn: {
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.7)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  err: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.12)",
    border: "1px solid rgba(255,0,0,0.25)",
  },
  success: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(40,140,80,0.18)",
    border: "1px solid rgba(90,200,120,0.30)",
  },
};