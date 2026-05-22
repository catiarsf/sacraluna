"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

type Role = "cliente" | "consultor";

type Msg = {
  sessionId: string;
  text: string;
  senderRole: Role;
  at: number;
};

type SessionInfo = {
  id: string;
  cliente_nome: string;
  consultor_nome: string;
  status: string;
  price_per_min: number;
  price_per_second: number;
  billed_seconds: number;
  total_charged_eur: number;
  consultor_earned_eur: number;
};

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();

  const role = useMemo<Role>(() => {
    return sp.get("role") === "consultor"
      ? "consultor"
      : "cliente";
  }, [sp]);

  const sessionId = useMemo(() => {
    return String(sp.get("session") || "").trim();
  }, [sp]);

  const consultorId = useMemo(() => {
    const raw = (params as any)?.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);

    return Number.isFinite(n) ? n : 0;
  }, [params]);

  const socketBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined"
        ? window.location.origin
        : "")
    );
  }, []);

  const [connected, setConnected] = useState(false);
  const [err, setErr] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");

  const [sessionInfo, setSessionInfo] =
    useState<SessionInfo | null>(null);

  const [saldoCliente, setSaldoCliente] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  const sockRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const endingRef = useRef(false);

  const startedAtRef = useRef(Date.now());

  function goBack() {
    router.push(
      role === "consultor"
        ? "/consultor"
        : "/cliente"
    );
  }

  async function carregarSessao() {
    if (!sessionId) {
      throw new Error("Sessão em falta.");
    }

    const res = await fetch(
      `/api/chat/session-status?session_id=${encodeURIComponent(
        sessionId
      )}`,
      {
        cache: "no-store",
      }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      throw new Error(
        json?.error || "Erro ao carregar sessão."
      );
    }

    if (String(json.session?.status) !== "active") {
      throw new Error(
        "Esta consulta já não está ativa."
      );
    }

    setSessionInfo(json.session);
  }

  async function carregarCliente() {
    if (role !== "cliente") return;

    const res = await fetch("/api/cliente/me", {
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    if (res.ok) {
      setSaldoCliente(
        Number(json?.saldo_eur ?? 0)
      );
    }
  }

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setErr("");

        await carregarSessao();
        await carregarCliente();
      } catch (e: any) {
        setErr(
          e?.message || "Erro ao iniciar chat."
        );
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [sessionId, role]);

  useEffect(() => {
    if (!sessionId || loading || err) return;

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

      socket.emit("join", {
        sessionId,
      });

      if (
        role === "consultor" &&
        consultorId > 0
      ) {
        socket.emit(
          "register_consultor",
          {
            consultorId,
          }
        );
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on(
      "connect_error",
      (error: any) => {
        setConnected(false);

        setErr(
          error?.message ||
            "Erro ao ligar ao chat."
        );
      }
    );
socket.on("msg", (m: any) => {
      if (!m?.text) return;

      const incoming: Msg = {
        sessionId: String(
          m.sessionId || sessionId
        ),
        text: String(m.text),
        senderRole:
          m.senderRole === "consultor"
            ? "consultor"
            : "cliente",
        at: Number(m.at || Date.now()),
      };

      setMsgs((prev) => [
        ...prev,
        incoming,
      ]);
    });

    socket.on("session_ended", () => {
      alert("A consulta terminou.");

      socket.disconnect();

      goBack();
    });

    return () => {
      socket.disconnect();
      sockRef.current = null;
    };
  }, [
    sessionId,
    loading,
    err,
    role,
    consultorId,
    socketBaseUrl,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [msgs.length]);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsedSeconds(
        Math.floor(
          (Date.now() -
            startedAtRef.current) /
            1000
        )
      );
    }, 1000);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (role !== "cliente") return;

    if (!sessionId || loading || err)
      return;

    async function cobrar() {
      try {
        const res = await fetch(
          "/api/chat/bill",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              sessionId,
            }),
          }
        );

        const json = await res
          .json()
          .catch(() => null);

        if (
          res.status === 402 ||
          json?.code ===
            "INSUFFICIENT_BALANCE"
        ) {
          if (endingRef.current) return;

          endingRef.current = true;

          alert(
            "O teu saldo terminou. A consulta vai encerrar."
          );

          try {
            await fetch(
              "/api/chat/end",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  session_id: sessionId,
                }),
              }
            );
          } catch {}

          try {
            sockRef.current?.emit(
              "session_end",
              {
                sessionId,
              }
            );
          } catch {}

          goBack();

          return;
        }

        if (!res.ok || !json?.ok)
          return;

        setSaldoCliente(
          Number(
            json.wallet_balance ?? 0
          )
        );

        setSessionInfo((prev) =>
          prev
            ? {
                ...prev,

                billed_seconds: Number(
                  json.billed_seconds ??
                    prev.billed_seconds
                ),

                total_charged_eur:
                  Number(
                    json.total_charged_eur ??
                      prev.total_charged_eur
                  ),

                consultor_earned_eur:
                  Number(
                    json.consultor_earned_eur ??
                      prev.consultor_earned_eur
                  ),
              }
            : prev
        );
      } catch {}
    }

    const interval = setInterval(
      cobrar,
      1000
    );

    return () =>
      clearInterval(interval);
  }, [
    role,
    sessionId,
    loading,
    err,
  ]);

  async function terminarConsulta() {
    if (
      !sessionId ||
      endingRef.current
    )
      return;

    endingRef.current = true;

    try {
      await fetch("/api/chat/end", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });
    } catch {}

    try {
      sockRef.current?.emit(
        "session_end",
        {
          sessionId,
        }
      );
    } catch {}

    goBack();
  }

  async function send() {
    const t = text.trim();

    if (!t) return;

    if (
      !sockRef.current ||
      !connected
    ) {
      setErr("Sem ligação ao chat.");
      return;
    }

    const payload = {
      sessionId,
      text: t,
      senderRole: role,
    };

    sockRef.current.emit(
      "msg",
      payload
    );

    try {
      await fetch(
        "/api/chat/messages",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
    } catch {}

    setText("");
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          A carregar chat...
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main style={styles.page}>
        <button
          style={styles.navBtn}
          onClick={goBack}
        >
          ← Voltar
        </button>

        <div style={styles.errBox}>
          {err}
        </div>
      </main>
    );
  }

  const pricePerSecond = Number(
    sessionInfo?.price_per_second ??
      0
  );

  const saldoEmSegundos =
    role === "cliente" &&
    pricePerSecond > 0
      ? Math.floor(
          saldoCliente /
            pricePerSecond
        )
      : 0;

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <button
          style={styles.navBtn}
          onClick={goBack}
        >
          ← Voltar
        </button>

        <button
          style={styles.endBtn}
          onClick={terminarConsulta}
        >
          Terminar consulta
        </button>
      </div>

      <h1 style={styles.h1}>
        Consulta em chat
      </h1>
<section style={styles.infoCard}>
        {role === "consultor" ? (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>
              Cliente
            </span>

            <span style={styles.infoValue}>
              {sessionInfo?.cliente_nome ||
                "Cliente"}
            </span>
          </div>
        ) : (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>
              Consultor
            </span>

            <span style={styles.infoValue}>
              {sessionInfo?.consultor_nome ||
                "Consultor"}
            </span>
          </div>
        )}

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>
            Preço/min
          </span>

          <span style={styles.infoValue}>
            {Number(
              sessionInfo?.price_per_min ??
                0
            ).toFixed(2)}
            €/min
          </span>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>
            Preço/seg
          </span>

          <span style={styles.infoValue}>
            {pricePerSecond.toFixed(4)}
            €/seg
          </span>
        </div>

        {role === "cliente" ? (
          <>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>
                Saldo
              </span>

              <span style={styles.infoValue}>
                {saldoCliente.toFixed(4)}€
              </span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>
                Tempo restante
              </span>

              <span style={styles.infoValue}>
                {formatDuration(
                  saldoEmSegundos
                )}
              </span>
            </div>
          </>
        ) : (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>
              Ganho
            </span>

            <span style={styles.infoValue}>
              {Number(
                sessionInfo?.consultor_earned_eur ??
                  0
              ).toFixed(4)}
              €
            </span>
          </div>
        )}

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>
            Tempo consulta
          </span>

          <span style={styles.infoValue}>
            {formatDuration(
              elapsedSeconds
            )}
          </span>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>
            Tempo cobrado
          </span>

          <span style={styles.infoValue}>
            {formatDuration(
              Number(
                sessionInfo?.billed_seconds ??
                  0
              )
            )}
          </span>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>
            Total cobrado
          </span>

          <span style={styles.infoValue}>
            {Number(
              sessionInfo?.total_charged_eur ??
                0
            ).toFixed(4)}
            €
          </span>
        </div>

        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>
            Estado
          </span>

          <span
            style={{
              ...styles.infoValue,
              color: connected
                ? "#7dffb1"
                : "#ff9a9a",
            }}
          >
            {connected
              ? "Online"
              : "Offline"}
          </span>
        </div>
      </section>

      <section style={styles.chatBox}>
        {msgs.length === 0 ? (
          <div style={styles.emptyBox}>
            Ainda não existem mensagens.
          </div>
        ) : (
          msgs.map((m, i) => {
            const mine =
              m.senderRole === role;

            return (
              <div
                key={`${m.at}-${i}`}
                style={{
                  ...styles.msgRow,
                  justifyContent: mine
                    ? "flex-end"
                    : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.msgBubble,

                    ...(mine
                      ? styles.msgMine
                      : styles.msgOther),
                  }}
                >
                  <div style={styles.msgRole}>
                    {m.senderRole === role
                      ? "Tu"
                      : m.senderRole ===
                        "consultor"
                      ? sessionInfo?.consultor_nome ||
                        "Consultor"
                      : sessionInfo?.cliente_nome ||
                        "Cliente"}
                  </div>

                  <div style={styles.msgText}>
                    {m.text}
                  </div>

                  <div style={styles.msgTime}>
                    {new Date(
                      m.at
                    ).toLocaleTimeString(
                      "pt-PT",
                      {
                        hour: "2-digit",
                        minute:
                          "2-digit",
                      }
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </section>

      <div style={styles.inputBar}>
        <input
          value={text}
          onChange={(e) =>
            setText(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escreve a tua mensagem..."
          style={styles.input}
        />

        <button
          onClick={send}
          style={styles.sendBtn}
        >
          Enviar
        </button>
      </div>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(to bottom, #050816, #0b1026)",
    color: "white",
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
    flexWrap: "wrap",
  },

  navBtn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 800,
    background:
      "rgba(255,255,255,0.12)",
    color: "white",
  },

  endBtn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 900,
    background:
      "linear-gradient(135deg,#ff4d6d,#b00020)",
    color: "white",
  },

  h1: {
    fontSize: 34,
    fontWeight: 900,
    marginBottom: 18,
  },

  infoCard: {
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    backdropFilter: "blur(10px)",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },

  infoLabel: {
    opacity: 0.8,
    fontWeight: 700,
  },

  infoValue: {
    fontWeight: 900,
    color: "#f4d78b",
  },

  chatBox: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
    borderRadius: 20,
    background:
      "rgba(0,0,0,0.25)",
    border:
      "1px solid rgba(255,255,255,0.08)",
  },

  emptyBox: {
    opacity: 0.7,
    textAlign: "center",
    marginTop: 40,
  },

  msgRow: {
    display: "flex",
    marginBottom: 14,
  },

  msgBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    padding: 14,
  },

  msgMine: {
    background:
      "linear-gradient(135deg,#d4af37,#f4d78b)",
    color: "#111",
  },

  msgOther: {
    background:
      "rgba(255,255,255,0.1)",
    color: "white",
  },

  msgRole: {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 6,
    opacity: 0.8,
    textTransform: "uppercase",
  },

  msgText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.45,
  },

  msgTime: {
    marginTop: 8,
    fontSize: 11,
    opacity: 0.7,
    textAlign: "right",
  },

  inputBar: {
    marginTop: 16,
    display: "flex",
    gap: 10,
  },

  input: {
    flex: 1,
    borderRadius: 14,
    border:
      "1px solid rgba(255,255,255,0.1)",
    background:
      "rgba(255,255,255,0.08)",
    color: "white",
    padding: "14px 16px",
    outline: "none",
    fontSize: 15,
  },

  sendBtn: {
    border: "none",
    borderRadius: 14,
    padding: "0 20px",
    cursor: "pointer",
    fontWeight: 900,
    background:
      "linear-gradient(135deg,#d4af37,#f4d78b)",
    color: "#111",
  },

  card: {
    background:
      "rgba(255,255,255,0.06)",
    padding: 24,
    borderRadius: 20,
  },

  errBox: {
    background:
      "rgba(255,0,0,0.12)",
    border:
      "1px solid rgba(255,0,0,0.25)",
    padding: 20,
    borderRadius: 16,
    color: "#ffb3b3",
    fontWeight: 700,
  },
};