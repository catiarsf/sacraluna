"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegistroPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, telefone, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErro(data?.error || "Erro ao criar conta.");
        return;
      }

      router.push("/cliente");
    } catch {
      setErro("Falha de rede. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 44, fontWeight: 800, marginBottom: 18 }}>Registo</h1>

      <form onSubmit={onSubmit} style={{ maxWidth: 520 }}>
        <label>Nome</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="O teu nome"
          required
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 12 }}
        />

        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="o-teu@email.com"
          type="email"
          required
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 12 }}
        />

        <label>Número de telemóvel</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="+3519XXXXXXXX"
          type="text"
          required
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 12 }}
        />

        <label>Palavra-passe</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Cria uma password"
          type="password"
          required
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 12 }}
        />

        {erro && (
          <p style={{ color: "salmon", marginBottom: 12 }}>
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 12, fontWeight: 700 }}
        >
          {loading ? "A criar..." : "Criar conta"}
        </button>
      </form>
    </main>
  );
}