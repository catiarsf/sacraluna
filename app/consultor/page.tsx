"use client";

import React, { useEffect, useRef, useState } from "react";
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

type PendingChat = {
  id: string;
  cliente_id: number;
  consultor_id: number;
  cliente_nome: string;
  status: string;
  price_per_min: number;
  created_at: number;
} | null;

export default function ConsultorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [consultorNome, setConsultorNome] = useState("Consultor");
  const [consultorId, setConsultorId] = useState<number | null>(null);

  const [walletData, setWalletData] = useState<WalletData | null>(null);

  const [online, setOnline] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [alertasAtivos, setAlertasAtivos] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const [pendingChat, setPendingChat] = useState<PendingChat>(null);
  const [responding, setResponding] = useState(false);

  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastAlertedSessionRef = useRef<string>("");

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
      setOnline(Number(jsonMe?.consultor?.online ?? 0) === 1);
      setOcupado(Number(jsonMe?.consultor?.ocupado ?? 0) === 1);

      setWalletData(jsonWallet);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar página do consultor.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarPedidoPendente() {
    try {
      const res = await fetch("/api/chat/pending-for-consultor", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        return;
      }

      const nextPending = json?.pending ?? null;
      setPendingChat(nextPending);

      if (
        nextPending?.id &&
        nextPending.id !== lastAlertedSessionRef.current &&
        localStorage.getItem("sacraluna_alertas_ativos") === "1"
      ) {
        lastAlertedSessionRef.current = nextPending.id;
        tocarAlerta();
      }
    } catch {}
  }

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    const ativo = localStorage.getItem("sacraluna_alertas_ativos");
    setAlertasAtivos(ativo === "1");
  }, []);

  useEffect(() => {
    if (!online) return;
    if (ocupado) return;

    carregarPedidoPendente();

    const t = setInterval(() => {
      carregarPedidoPendente();
    }, 3000);

    return () => clearInterval(t);
  }, [online, ocupado]);

  async function terminarSessao() {
    try {
      await fetch("/api/consultor/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ online: 0 }),
      });

      await fetch("/api/logout-consultor", { method: "POST" });
    } finally {
      router.push("/login-consultor");
    }
  }

  async function alterarEstado(novoOnline: number) {
    try {
      setStatusLoading(true);
      setErro("");

      const res = await fetch("/api/consultor/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ online: novoOnline }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao atualizar estado.");
      }

      setOnline(Number(json?.consultor?.online ?? novoOnline) === 1);
      setOcupado(Number(json?.consultor?.ocupado ?? 0) === 1);

      if (novoOnline === 0) {
        setPendingChat(null);
      }
    } catch (e: any) {
      setErro(e?.message || "Erro ao atualizar estado.");
    } finally {
      setStatusLoading(false);
    }
  }

  function tocarAlerta() {
    try {
      if (!alertAudioRef.current) {
        alertAudioRef.current = new Audio("/alert.mp3");
        alertAudioRef.current.volume = 1;
      }

      alertAudioRef.current.currentTime = 0;
      alertAudioRef.current.play().catch(() => {});
    } catch {}
  }

  function ativarAlertas() {
    try {
      const audio = new Audio("/alert.mp3");
      audio.volume = 1;

      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          localStorage.setItem("sacraluna_alertas_ativos", "1");
          setAlertasAtivos(true);
          alert("Alertas ativados com sucesso.");
        })
        .catch(() => {
          alert("O browser bloqueou o som. Tenta novamente e confirma o volume.");
        });
    } catch {
      alert("Não foi possível ativar os alertas.");
    }
  }

  async function responderPedido(action: "accept" | "reject") {
    if (!pendingChat?.id) return;

    try {
      setResponding(true);
      setErro("");

      const res = await fetch("/api/chat/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: pendingChat.id,
          action,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao responder ao pedido.");
      }

      const currentSessionId = pendingChat.id;

      setPendingChat(null);

      if (action === "reject") {
        alert("Pedido rejeitado.");
        return;
      }

      setOcupado(true);

      router.push(
        `/chat/${consultorId}?session=${encodeURIComponent(currentSessionId)}&role=consultor`
      );
    } catch (e: any) {
      setErro(e?.message || "Erro ao responder ao pedido.");
    } finally {
      setResponding(false);
    }
  }

  const ganhosHoje = Number(walletData?.stats?.ganhos_hoje_eur ?? 0);
  const ganhosTotais = Number(walletData?.wallet?.earned_eur ?? 0);
  const saldoDisponivel = Number(walletData?.wallet?.balance_eur ?? 0);
  const consultasHoje = Number(walletData?.stats?.consultas_hoje ?? 0);
  const consultasTotal = Number(walletData?.stats?.consultas_total ?? 0);

  const statusTexto = !online ? "Indisponível" : ocupado ? "Ocupada" : "Disponível";
  const statusCor = !online ? "#ff7b7b" : ocupado ? "#ffd36b" : "#7dffb1";

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

      {pendingChat && online && !ocupado && (
        <div style={styles.pendingBox}>
          <div style={styles.pendingTitle}>Novo pedido de chat</div>
          <div style={styles.pendingText}>
            <b>Cliente:</b> {pendingChat.cliente_nome}
          </div>
          <div style={styles.pendingText}>
            <b>Preço:</b> {Number(pendingChat.price_per_min ?? 0).toFixed(2)}€/min
          </div>
          <div style={styles.pendingBtns}>
            <button
              style={styles.acceptBtn}
              onClick={() => responderPedido("accept")}
              disabled={responding}
            >
              Aceitar
            </button>
            <button
              style={styles.rejectBtn}
              onClick={() => responderPedido("reject")}
              disabled={responding}
            >
              Rejeitar
            </button>
          </div>
        </div>
      )}

      <div style={styles.headerCard}>
        <div>
          <div style={styles.subtle}>Consultor</div>
          <div style={styles.name}>{consultorNome}</div>
          <div style={styles.idLine}>ID: {consultorId ?? "-"}</div>
          <div style={{ ...styles.statusLine, color: statusCor }}>{statusTexto}</div>
        </div>

        <div style={styles.headerButtons}>
          <button style={styles.refreshBtn} onClick={carregarDados}>
            Atualizar
          </button>

          <button
            style={styles.onlineBtn}
            onClick={() => alterarEstado(1)}
            disabled={statusLoading}
          >
            Ficar disponível
          </button>

          <button
            style={styles.offlineBtn}
            onClick={() => alterarEstado(0)}
            disabled={statusLoading}
          >
            Ficar indisponível
          </button>

          <button style={styles.alertBtn} onClick={ativarAlertas}>
            {alertasAtivos ? "🔔 Alertas ativos" : "🔔 Ativar alertas"}
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
  pendingBox: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(24, 44, 90, 0.55)",
    border: "1px solid rgba(212,175,55,0.35)",
    marginBottom: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 10,
  },
  pendingText: {
    marginBottom: 8,
    fontSize: 16,
  },
  pendingBtns: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 14,
  },
  acceptBtn: {
    padding: "12px 18px",
    borderRadius: 12,
    border: "1px solid rgba(125,255,177,0.6)",
    background: "rgba(20,120,60,0.45)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  rejectBtn: {
    padding: "12px 18px",
    borderRadius: 12,
    border: "1px solid rgba(255,120,120,0.6)",
    background: "rgba(120,0,0,0.45)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
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
  statusLine: {
    marginTop: 10,
    fontWeight: 900,
    fontSize: 16,
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
  onlineBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(125,255,177,0.5)",
    background: "rgba(20,120,60,0.35)",
    color: "#d8ffe6",
    fontWeight: 800,
    cursor: "pointer",
  },
  offlineBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,140,140,0.45)",
    background: "rgba(120,20,20,0.35)",
    color: "#ffd7d7",
    fontWeight: 800,
    cursor: "pointer",
  },
  alertBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(140,180,255,0.5)",
    background: "rgba(26,63,130,0.45)",
    color: "#dce8ff",
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