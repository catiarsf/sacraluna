"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

type Msg = {
  sessionId: string;
  text: string;
  senderRole: "cliente" | "consultor";
  at: number;
};

type ConsultorInfo = {
  id: number;
  nome: string;
  valor_min_eur: number;
  ativo: number;
};

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function shortSessionId(id: string) {
  if (!id) return "…";
  if (id.length <= 18) return id;
  return `${id.slice(0, 8)}...${id.slice(-8)}`;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();

  const role = useMemo(() => sp.get("role") || "cliente", [sp]);

  const consultorId = useMemo(() => {
    const raw = (params as any)?.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }, [params]);

  const sessionId = useMemo(() => sp.get("session") || "", [sp]);

  const socketBaseUrl = useMemo(() => {
    const fromEnv =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";

    if (fromEnv) return fromEnv;

    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    return "";
  }, []);

  const [connected, setConnected] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");

  const [consultor, setConsultor] = useState<ConsultorInfo | null>(null);
  const [saldoCliente, setSaldoCliente] = useState<number>(0);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [sessionValidated, setSessionValidated] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [billedSeconds, setBilledSeconds] = useState(0);
  const [totalCharged, setTotalCharged] = useState(0);
  const [consultorEarned, setConsultorEarned] = useState(0);
  const [chatStartedAt] = useState<number>(Date.now());

  const sockRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const billedMinutesRef = useRef(0);
  const endingRef = useRef(false);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  function goBackToArea() {
    if (role === "consultor") {
      router.push("/consultor");
    } else {
      router.push("/cliente");
    }
  }

  function broadcastSessionEnded() {
    try {
      localStorage.setItem(
        "sacraluna_session_end",
        JSON.stringify({
          sessionId,
          at: Date.now(),
        })
      );
    } catch {}
  }

  async function endSessionSilently() {
    try {
      await fetch("/api/chat/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });
    } catch {}
  }

  function tocarAlertaSeAtivado() {
    try {
      const ativo = localStorage.getItem("sacraluna_alertas_ativos");
      if (ativo !== "1") return;

      if (!alertAudioRef.current) {
        alertAudioRef.current = new Audio("/alert.mp3");
        alertAudioRef.current.volume = 1;
      }

      alertAudioRef.current.currentTime = 0;
      alertAudioRef.current.play().catch(() => {});
    } catch {}
  }

  async function handleOutOfBalance() {
    if (endingRef.current) return;
    endingRef.current = true;

    alert("O teu saldo esgotou-se. A sessão vai terminar.");

    await endSessionSilently();
    broadcastSessionEnded();

    try {
      sockRef.current?.emit("session_end", { sessionId });
    } catch {}

    goBackToArea();
  }

  useEffect(() => {
    if (!sessionId) {
      setErr("Sessão em falta. Inicia o chat a partir da página principal.");
    }
  }, [sessionId]);

  useEffect(() => {
    function onStorage(ev: StorageEvent) {
      if (ev.key !== "sacraluna_session_end" || !ev.newValue) return;

      try {
        const data = JSON.parse(ev.newValue);
        if (data?.sessionId !== sessionId) return;

        alert("A consulta terminou.");
        goBackToArea();
      } catch {}
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [sessionId, role, router]);
 useEffect(() => {
    if (!sessionId) {
      setErr("Sessão em falta. Inicia o chat a partir da página principal.");
    }
  }, [sessionId]);

  useEffect(() => {
    function onStorage(ev: StorageEvent) {
      if (ev.key !== "sacraluna_session_end" || !ev.newValue) return;

      try {
        const data = JSON.parse(ev.newValue);
        if (data?.sessionId !== sessionId) return;

        alert("A consulta terminou.");
        goBackToArea();
      } catch {}
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [sessionId, role, router]);

  useEffect(() => {
    async function validarSessao() {
      if (!sessionId) return;

      try {
        setSessionValidated(false);

        const res = await fetch(
          `/api/chat/session-status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Não foi possível validar a sessão.");
        }

        const status = String(json?.session?.status ?? "");

        if (status === "rejected") {
          alert("A consulta foi rejeitada.");
          goBackToArea();
          return;
        }

        if (status === "pending") {
          alert("A consulta ainda não foi aceite.");
          goBackToArea();
          return;
        }

        if (status === "ended") {
          alert("Esta sessão já terminou.");
          goBackToArea();
          return;
        }

        if (status !== "active") {
          throw new Error("Sessão inválida para o chat.");
        }

        setSessionValidated(true);
      } catch (e: any) {
        setErr(e?.message || "Erro ao validar sessão.");
      }
    }

    validarSessao();
  }, [sessionId, role, router]);

  useEffect(() => {
    async function carregarInfo() {
      if (!Number.isFinite(consultorId) || consultorId <= 0 || !sessionId) return;

      try {
        setLoadingInfo(true);
        setErr(null);

        const resConsultor = await fetch(`/api/consultores/${consultorId}`, {
          cache: "no-store",
        });

        const jsonConsultor = await resConsultor.json().catch(() => null);

        if (!resConsultor.ok) {
          throw new Error(jsonConsultor?.error || "Erro ao carregar consultor.");
        }

        const c = jsonConsultor?.consultor ?? jsonConsultor;

        setConsultor({
          id: Number(c?.id ?? consultorId),
          nome: String(c?.nome ?? `Consultor ${consultorId}`),
          valor_min_eur: Number(
            c?.valor_min_eur ?? c?.preco_por_min ?? c?.valor_min ?? 0
          ),
          ativo: Number(c?.ativo ?? 0),
        });

        if (role === "cliente") {
          const resCliente = await fetch("/api/cliente/me", { cache: "no-store" });
          const jsonCliente = await resCliente.json().catch(() => null);

          if (resCliente.status === 401) {
            router.push("/login");
            return;
          }

          if (!resCliente.ok) {
            throw new Error(jsonCliente?.error || "Erro ao carregar dados do cliente.");
          }

          setSaldoCliente(Number(jsonCliente?.saldo_eur ?? 0));
        }
      } catch (e: any) {
        setErr(e?.message || "Erro ao carregar informações do chat.");
      } finally {
        setLoadingInfo(false);
      }
    }

    if (sessionValidated) {
      carregarInfo();
    }
  }, [consultorId, router, sessionId, role, sessionValidated]);
   useEffect(() => {
    if (!sessionId || !sessionValidated) return;

    setErr(null);

    if (!socketBaseUrl) {
      setErr("URL do servidor realtime em falta.");
      return;
    }

    if (sockRef.current) {
      sockRef.current.disconnect();
      sockRef.current = null;
    }

    const socket = io(socketBaseUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 8000,
      withCredentials: true,
    });

    sockRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", { sessionId });

      if (role === "consultor" && Number.isFinite(consultorId) && consultorId > 0) {
        socket.emit("register_consultor", { consultorId });
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (error: any) => {
      setConnected(false);
      setErr(
        error?.message
          ? `Não consegui ligar ao servidor do chat: ${error.message}`
          : "Não consegui ligar ao servidor do chat."
      );
    });

    socket.on("msg", (m: any) => {
      if (!m?.text) return;

      const msg: Msg = {
        sessionId: m.sessionId,
        text: m.text,
        senderRole: m.senderRole === "consultor" ? "consultor" : "cliente",
        at: m.at || Date.now(),
      };

      setMsgs((prev) => [...prev, msg]);
    });

    socket.on("call_status", async (payload: any) => {
      if (!payload || payload.sessionId !== sessionId) return;

      if (payload.status === "rejected") {
        await endSessionSilently();
        broadcastSessionEnded();

        if (role === "cliente") {
          alert("O consultor rejeitou a consulta.");
        } else {
          alert("Consulta rejeitada.");
        }

        socket.disconnect();
        goBackToArea();
      }
    });

    socket.on("session_ended", async (payload: any) => {
      if (payload?.reason === "rejected") {
        await endSessionSilently();
        broadcastSessionEnded();

        if (role === "cliente") {
          alert("O consultor rejeitou a consulta.");
        } else {
          alert("Consulta rejeitada.");
        }
      } else {
        broadcastSessionEnded();
        alert("A consulta terminou.");
      }

      socket.disconnect();
      goBackToArea();
    });

    return () => {
      socket.disconnect();
      sockRef.current = null;
    };
  }, [sessionId, consultorId, role, router, socketBaseUrl, sessionValidated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  useEffect(() => {
    if (!sessionValidated) return;

    const t = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - chatStartedAt) / 1000));
    }, 1000);

    return () => clearInterval(t);
  }, [chatStartedAt, sessionValidated]);

  useEffect(() => {
    billedMinutesRef.current = Math.floor(billedSeconds / 60);
  }, [billedSeconds]);

  useEffect(() => {
    if (!sessionValidated) return;
    if (role !== "cliente") return;

    async function cobrarMinuto() {
      try {
        const res = await fetch("/api/chat/bill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
          }),
        });

        const json = await res.json().catch(() => null);

        if (res.status === 402 || json?.code === "INSUFFICIENT_BALANCE") {
          await handleOutOfBalance();
          return;
        }

        if (!res.ok || !json?.ok) {
          if (json?.code === "SESSION_NOT_ACTIVE") {
            return;
          }

          setErr(json?.error || "Erro ao cobrar o minuto da sessão.");
          return;
        }

        setSaldoCliente(Number(json?.wallet_balance ?? 0));
        setBilledSeconds(Number(json?.billed_seconds ?? 0));
        setTotalCharged(Number(json?.total_charged_eur ?? 0));
        setConsultorEarned(Number(json?.consultor_earned_eur ?? 0));
      } catch {
        setErr("Erro ao comunicar com a cobrança da sessão.");
      }
    }

    const minutosDecorridos = Math.floor(elapsedSeconds / 60);

    if (
      sessionId &&
      minutosDecorridos > 0 &&
      minutosDecorridos > billedMinutesRef.current
    ) {
      billedMinutesRef.current = minutosDecorridos;
      cobrarMinuto();
    }
  }, [elapsedSeconds, sessionId, sessionValidated, role]);

  useEffect(() => {
    function endByBeacon() {
      if (!sessionId) return;

      try {
        navigator.sendBeacon(
          "/api/chat/end",
          new Blob([JSON.stringify({ session_id: sessionId })], {
            type: "application/json",
          })
        );
      } catch {}
    }

    window.addEventListener("beforeunload", endByBeacon);

    return () => {
      window.removeEventListener("beforeunload", endByBeacon);
    };
  }, [sessionId]);
 async function terminarConsulta() {
    if (!sessionId || endingRef.current) return;

    endingRef.current = true;

    try {
      await fetch("/api/chat/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });
    } catch {}

    broadcastSessionEnded();

    try {
      sockRef.current?.emit("session_end", { sessionId });
    } catch {}

    goBackToArea();
  }

  function send() {
    const t = text.trim();
    if (!t) return;

    if (!sockRef.current || !connected) {
      setErr("Sem ligação ao chat. Confirma o servidor realtime.");
      return;
    }

    const payload = {
      sessionId,
      text: t,
      senderRole: role,
    };

    sockRef.current.emit("msg", payload);
    setText("");
  }

  if (!Number.isFinite(consultorId) || consultorId <= 0) {
    return (
      <div style={styles.page}>
        <button style={styles.navBtn} onClick={() => router.push("/")}>
          ← Início
        </button>
        <div style={styles.errBox}>
          <b>Chat inválido</b>
          <div>ID de consultor inválido.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button style={styles.navBtn} onClick={() => router.push("/")}>
          ← Início
        </button>
        <button
          style={styles.navBtn}
          onClick={() => router.push(`/consultores/${consultorId}`)}
        >
          ← Perfil
        </button>
        <button style={styles.endBtn} onClick={terminarConsulta}>
          Terminar consulta
        </button>
      </div>

      <h1 style={styles.h1}>Chat</h1>

      {loadingInfo ? (
        <div style={{ opacity: 0.8, marginBottom: 12 }}>
          A carregar informações da sessão…
        </div>
      ) : (
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Consultor</span>
            <span style={styles.infoValue}>
              {consultor?.nome ?? `Consultor ${consultorId}`}
            </span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Preço por minuto</span>
            <span style={styles.infoValue}>
              {Number(consultor?.valor_min_eur ?? 0).toFixed(2)}€/min
            </span>
          </div>

          {role === "cliente" && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Saldo disponível</span>
              <span style={styles.infoValue}>{saldoCliente.toFixed(2)}€</span>
            </div>
          )}

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Tempo da sessão</span>
            <span style={styles.infoValue}>{formatDuration(elapsedSeconds)}</span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Tempo cobrado</span>
            <span style={styles.infoValue}>{formatDuration(billedSeconds)}</span>
          </div>

          {role === "cliente" && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Total gasto</span>
              <span style={styles.infoValue}>{totalCharged.toFixed(2)}€</span>
            </div>
          )}

          {role === "consultor" && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Ganho da sessão</span>
              <span style={styles.infoValue}>{consultorEarned.toFixed(2)}€</span>
            </div>
          )}

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Sessão</span>
            <span style={styles.infoValueSmall} title={sessionId || ""}>
              {shortSessionId(sessionId)}
            </span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Estado</span>
            <span
              style={{
                ...styles.infoValue,
                color: connected ? "#7dffb1" : "#ff9a9a",
              }}
            >
              {connected ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      )}

      {err && <div style={styles.err}>Erro: {err}</div>}

      <div style={styles.chatBox}>
        {msgs.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Sem mensagens ainda.</div>
        ) : (
          msgs.map((m, i) => (
            <div
              key={i}
              style={{
                ...styles.msg,
                ...(m.senderRole === role ? styles.msgMe : styles.msgOther),
              }}
            >
              <div style={styles.msgRole}>
                {m.senderRole === role
                  ? "Tu"
                  : role === "consultor"
                  ? "Cliente"
                  : "Consultor"}
              </div>
              <div style={styles.msgText}>{m.text}</div>
              <div style={styles.msgTime}>{new Date(m.at).toLocaleTimeString()}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreve a tua mensagem…"
          style={styles.input}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button style={styles.sendBtn} onClick={send}>
          Enviar
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "22px 18px 30px",
    color: "#fff",
    background:
      "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
  },
  topBar: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  navBtn: {
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(0,0,0,0.20)",
    color: "#f4d78b",
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },
  endBtn: {
    borderRadius: 12,
    border: "1px solid rgba(255,120,120,0.55)",
    background: "rgba(120,0,0,0.30)",
    color: "#ffd0d0",
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },
  h1: { margin: "6px 0 12px", fontSize: 30, fontWeight: 950 },
  infoCard: {
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.25)",
    background: "rgba(0,0,0,0.25)",
    padding: 14,
    marginBottom: 14,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "6px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  infoLabel: {
    opacity: 0.8,
    fontWeight: 700,
  },
  infoValue: {
    fontWeight: 900,
    color: "#f4d78b",
  },
  infoValueSmall: {
    fontWeight: 700,
    opacity: 0.9,
    fontSize: 12,
    wordBreak: "break-all",
    textAlign: "right",
  },
  err: { color: "#ffb4b4", marginBottom: 10 },
  errBox: {
    border: "1px solid rgba(255,180,180,0.5)",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  chatBox: {
    minHeight: 340,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    padding: 12,
    overflow: "auto",
  },
  msg: {
    maxWidth: 520,
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 10,
    border: "1px solid rgba(255,255,255,0.10)",
  },
  msgMe: { marginLeft: "auto", background: "rgba(212,175,55,0.12)" },
  msgOther: { marginRight: "auto", background: "rgba(26,63,130,0.18)" },
  msgRole: { fontSize: 12, fontWeight: 900, opacity: 0.85 },
  msgText: { marginTop: 6, whiteSpace: "pre-wrap" },
  msgTime: { marginTop: 6, fontSize: 11, opacity: 0.65 },
  inputRow: { display: "flex", gap: 10, marginTop: 12 },
  input: {
    flex: 1,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "12px 12px",
    outline: "none",
  },
  sendBtn: {
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.95)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 950,
    cursor: "pointer",
    padding: "12px 16px",
  },
}; 