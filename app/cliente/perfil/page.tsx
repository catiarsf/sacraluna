"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClientePerfilPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErro("");

        const res = await fetch("/api/cliente/perfil", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Erro ao carregar perfil.");
        }

        setNome(String(json.cliente?.nome ?? ""));
        setEmail(String(json.cliente?.email ?? ""));
        setTelefone(String(json.cliente?.telefone ?? ""));
      } catch (e: any) {
        setErro(e?.message || "Erro ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [router]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/cliente/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          password,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao guardar dados.");
      }

      setPassword("");
      setSucesso("Perfil atualizado com sucesso.");
    } catch (e: any) {
      setErro(e?.message || "Erro ao guardar dados.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={styles.page}>
      <button style={styles.backBtn} onClick={() => router.push("/cliente")}>
        ← Voltar
      </button>

      <h1 style={styles.h1}>Editar perfil</h1>

      {erro ? <div style={styles.err}>{erro}</div> : null}
      {sucesso ? <div style={styles.success}>{sucesso}</div> : null}

      {loading ? (
        <div style={styles.card}>A carregar...</div>
      ) : (
        <form onSubmit={guardar} style={styles.card}>
          <label style={styles.label}>Nome</label>
          <input
            style={styles.input}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="O teu nome"
          />

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="O teu email"
            type="email"
          />

          <label style={styles.label}>Telefone</label>
          <input
            style={styles.input}
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Ex: +351912345678"
          />

          <label style={styles.label}>Nova password opcional</label>
          <input
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Só preenche se quiseres alterar"
            type="password"
          />

          <button type="submit" style={styles.btn} disabled={saving}>
            {saving ? "A guardar..." : "Guardar alterações"}
          </button>
        </form>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 40,
    color: "white",
    minHeight: "100vh",
  },
  backBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: 20,
  },
  h1: {
    fontSize: 38,
    fontWeight: 900,
    marginBottom: 20,
  },
  card: {
    maxWidth: 560,
    padding: 22,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 800,
    opacity: 0.9,
  },
  input: {
    padding: 13,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
  },
  btn: {
    marginTop: 10,
    padding: "13px 16px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "#f4d78b",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  err: {
    maxWidth: 560,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.25)",
    color: "#ffb4b4",
  },
  success: {
    maxWidth: 560,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(40,140,80,0.18)",
    border: "1px solid rgba(90,200,120,0.30)",
    color: "#bfffd0",
  },
};