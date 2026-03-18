"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setMsg(data?.error || "Falha no login.");
        setLoading(false);
        return;
      }

      const role = data.role;

      // ✅ REDIRECIONA CONFORME A FUNÇÃO DA CONTA
      if (role === "admin") router.push("/admin");
      else if (role === "consultor") router.push("/consultor");
      else router.push("/cliente");
    } catch (err) {
      setMsg("Erro de rede. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: 40, color: "white" }}>
      <h1 style={{ fontSize: 46, marginBottom: 18 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ maxWidth: 520 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="o-teu@email.com"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            marginBottom: 14,
            outline: "none",
          }}
        />

        <label style={{ display: "block", marginBottom: 6 }}>Palavra-passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            marginBottom: 16,
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #d4af37",
            background: loading ? "rgba(212,175,55,0.2)" : "rgba(0,0,0,0.35)",
            color: "#d4af37",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          {loading ? "A entrar..." : "Entrar"}
        </button>

        {msg && (
          <p style={{ marginTop: 12, color: "#ff7b7b" }}>
            {msg}
          </p>
        )}

        <p style={{ marginTop: 14, opacity: 0.85 }}>
          Ainda não tens conta? <a href="/registro" style={{ color: "#d4af37" }}>Criar conta</a>
        </p>
      </form>
    </main>
  );
}