"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type WalletData = {
  ok: boolean;
  wallet?: {
    balance_eur: number;
    earned_eur: number;
    spent_eur: number;
  };
  stats?: {
    ganhos_hoje_eur: number;
    consultas_hoje: number;
    consultas_total: number;
  };
  error?: string;
};

type MeData = {
  ok: boolean;
  consultor?: {
    id: number;
    nome: string;
    email: string;
  };
  error?: string;
};

export default function ConsultorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [consultorNome, setConsultorNome] = useState("Consultor");
  const [consultorId, setConsultorId] = useState<number | null>(null);

  const [walletData, setWalletData] = useState<WalletData | null>(null);

  async function carregarDados() {
    try {
      setErro("");

      const [resMe, resWallet] = await Promise.all([
        fetch("/api/consultor/me", { cache: "no-store" }),
        fetch("/api/consultor/wallet", { cache: "no-store" }),
      ]);

      const jsonMe = await resMe.json().catch(() => null);
      const jsonWallet = await resWallet.json().catch(() => null);

      if (resMe.status === 401 || resWallet.status === 401) {
        router.push("/login-consultor");
        return;
      }

      if (!resMe.ok) {
        throw new Error(jsonMe?.error || "Erro ao carregar dados do consultor.");
      }

      if (!resWallet.ok) {
        throw new Error(jsonWallet?.error || "Erro ao carregar ganhos do consultor.");
      }

      setConsultorNome(String(jsonMe?.consultor?.nome ?? "Consultor"));
      setConsultorId(Number(jsonMe?.consultor?.id ?? 0));
      setWalletData(jsonWallet);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar página do consultor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function terminarSessao() {
    try {
      await fetch("/api/logout-consultor", { method: "POST" });
    } finally {
      router.push("/login-consultor");
    }
  }

  const ganhosHoje = Number(walletData?.stats?.ganhos_hoje_eur ?? 0);
  const ganhosTotais = Number(walletData?.wallet?.earned_eur ?? 0);
  const saldoDisponivel = Number(walletData?.wallet?.balance_eur ?? 0);
  const consultasHoje = Number(walletData?.stats?.consultas_hoje ?? 0);
  const consultasTotal = Number(walletData?.stats?.consultas_total ?? 0);

  if (loading) {
    return (
      <main style={styles.page}>
        <h1 style={styles.h1}>Área do Consultor</h1>
        <p>A carregar...</p>
      </main>
    );
  }

  if (erro) {
    return (
      <main style={styles.page}>
        <h1 style={styles.h1}>Área do Consultor</h1>
        <p style={styles.error}>{erro}</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Área do Consultor</h1>

      <div style={styles.headerCard}>
        <div>
          <div style={styles.subtle}>Consultor</div>
          <div style={styles.name}>{consultorNome}</div>
          <div style={styles.idLine}>ID: {consultorId ?? "-"}</div>
        </div>

        <div style={styles.headerButtons}>
          <button style={styles.refreshBtn} onClick={carregarDados}>
            Atualizar
          </button>
          <button style={styles.logoutBtn} onClick={terminarSessao}>
            Terminar sessão
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Ganhos hoje</div>
          <div style={styles.cardValue}>{ganhosHoje.toFixed(2)}€</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Ganhos totais</div>
          <div style={styles.cardValue}>{ganhosTotais.toFixed(2)}€</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Saldo disponível</div>
          <div style={styles.cardValue}>{saldoDisponivel.toFixed(2)}€</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Consultas hoje</div>
          <div style={styles.cardValue}>{consultasHoje}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Consultas totais</div>
          <div style={styles.cardValue}>{consultasTotal}</div>
        </div>
      </div>

      <div style={styles.noteCard}>
        <h2 style={styles.h2}>Resumo</h2>
        <p style={styles.noteText}>
          Aqui vês os teus ganhos acumulados no sistema. O campo “Ganhos hoje”
          mostra apenas o que foi gerado hoje. “Ganhos totais” mostra tudo o que
          já recebeste no site. “Saldo disponível” mostra o valor atualmente
          associado à tua wallet de consultor.
        </p>
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
  h1: {
    fontSize: 34,
    fontWeight: 900,
    marginBottom: 18,
  },
  h2: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 10,
  },
  headerCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    padding: 18,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  subtle: {
    opacity: 0.75,
    fontSize: 14,
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: 900,
    color: "#f4d78b",
  },
  idLine: {
    marginTop: 6,
    opacity: 0.8,
  },
  headerButtons: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  refreshBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(212,175,55,0.6)",
    background: "rgba(212,175,55,0.12)",
    color: "#f4d78b",
    fontWeight: 800,
    cursor: "pointer",
  },
  logoutBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "rgba(120,0,0,0.7)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  cardLabel: {
    opacity: 0.8,
    marginBottom: 8,
    fontWeight: 700,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 900,
    color: "#f4d78b",
  },
  noteCard: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  noteText: {
    lineHeight: 1.6,
    opacity: 0.92,
  },
  error: {
    color: "#ff8080",
    fontWeight: 700,
  },
};