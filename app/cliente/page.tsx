"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HistoricoItem = {
  id: number;
  data: string;
  duracao_min: number;
  total_eur: number;
  consultor_nome: string;
};

type ClienteData = {
  ok: boolean;
  id?: number;
  saldo_eur?: number;
  historico?: HistoricoItem[];
};

export default function ClientePage() {
  const router = useRouter();
  const [data, setData] = useState<ClienteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [creditoLoading, setCreditoLoading] = useState(false);

  async function atualizarSaldo() {
    try {
      const res = await fetch("/api/cliente/me", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) return;

      setData((prev) => ({
        ok: true,
        id: Number(json?.cliente?.id ?? json?.id ?? prev?.id ?? 0),
        saldo_eur: Number(json?.saldo_eur ?? prev?.saldo_eur ?? 0),
        historico: Array.isArray(json?.historico)
          ? json.historico
          : Array.isArray(prev?.historico)
          ? prev!.historico
          : [],
      }));
    } catch {}
  }

  function limparParametrosStripeDaUrl() {
    if (typeof window === "undefined") return;

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("wallet");
    cleanUrl.searchParams.delete("session_id");
    window.history.replaceState({}, "", cleanUrl.toString());
  }

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch("/api/cliente/me", {
          cache: "no-store",
        });

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setErro(json?.error || "Erro ao carregar dados.");
          setLoading(false);
          return;
        }

        setData({
          ok: Boolean(json?.ok),
          id: Number(json?.cliente?.id ?? json?.id ?? 0),
          saldo_eur: Number(json?.saldo_eur ?? 0),
          historico: Array.isArray(json?.historico) ? json.historico : [],
        });
      } catch {
        setErro("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [router]);

  async function comprarCreditos(valor: number) {
    try {
      if (!data?.id) {
        alert("Não foi possível identificar o cliente.");
        return;
      }

      setCreditoLoading(true);

      const res = await fetch("/api/stripe/wallet-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userType: "cliente",
          userId: data.id,
          amount: valor,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !json?.url) {
        alert(json?.error || "Erro ao criar checkout Stripe.");
        return;
      }

      window.location.href = json.url;
    } catch {
      alert("Erro ao iniciar pagamento.");
    } finally {
      setCreditoLoading(false);
    }
  }

  useEffect(() => {
    async function confirmarRetornoStripe() {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const walletStatus = params.get("wallet");
      const checkoutSessionId = params.get("session_id");

      if (walletStatus === "cancel") {
        alert("Pagamento cancelado.");
        limparParametrosStripeDaUrl();
        return;
      }

      if (walletStatus !== "success") {
        return;
      }

      if (!checkoutSessionId) {
        await atualizarSaldo();
        limparParametrosStripeDaUrl();
        return;
      }

      try {
        const res = await fetch("/api/stripe/confirm-wallet-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: checkoutSessionId,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          alert(json?.error || "Erro ao confirmar pagamento.");
          return;
        }

        if (json?.pending) {
          await atualizarSaldo();
          alert("Pagamento recebido, mas ainda está a ser confirmado. Atualiza novamente dentro de instantes.");
          limparParametrosStripeDaUrl();
          return;
        }

        await atualizarSaldo();

        if (json?.credited || json?.already_confirmed) {
          alert("Saldo atualizado com sucesso.");
        }

        limparParametrosStripeDaUrl();
      } catch {
        alert("Erro ao confirmar o pagamento.");
      }
    }

    confirmarRetornoStripe();
  }, []);

  async function terminarSessao() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <h1 style={styles.h1}>Área do Cliente</h1>
        <p>A carregar...</p>
      </main>
    );
  }

  if (erro) {
    return (
      <main style={styles.page}>
        <h1 style={styles.h1}>Área do Cliente</h1>
        <p style={styles.error}>{erro}</p>
      </main>
    );
  }

  const saldo = Number(data?.saldo_eur ?? 0);
  const historico = Array.isArray(data?.historico) ? data.historico : [];

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Área do Cliente</h1>

      <div style={styles.card}>
        <h2 style={styles.h2}>Saldo / Créditos</h2>
        <p style={styles.saldo}>{saldo.toFixed(2)}€</p>

        <div style={styles.creditBox}>
          <h3 style={styles.h3}>Carregar saldo</h3>

          <div style={styles.creditButtons}>
            <button
              onClick={() => comprarCreditos(5)}
              style={styles.buyButton}
              disabled={creditoLoading}
            >
              {creditoLoading ? "A processar..." : "Comprar 5€"}
            </button>

            <button
              onClick={() => comprarCreditos(10)}
              style={styles.buyButton}
              disabled={creditoLoading}
            >
              {creditoLoading ? "A processar..." : "Comprar 10€"}
            </button>

            <button
              onClick={() => comprarCreditos(20)}
              style={styles.buyButton}
              disabled={creditoLoading}
            >
              {creditoLoading ? "A processar..." : "Comprar 20€"}
            </button>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.h2}>Histórico de consultas</h2>

        {historico.length === 0 ? (
          <p>Sem consultas registadas.</p>
        ) : (
          <ul style={styles.list}>
            {historico.map((h) => (
              <li key={h.id} style={styles.listItem}>
                <strong>{h.consultor_nome}</strong> — {h.data} — {h.duracao_min} min —{" "}
                {Number(h.total_eur ?? 0).toFixed(2)}€
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 30 }}>
        <button onClick={terminarSessao} style={styles.logoutButton}>
          Terminar sessão
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 40,
    color: "white",
    minHeight: "100vh",
  },
  h1: {
    marginBottom: 20,
    fontSize: 40,
    fontWeight: 900,
  },
  h2: {
    marginBottom: 10,
    fontSize: 24,
    fontWeight: 800,
  },
  h3: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: 800,
  },
  card: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  saldo: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 10,
  },
  creditBox: {
    marginTop: 18,
  },
  creditButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 8,
  },
  buyButton: {
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
    border: "none",
    background: "#f4d78b",
    color: "#111",
    fontWeight: 800,
  },
  logoutButton: {
    padding: "10px 16px",
    borderRadius: 8,
    background: "darkred",
    color: "white",
    cursor: "pointer",
    border: "none",
  },
  list: {
    marginTop: 10,
    paddingLeft: 18,
  },
  listItem: {
    marginBottom: 10,
  },
  error: {
    color: "#ff6b6b",
  },
};