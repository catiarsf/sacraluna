"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Consultor = {
  id: number;
  nome: string;
  email?: string;
  preco_por_min: number;
  foto_url: string | null;
  especialidades: string | null;
  apresentacao: string | null;
  ativo: number;
  destaque?: number;
};

function normalizeFotoUrl(url: string | null) {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (!u.startsWith("/")) return `/${u}`;
  return u;
}

export default function ConsultorPerfilPage() {
  const params = useParams();
  const router = useRouter();

  const idStr = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const idNum = Number(idStr);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [consultor, setConsultor] = useState<Consultor | null>(null);

  useEffect(() => {
    if (!idStr || !Number.isFinite(idNum) || idNum <= 0) {
      setLoading(false);
      setErr("ID inválido.");
      return;
    }

    setLoading(true);
    setErr(null);

    fetch(`/api/consultores/${idNum}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Erro (${res.status})`);
        return data as Consultor; // a tua API devolve o objeto direto
      })
      .then((c) => setConsultor(c))
      .catch((e) => setErr(e?.message || "Erro ao carregar consultor"))
      .finally(() => setLoading(false));
  }, [idStr, idNum]);

  const foto = normalizeFotoUrl(consultor?.foto_url ?? null);

  const textoApresentacao = useMemo(() => {
    const t = consultor?.apresentacao ?? "";
    return (t || "").trim();
  }, [consultor]);

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <button style={styles.backBtn} onClick={() => router.push("/")}>
          ← Voltar
        </button>

        {loading && <div style={{ opacity: 0.8 }}>A carregar…</div>}

        {!loading && err && (
          <div style={styles.errBox}>
            <div style={styles.errTitle}>Consultor inválido</div>
            <div style={styles.errText}>{err}</div>
          </div>
        )}

        {!loading && !err && consultor && (
          <div style={styles.card}>
            <div style={styles.left}>
              <div style={styles.imageBox}>
                {foto ? (
                  <img src={foto} alt={consultor.nome} style={styles.image} />
                ) : (
                  <div style={styles.placeholder}>🌙 Sem foto</div>
                )}
              </div>
            </div>

            <div style={styles.right}>
              <h2 style={styles.name}>{consultor.nome}</h2>
              <div style={styles.status}>
                {consultor.ativo ? "Disponível" : "Indisponível"}
              </div>

              <div style={styles.priceRow}>
                <span style={styles.priceValue}>
                  {Number(consultor.preco_por_min ?? 0).toFixed(2)}€
                </span>
                <span style={styles.priceUnit}>/min</span>
              </div>

              {consultor.especialidades ? (
                <div style={styles.spec}>{consultor.especialidades}</div>
              ) : null}

              <div style={styles.btns}>
                <button
                  style={styles.btnGold}
                  onClick={() => router.push(`/chat/${consultor.id}`)}
                >
                  Iniciar Chat
                </button>
                <button
                  style={styles.btnBlue}
                  onClick={() => router.push(`/voz/${consultor.id}`)}
                >
                  Chamada de Voz
                </button>
              </div>

              <div style={styles.sep} />

              <h3 style={styles.h3}>Apresentação</h3>
              <p style={styles.p}>
                {textoApresentacao ? textoApresentacao : "(Ainda sem apresentação.)"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "26px 18px 60px",
    color: "#fff",
    background:
      "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
  },
  wrap: { maxWidth: 1100, margin: "0 auto" },
  backBtn: {
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(0,0,0,0.20)",
    color: "#f4d78b",
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    marginBottom: 14,
  },
  errBox: {
    border: "1px solid rgba(255,180,180,0.5)",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 16,
  },
  errTitle: { fontWeight: 900, fontSize: 18, marginBottom: 6 },
  errText: { opacity: 0.9 },
  card: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 16,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(212,175,55,0.40)",
    background: "rgba(0,0,0,0.16)",
    boxShadow: "0 12px 34px rgba(0,0,0,0.55)",
  },
  left: { padding: 16 },
  right: { padding: 16 },
  imageBox: {
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(212,175,55,0.25)",
    background: "rgba(0,0,0,0.20)",
  },
  image: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  placeholder: {
    height: "100%",
    display: "grid",
    placeItems: "center",
    opacity: 0.85,
  },
  name: { margin: 0, fontSize: 26, fontWeight: 950 },
  status: { marginTop: 6, fontSize: 13, fontWeight: 900, color: "#7dffb1" },
  priceRow: { marginTop: 10, display: "flex", alignItems: "baseline", gap: 8 },
  priceValue: { fontSize: 24, fontWeight: 950, color: "#f4d78b" },
  priceUnit: { fontSize: 13, opacity: 0.8 },
  spec: { marginTop: 10, opacity: 0.9 },
  btns: { marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  btnGold: {
    padding: "11px 10px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.95)",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 950,
    cursor: "pointer",
  },
  btnBlue: {
    padding: "11px 10px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background:
      "linear-gradient(180deg, rgba(26,63,130,0.55) 0%, rgba(7,10,16,0.25) 100%)",
    color: "#f4d78b",
    fontWeight: 950,
    cursor: "pointer",
  },
  sep: { margin: "18px 0", height: 1, background: "rgba(255,255,255,0.08)" },
  h3: { margin: 0, fontSize: 18, fontWeight: 900, color: "#f4d78b" },
  p: { marginTop: 10, lineHeight: 1.5, opacity: 0.95, whiteSpace: "pre-wrap" },
};