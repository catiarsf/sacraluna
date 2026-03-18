"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginConsultorPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/login-consultor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Credenciais inválidas.");
      }

      router.push("/consultor");
    } catch (e: any) {
      setErr(e?.message || "Erro ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login Consultores</h1>

        {err && <div style={styles.err}>{err}</div>}

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email do consultor"
            autoComplete="email"
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background:
      "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
  },

  card: {
    width: "min(460px, 94vw)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.28)",
    padding: 22,
    color: "#fff",
  },

  title: {
    margin: "0 0 18px",
    fontSize: 28,
    fontWeight: 950,
  },

  err: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.25)",
    color: "#ffb4b4",
  },

  form: {
    display: "grid",
    gap: 10,
  },

  label: {
    fontSize: 13,
    opacity: 0.9,
  },

  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    outline: "none",
  },

  btn: {
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
};