"use client";

import React, { useEffect, useState } from "react";

type Consultor = {
  id: number;
  user_id: number;
  nome: string;
  email: string;
  foto_url: string | null;
  especialidades: string | null;
  apresentacao: string | null;
  valor_min_eur: number;
  percentagem: number;
  ativo: number;
  destaque?: number;
  online?: number;
};

function eur(n: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(n || 0);
}

export default function AdminConsultoresPage() {
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    foto_url: "",
    especialidades: "",
    apresentacao: "",
    valor_min_eur: "1.00",
    percentagem: "0.40",
    ativo: true,
  });

  async function load() {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/admin/consultores", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Erro ao carregar.");
      setConsultores(j.consultores || []);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [refresh]);

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    const r = await fetch("/api/admin/consultores/upload", {
      method: "POST",
      body: fd,
    });

    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "Erro no upload.");
    return j.url as string;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload(file);
      setForm((p) => ({ ...p, foto_url: url }));
    } catch (err: any) {
      setErro(err.message);
    }
  }

  async function save() {
    try {
      setErro(null);

      const payload: any = {
        ...form,
        valor_min_eur: Number(form.valor_min_eur),
        percentagem: Number(form.percentagem),
        foto_url: form.foto_url || null,
      };

      let r: Response;

      if (editingId) {
        r = await fetch(`/api/admin/consultores/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        r = await fetch(`/api/admin/consultores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || "Erro ao guardar consultor.");

      setForm({
        nome: "",
        email: "",
        password: "",
        foto_url: "",
        especialidades: "",
        apresentacao: "",
        valor_min_eur: "1.00",
        percentagem: "0.40",
        ativo: true,
      });

      setEditingId(null);
      setRefresh((r) => r + 1);
    } catch (e: any) {
      setErro(e.message);
    }
  }

  function edit(c: Consultor) {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      email: c.email,
      password: "",
      foto_url: c.foto_url || "",
      especialidades: c.especialidades || "",
      apresentacao: c.apresentacao || "",
      valor_min_eur: String(c.valor_min_eur),
      percentagem: String(c.percentagem),
      ativo: !!c.ativo,
    });
  }

  async function toggleDisponivel(c: Consultor, disponivel: boolean) {
    try {
      setErro(null);

      const r = await fetch(`/api/admin/consultores/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          online: disponivel,
        }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || "Erro ao alterar disponibilidade.");

      setRefresh((x) => x + 1);
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function toggleDestaque(c: Consultor) {
    try {
      setErro(null);

      const r = await fetch(`/api/admin/consultores/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destaque: !(c.destaque ?? 0),
        }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || "Erro ao alterar destaque.");

      setRefresh((x) => x + 1);
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function removeConsultor(c: Consultor) {
    const ok = window.confirm(`Tens a certeza que queres eliminar o consultor "${c.nome}"?`);
    if (!ok) return;

    try {
      setErro(null);

      const r = await fetch(`/api/admin/consultores/${c.id}`, {
        method: "DELETE",
      });

      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || "Erro ao eliminar consultor.");

      if (editingId === c.id) {
        setEditingId(null);
        setForm({
          nome: "",
          email: "",
          password: "",
          foto_url: "",
          especialidades: "",
          apresentacao: "",
          valor_min_eur: "1.00",
          percentagem: "0.40",
          ativo: true,
        });
      }

      setRefresh((x) => x + 1);
    } catch (e: any) {
      setErro(e.message);
    }
  }

  const ativos = consultores.filter((c) => c.ativo).length;

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <h1 style={styles.title}>Administração</h1>

        <div style={styles.stats}>
          <span>Consultores: {consultores.length}</span>
          <span>Ativos: {ativos}</span>
        </div>

        {erro && <div style={styles.error}>{erro}</div>}

        <div style={styles.grid}>
          <div style={styles.card}>
            <h2>{editingId ? "Editar consultor" : "Novo consultor"}</h2>

            <input
              style={styles.input}
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />

            <input
              style={styles.input}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <input
              style={styles.input}
              type="file"
              accept="image/*"
              onChange={handleUpload}
            />

            {form.foto_url && (
              <img src={form.foto_url} style={styles.preview} alt="preview" />
            )}

            <textarea
              style={styles.textarea}
              placeholder="Apresentação"
              value={form.apresentacao}
              onChange={(e) => setForm({ ...form, apresentacao: e.target.value })}
            />

            <button style={styles.button} onClick={save}>
              Guardar
            </button>
          </div>

          <div style={styles.card}>
            <h2>Lista</h2>

            {loading ? (
              <p>A carregar...</p>
            ) : (
              consultores.map((c) => (
                <div key={c.id} style={styles.itemCol}>
                  <div style={styles.itemTop}>
                    <div>
                      <strong>{c.nome}</strong>
                      <div>{eur(c.valor_min_eur)} / min</div>
                      <div style={styles.metaLine}>
                        {c.online ? "Disponível" : "Indisponível"} •{" "}
                        {c.destaque ? "Em destaque" : "Sem destaque"}
                      </div>
                    </div>

                    <button style={styles.smallBtn} onClick={() => edit(c)}>
                      Editar
                    </button>
                  </div>

                  <div style={styles.actionsRow}>
                    <button
                      style={styles.greenBtn}
                      onClick={() => toggleDisponivel(c, true)}
                    >
                      Disponível
                    </button>

                    <button
                      style={styles.grayBtn}
                      onClick={() => toggleDisponivel(c, false)}
                    >
                      Indisponível
                    </button>

                    <button
                      style={styles.goldBtn}
                      onClick={() => toggleDestaque(c)}
                    >
                      {c.destaque ? "Tirar destaque" : "Destacar"}
                    </button>

                    <button
                      style={styles.redBtn}
                      onClick={() => removeConsultor(c)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0b10",
    color: "white",
    padding: 20,
  },
  wrap: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  title: {
    fontSize: 32,
    marginBottom: 10,
  },
  stats: {
    display: "flex",
    gap: 20,
    marginBottom: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 16,
  },
  input: {
    width: "100%",
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(255,215,130,0.2)",
    background: "rgba(0,0,0,0.3)",
    color: "white",
  },
  textarea: {
    width: "100%",
    minHeight: 100,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(255,215,130,0.2)",
    background: "rgba(0,0,0,0.3)",
    color: "white",
    resize: "vertical",
  },
  button: {
    padding: 12,
    borderRadius: 8,
    background: "gold",
    color: "black",
    fontWeight: "bold",
    cursor: "pointer",
    border: "none",
  },
  smallBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    background: "gold",
    color: "black",
    cursor: "pointer",
    border: "none",
  },
  itemCol: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metaLine: {
    opacity: 0.8,
    fontSize: 13,
    marginTop: 4,
  },
  actionsRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  greenBtn: {
    padding: "7px 12px",
    borderRadius: 8,
    background: "#2e7d32",
    color: "white",
    cursor: "pointer",
    border: "none",
  },
  grayBtn: {
    padding: "7px 12px",
    borderRadius: 8,
    background: "#555",
    color: "white",
    cursor: "pointer",
    border: "none",
  },
  goldBtn: {
    padding: "7px 12px",
    borderRadius: 8,
    background: "gold",
    color: "black",
    cursor: "pointer",
    border: "none",
  },
  redBtn: {
    padding: "7px 12px",
    borderRadius: 8,
    background: "#a61b1b",
    color: "white",
    cursor: "pointer",
    border: "none",
  },
  preview: {
    width: 80,
    height: 80,
    objectFit: "cover",
    borderRadius: 10,
    marginBottom: 10,
  },
  error: {
    background: "rgba(255,0,0,0.2)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
};