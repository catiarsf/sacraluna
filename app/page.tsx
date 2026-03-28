"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Hero from "@/components/Hero";
import Testemunhos from "@/components/Testemunhos";

type Consultor = {
  id: number;
  nome: string;
  foto_url: string | null;
  especialidades: string | null;
  apresentacao: string | null;
  apresentacao_curta: string | null;
  apresentacao_longa: string | null;
  valor_min_eur: number;
  preco_chat?: number;
  preco_voz?: number;
  ativo: number;
  destaque?: number;
  online?: number;
  ocupado?: number;
};

function normalizeFotoUrl(url: string | null) {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (!u.startsWith("/")) return `/${u}`;
  return u;
}

function getValorMinEur(c: any): number {
  const raw =
    c?.valor_min_eur ??
    c?.valor_min ??
    c?.valor_por_minuto ??
    c?.valor_minuto_eur;

  const n = Number.parseFloat(String(raw ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getPrecoChat(c: any): number {
  const raw =
    c?.preco_chat ??
    c?.valor_chat_eur ??
    c?.chat_preco_eur ??
    getValorMinEur(c);

  const n = Number.parseFloat(String(raw ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getPrecoVoz(c: any): number {
  const raw =
    c?.preco_voz ??
    c?.valor_voz_eur ??
    c?.voz_preco_eur ??
    getValorMinEur(c);

  const n = Number.parseFloat(String(raw ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getStatusRank(c: Consultor) {
  const ativo = Number(c.ativo ?? 0) === 1;
  const online = Number(c.online ?? 0) === 1;
  const ocupado = Number(c.ocupado ?? 0) === 1;

  if (ativo && online && !ocupado) return 0;
  if (ativo && online && ocupado) return 1;
  return 2;
}

function normalizeName(nome?: string | null) {
  return String(nome ?? "")
    .trim()
    .toLocaleLowerCase("pt-PT");
}

function isRaquel(c: Consultor) {
  const nome = normalizeName(c.nome);
  return nome === "raquel" || nome === "raquel ferreira";
}

function sortAlphabetic(a: Consultor, b: Consultor) {
  return (a.nome || "").localeCompare(b.nome || "", "pt", {
    sensitivity: "base",
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function HomePage() {
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    fetch("/api/consultores")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Erro (${res.status})`);

        const list = Array.isArray(data) ? data : data?.consultores;
        if (!Array.isArray(list)) throw new Error("Resposta inválida");
        return list as Consultor[];
      })
      .then((list) => setConsultores(list))
      .catch((e) => setErr(e?.message || "Erro ao carregar consultores"))
      .finally(() => setLoading(false));
  }, []);

  const { featured, others } = useMemo(() => {
    const sortedAll = [...consultores].sort((a, b) => {
      const rankDiff = getStatusRank(a) - getStatusRank(b);
      if (rankDiff !== 0) return rankDiff;
      return sortAlphabetic(a, b);
    });

    const featuredRaw = sortedAll.filter((c) => Number(c.destaque ?? 0) === 1);

    const featuredSorted = [...featuredRaw].sort((a, b) => {
      const aRaquel = isRaquel(a);
      const bRaquel = isRaquel(b);

      if (aRaquel && !bRaquel) return -1;
      if (!aRaquel && bRaquel) return 1;

      const rankDiff = getStatusRank(a) - getStatusRank(b);
      if (rankDiff !== 0) return rankDiff;

      return sortAlphabetic(a, b);
    });

    const featuredIds = new Set(featuredSorted.map((c) => c.id));
    const rest = sortedAll.filter((c) => !featuredIds.has(c.id));

    return {
      featured: featuredSorted,
      others: rest,
    };
  }, [consultores]);

  return (
    <div style={styles.page}>
      <Hero />

      {featured.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Consultores em destaque</h2>

          <div style={styles.featureGrid}>
            {featured.map((c) => (
              <ConsultorCard key={c.id} c={c} variant="featured" />
            ))}
          </div>
        </section>
      )}

      <section id="consultores" style={styles.section}>
        <h2 style={styles.sectionTitle}>Consultores disponíveis</h2>

        {loading && (
          <div style={{ opacity: 0.75, marginTop: 10, textAlign: "center" }}>
            A carregar…
          </div>
        )}

        {err && <div style={styles.err}>Erro: {err}</div>}

        {!loading && !err && others.length > 0 && (
          <div style={styles.grid}>
            {others.map((c) => (
              <ConsultorCard key={c.id} c={c} variant="grid" />
            ))}
          </div>
        )}

        {!loading && !err && consultores.length === 0 && (
          <div style={{ opacity: 0.7, marginTop: 10, textAlign: "center" }}>
            Ainda não há consultores disponíveis.
          </div>
        )}

        {!loading && !err && consultores.length > 0 && others.length === 0 && (
          <div style={{ opacity: 0.7, marginTop: 10, textAlign: "center" }}>
            Todos os consultores atuais estão em destaque.
          </div>
        )}
      </section>

      <section style={styles.testemunhosSection}>
        <Testemunhos />
      </section>
    </div>
  );
}

function ConsultorCard({
  c,
  variant,
}: {
  c: Consultor;
  variant: "featured" | "grid";
}) {
  const router = useRouter();
  const foto = normalizeFotoUrl(c.foto_url);

  const isFeatured = variant === "featured";
  const S = isFeatured ? featuredCard : gridCard;

  const hrefPerfil = `/consultores/${c.id}`;

  const ativo = Number(c.ativo ?? 0) === 1;
  const online = Number(c.online ?? 0) === 1;
  const ocupado = Number(c.ocupado ?? 0) === 1;

  const [creatingChat, setCreatingChat] = useState(false);
  const [waitingText, setWaitingText] = useState<string | null>(null);

  const statusText = !ativo
    ? "Indisponível"
    : !online
    ? "Offline"
    : ocupado
    ? "Ocupado"
    : "Disponível";

  const statusColor = !ativo
    ? "#ff6b6b"
    : !online
    ? "#c7c7c7"
    : ocupado
    ? "#ffd36b"
    : "#7dffb1";

  async function iniciarChamada(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!ativo || !online || ocupado) {
      alert("Este consultor não está disponível neste momento.");
      return;
    }

    try {
      const res = await fetch("/api/twilio/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultorId: c.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        alert(data?.error || "Não foi possível iniciar a chamada.");
        return;
      }

      alert("A chamada está a ser iniciada. A consultora será contactada primeiro.");
    } catch {
      alert("Erro ao iniciar chamada.");
    }
  }

  async function iniciarPedidoChat(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!ativo || !online || ocupado) {
      alert("Este consultor não está disponível neste momento.");
      return;
    }

    try {
      setCreatingChat(true);
      setWaitingText("A enviar pedido para a consultora...");

      const res = await fetch("/api/chat/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultor_id: c.id,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setWaitingText(null);
        alert(json?.error || "Erro ao iniciar pedido de chat.");
        return;
      }

      const sessionId = String(json?.session_id ?? "");

      if (!sessionId) {
        setWaitingText(null);
        alert("Consulta inválida.");
        return;
      }

      if (json?.status === "active") {
        router.push(
          `/chat/${c.id}?session=${encodeURIComponent(sessionId)}&role=cliente`
        );
        return;
      }

      setWaitingText("A aguardar resposta da consultora...");

      for (let i = 0; i < 40; i++) {
        await sleep(3000);

        const statusRes = await fetch(
          `/api/chat/session-status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );

        const statusJson = await statusRes.json().catch(() => ({}));

        if (!statusRes.ok || !statusJson?.ok) {
          continue;
        }

        const status = String(statusJson?.session?.status ?? "");

        if (status === "active") {
          setWaitingText(null);
          router.push(
            `/chat/${c.id}?session=${encodeURIComponent(sessionId)}&role=cliente`
          );
          return;
        }

        if (status === "rejected") {
          setWaitingText(null);
          alert("A consultora rejeitou o pedido.");
          return;
        }

        if (status === "ended") {
          setWaitingText(null);
          alert("A consulta terminou antes de começar.");
          return;
        }
      }

      setWaitingText(null);
      alert("A consultora não respondeu a tempo.");
    } catch {
      setWaitingText(null);
      alert("Erro ao iniciar pedido de chat.");
    } finally {
      setCreatingChat(false);
    }
  }

  return (
    <div
      style={S.card}
      role="button"
      tabIndex={0}
      onClick={() => router.push(hrefPerfil)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(hrefPerfil);
      }}
    >
      <div style={S.imageBox}>
        {foto ? (
          <img src={foto} alt={c.nome} style={S.image} />
        ) : (
          <div style={S.placeholder}>
            <div style={S.placeholderIcon}>🌙</div>
            <div style={S.placeholderText}>Sem foto</div>
          </div>
        )}
      </div>

      <div style={S.body}>
        <div style={S.name}>{c.nome}</div>

        <div style={{ ...S.status, color: statusColor }}>{statusText}</div>

        <div style={S.priceWrap}>
          <div style={S.priceBlock}>
            <div style={S.priceLabel}>CHAT</div>
            <div style={S.priceRow}>
              <span style={S.priceValue}>{getPrecoChat(c).toFixed(2)}€</span>
              <span style={S.priceUnit}>/min</span>
            </div>
          </div>

          <div style={S.priceBlock}>
            <div style={S.priceLabel}>VOZ</div>
            <div style={S.priceRow}>
              <span style={S.priceValue}>{getPrecoVoz(c).toFixed(2)}€</span>
              <span style={S.priceUnit}>/min</span>
            </div>
          </div>
        </div>

        <div style={S.specWrap}>
          {c.especialidades ? (
            <div style={S.spec}>{c.especialidades}</div>
          ) : (
            <div style={S.spec}> </div>
          )}
        </div>

        {waitingText && <div style={S.waitingBox}>{waitingText}</div>}

        <div style={S.btns}>
          <button
            type="button"
            style={S.btnGold}
            onClick={iniciarPedidoChat}
            disabled={creatingChat}
          >
            {creatingChat ? "AGUARDA..." : "CHAT"}
          </button>

          <button type="button" style={S.btnBlue} onClick={iniciarChamada}>
            VOZ
          </button>

          <button
            type="button"
            style={S.btnPurple}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/email/${c.id}`);
            }}
          >
            EMAIL
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "14px 12px 48px",
    color: "#fff",
    backgroundImage: "url('/fundo.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },

  section: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "10px 0",
  },

  testemunhosSection: {
    maxWidth: 1180,
    margin: "12px auto 0",
    padding: "8px 0 18px",
  },

  sectionTitle: {
    margin: "4px 0 14px",
    textAlign: "center",
    fontSize: "clamp(28px, 7vw, 34px)",
    lineHeight: 1.1,
    fontWeight: 950,
    letterSpacing: 0.3,
    color: "#f7df99",
    textShadow:
      "0 0 14px rgba(212,175,55,0.35), 0 0 26px rgba(212,175,55,0.22), 0 8px 22px rgba(0,0,0,0.55)",
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    alignItems: "start",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    alignItems: "start",
  },

  err: {
    color: "#ffb4b4",
    marginTop: 10,
    textAlign: "center",
  },
};

const featuredCard: Record<string, React.CSSProperties> = {
  card: {
    width: "100%",
    minHeight: 470,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(0,0,0,0.22)",
    cursor: "pointer",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(4px)",
  },

  imageBox: {
    position: "relative",
    height: 210,
    background: "rgba(0,0,0,0.25)",
    flexShrink: 0,
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  placeholder: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    opacity: 0.9,
  },

  placeholderIcon: {
    fontSize: 24,
  },

  placeholderText: {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.85,
  },

  body: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },

  name: {
    fontSize: 20,
    fontWeight: 900,
    minHeight: 46,
    display: "flex",
    alignItems: "center",
    lineHeight: 1.15,
  },

  status: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: 900,
    minHeight: 20,
  },

  priceWrap: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    minHeight: 62,
  },

  priceBlock: {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: "8px 10px",
    background: "rgba(255,255,255,0.04)",
  },

  priceLabel: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.8,
    color: "#f4d78b",
    opacity: 0.95,
    marginBottom: 4,
  },

  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },

  priceValue: {
    fontSize: 20,
    fontWeight: 900,
    color: "#f4d78b",
  },

  priceUnit: {
    fontSize: 12,
    opacity: 0.8,
  },

  specWrap: {
    marginTop: 10,
    minHeight: 54,
  },

  spec: {
    fontSize: 13,
    opacity: 0.85,
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical" as any,
    overflow: "hidden",
  },

  waitingBox: {
    marginTop: 10,
    padding: "8px 10px",
    borderRadius: 10,
    background: "rgba(26,63,130,0.35)",
    border: "1px solid rgba(140,180,255,0.25)",
    color: "#dce8ff",
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
  },

  btns: {
    marginTop: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    paddingTop: 14,
  },

  btnGold: {
    padding: "10px 8px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.95)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 950,
    fontSize: 13,
    cursor: "pointer",
  },

  btnBlue: {
    padding: "10px 8px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(26,63,130,0.55)",
    color: "#f4d78b",
    fontWeight: 950,
    fontSize: 13,
    cursor: "pointer",
  },

  btnPurple: {
    padding: "10px 8px",
    borderRadius: 12,
    border: "1px solid rgba(200,140,255,0.55)",
    background: "rgba(120,70,180,0.55)",
    color: "#fff",
    fontWeight: 950,
    fontSize: 13,
    cursor: "pointer",
  },
};

const gridCard: Record<string, React.CSSProperties> = {
  ...featuredCard,

  card: {
    ...featuredCard.card,
    minHeight: 430,
    borderRadius: 16,
  },

  imageBox: {
    ...featuredCard.imageBox,
    height: 180,
  },

  name: {
    ...featuredCard.name,
    fontSize: 18,
    minHeight: 42,
  },

  priceWrap: {
    ...featuredCard.priceWrap,
    gap: 8,
    minHeight: 58,
  },

  priceBlock: {
    ...featuredCard.priceBlock,
    padding: "7px 8px",
  },

  priceValue: {
    ...featuredCard.priceValue,
    fontSize: 16,
  },

  priceUnit: {
    ...featuredCard.priceUnit,
    fontSize: 11,
  },

  specWrap: {
    ...featuredCard.specWrap,
    minHeight: 56,
  },
};