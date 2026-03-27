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

type HistoryMessage = {
  sender_role: "cliente" | "consultor";
  text: string;
  sent_at: number;
};

type HistorySession = {
  id: string;
  cliente_nome: string;
  created_at: number;
  started_at: number;
  ended_at: number;
  billed_seconds: number;
  total_charged_eur: number;
  consultor_earned_eur: number;
  status: string;
  messages: HistoryMessage[];
};

function formatDateTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

function formatOnlyDate(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleDateString("pt-PT");
}

function formatOnlyTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleTimeString("pt-PT");
}

function formatDuration(totalSeconds?: number) {
  const s = Number(totalSeconds ?? 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ConsultorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [consultorNome, setConsultorNome] = useState("Consultor");
  const [consultorId, setConsultorId] = useState<number | null>(null);

  const [fotoUrl, setFotoUrl] = useState("");
  const [apresentacao, setApresentacao] = useState("");
  const [especialidades, setEspecialidades] = useState("");

  const [walletData, setWalletData] = useState<WalletData | null>(null);

  const [online, setOnline] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [alertasAtivos, setAlertasAtivos] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [pendingChat, setPendingChat] = useState<PendingChat>(null);
  const [responding, setResponding] = useState(false);

  const [history, setHistory] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string>("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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

      setFotoUrl(String(jsonMe?.consultor?.foto_url ?? ""));
      setApresentacao(String(jsonMe?.consultor?.apresentacao ?? ""));
      setEspecialidades(String(jsonMe?.consultor?.especialidades ?? ""));

      setWalletData(jsonWallet);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar página do consultor.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarHistorico() {
    try {
      setHistoryLoading(true);

      const res = await fetch("/api/consultor/history", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        router.push("/login-consultor");
        return;
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar histórico.");
      }

      setHistory(Array.isArray(json?.sessions) ? json.sessions : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar histórico.");
    } finally {
      setHistoryLoading(false);
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
    carregarHistorico();
  }, []);

  useEffect(() => {
    const ativo = localStorage.getItem("sacraluna_alertas_ativos");
    setAlertasAtivos(ativo === "1");
  }, []);

  useEffect(() => {
    if (!online) return;
    if (ocupado) return;
    if (responding) return;

    carregarPedidoPendente();

    const t = setInterval(() => {
      carregarPedidoPendente();
    }, 3000);

    return () => clearInterval(t);
  }, [online, ocupado, responding]);

  async function terminarSessao() {
    try {
      await fetch("/api/consultor/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ online: 0, ocupado: 0 }),
      });

      await fetch("/api/logout-consultor", { method: "POST" });
    } finally {
      router.push("/login-consultor");
    }
  }

  async function alterarEstado(params: { online?: number; ocupado?: number }) {
    try {
      setStatusLoading(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/consultor/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao atualizar estado.");
      }

      setOnline(Number(json?.consultor?.online ?? 0) === 1);
      setOcupado(Number(json?.consultor?.ocupado ?? 0) === 1);

      if (Number(json?.consultor?.ocupado ?? 0) === 1 || Number(json?.consultor?.online ?? 0) === 0) {
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
      setSucesso("");

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
        await carregarDados();
        return;
      }

      setOcupado(true);

      if (!consultorId) {
        throw new Error("ID do consultor em falta.");
      }

      router.push(
        `/chat/${consultorId}?session=${encodeURIComponent(currentSessionId)}&role=consultor`
      );
    } catch (e: any) {
      setErro(e?.message || "Erro ao responder ao pedido.");
    } finally {
      setResponding(false);
    }
  }

  async function guardarPerfil() {
    try {
      setProfileSaving(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/consultor/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foto_url: fotoUrl,
          apresentacao: apresentacao,
          especialidades: especialidades,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao guardar perfil.");
      }

      setSucesso("Perfil atualizado com sucesso.");
      await carregarDados();
    } catch (e: any) {
      setErro(e?.message || "Erro ao guardar perfil.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function alterarPassword() {
    try {
      setPasswordSaving(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/consultor/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao alterar password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setSucesso("Password alterada com sucesso.");
    } catch (e: any) {
      setErro(e?.message || "Erro ao alterar password.");
    } finally {
      setPasswordSaving(false);
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

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Área do Consultor</h1>
      {erro ? <p style={styles.error}>{erro}</p> : null}
      {sucesso ? <p style={styles.success}>{sucesso}</p> : null}

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
          <div style={{ ...styles.statusLine, color: statusCor }}>{statusTexto}</div>
        </div>

        <div style={styles.headerButtons}>
          <button
            style={styles.onlineBtn}
            onClick={() => alterarEstado({ online: 1, ocupado: 0 })}
            disabled={statusLoading}
          >
            Ficar disponível
          </button>

          <button
            style={styles.busyBtn}
            onClick={() => alterarEstado({ ocupado: 1 })}
            disabled={statusLoading}
          >
            Ficar ocupada
          </button>

          <button
            style={styles.offlineBtn}
            onClick={() => alterarEstado({ online: 0, ocupado: 0 })}
            disabled={statusLoading}
          >
            Ficar indisponível
          </button>

          <button style={styles.alertBtn} onClick={ativarAlertas}>
            {alertasAtivos ? "🔔 Alertas ativos" : "🔔 Ativar alertas"}
          </button>
          
        <button
  style={styles.alertBtn}
  onClick={() => router.push("/consultor/perfil")}
>
  Editar perfil
</button>

<button
  style={styles.alertBtn}
  onClick={() => router.push("/consultor/historico-chat")}
>
  Histórico chat
</button>

<button
  style={styles.alertBtn}
  onClick={() => router.push("/consultor/historico-email")}
>
  Histórico email
</button>

<button
  style={styles.alertBtn}
  onClick={() => router.push("/consultor/chamadas")}
>
  Histórico voz
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

      <div style={styles.sectionCard}>
        <h2 style={styles.h2}>Editar perfil</h2>

        <label style={styles.label}>Foto (URL)</label>
        <input
          value={fotoUrl}
          onChange={(e) => setFotoUrl(e.target.value)}
          style={styles.input}
          placeholder="https://..."
        />

        <label style={styles.label}>Especialidades</label>
        <textarea
          value={especialidades}
          onChange={(e) => setEspecialidades(e.target.value)}
          style={styles.textarea}
          placeholder="Tarot, Baralho Cigano, Mesa Radiónica..."
        />

        <label style={styles.label}>Apresentação</label>
        <textarea
          value={apresentacao}
          onChange={(e) => setApresentacao(e.target.value)}
          style={styles.textarea}
          placeholder="Escreve aqui a tua apresentação..."
        />

        <button style={styles.primaryBtn} onClick={guardarPerfil} disabled={profileSaving}>
          {profileSaving ? "A guardar..." : "Guardar perfil"}
        </button>
      </div>

      <div style={styles.sectionCard}>
        <h2 style={styles.h2}>Alterar password</h2>

        <label style={styles.label}>Password atual</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Nova password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={styles.input}
        />

        <button style={styles.primaryBtn} onClick={alterarPassword} disabled={passwordSaving}>
          {passwordSaving ? "A alterar..." : "Alterar password"}
        </button>
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.historyHeader}>
          <h2 style={styles.h2}>Histórico de consultas</h2>
          <button style={styles.secondaryBtn} onClick={carregarHistorico} disabled={historyLoading}>
            {historyLoading ? "A carregar..." : "Atualizar histórico"}
          </button>
        </div>

        {history.length === 0 ? (
          <p style={styles.noteText}>Ainda não há histórico para mostrar.</p>
        ) : (
          <div style={styles.historyList}>
            {history.map((item) => {
              const expanded = expandedSessionId === item.id;

              return (
                <div key={item.id} style={styles.historyCard}>
                  <div style={styles.historyTop}>
                    <div>
                      <div style={styles.historyTitle}>Sessão {item.id}</div>
                      <div style={styles.historyMeta}>
                        <b>Cliente:</b> {item.cliente_nome || "-"}
                      </div>
                      <div style={styles.historyMeta}>
                        <b>Dia:</b> {formatOnlyDate(item.started_at || item.created_at)}
                      </div>
                      <div style={styles.historyMeta}>
                        <b>Hora:</b> {formatOnlyTime(item.started_at || item.created_at)}
                      </div>
                      <div style={styles.historyMeta}>
                        <b>Duração:</b> {formatDuration(item.billed_seconds)}
                      </div>
                    </div>

                    <button
                      style={styles.secondaryBtn}
                      onClick={() =>
                        setExpandedSessionId(expanded ? "" : item.id)
                      }
                    >
                      {expanded ? "Fechar" : "Ver chat"}
                    </button>
                  </div>

                  {expanded && (
                    <div style={styles.chatTranscript}>
                      {item.messages?.length ? (
                        item.messages.map((m, idx) => (
                          <div key={idx} style={styles.messageRow}>
                            <div style={styles.messageRole}>
                              {m.sender_role === "consultor" ? "Consultor" : "Cliente"} —{" "}
                              {formatDateTime(m.sent_at)}
                            </div>
                            <div style={styles.messageText}>{m.text}</div>
                          </div>
                        ))
                      ) : (
                        <div style={styles.noteText}>
                          Não há mensagens guardadas nesta consulta.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
  onlineBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(125,255,177,0.5)",
    background: "rgba(20,120,60,0.35)",
    color: "#d8ffe6",
    fontWeight: 800,
    cursor: "pointer",
  },
  busyBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,211,107,0.45)",
    background: "rgba(160,120,20,0.35)",
    color: "#fff1bf",
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
  sectionCard: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  label: {
    display: "block",
    marginBottom: 8,
    marginTop: 14,
    fontWeight: 800,
    opacity: 0.9,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "12px 12px",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "12px 12px",
    outline: "none",
    resize: "vertical",
  },
  primaryBtn: {
    marginTop: 16,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.95)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.12)",
    color: "#f4d78b",
    fontWeight: 800,
    cursor: "pointer",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  historyList: {
    display: "grid",
    gap: 14,
  },
  historyCard: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 14,
  },
  historyTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 8,
  },
  historyMeta: {
    marginBottom: 6,
    opacity: 0.92,
  },
  chatTranscript: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 10,
  },
  messageRow: {
    borderRadius: 12,
    padding: 10,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  messageRole: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
    marginBottom: 6,
  },
  messageText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
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
    marginBottom: 14,
  },
  success: {
    color: "#7dffb1",
    fontWeight: 700,
    marginBottom: 14,
  },
};