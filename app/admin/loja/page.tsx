"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Servico = {
  id: number;
  nome: string;
  descricao: string;
  preco_eur: number;
  imagem_url: string;
  ativo: 0 | 1;
  created_at?: number;
};

export default function AdminLojaPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [list, setList] = useState<Servico[]>([]);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("10.00");
  const [imagemUrl, setImagemUrl] = useState("/servicos/default.jpg");
  const [ativo, setAtivo] = useState(true);

  const [edit, setEdit] = useState<Servico | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [editPreco, setEditPreco] = useState("");

  const ativosCount = useMemo(() => list.filter((s) => s.ativo === 1).length, [list]);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/admin/servicos", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar serviços.");
      }

      const arr = Array.isArray(data?.servicos) ? data.servicos : [];
      arr.sort((a: Servico, b: Servico) =>
        (a.nome || "").localeCompare(b.nome || "", "pt", { sensitivity: "base" })
      );

      setList(arr);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/admin/consultores/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || "Falha no upload.");
    }

    return data.url as string;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    try {
      const res = await fetch("/api/admin/servicos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          descricao,
          preco_eur: Number(preco),
          imagem_url: imagemUrl,
          ativo,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao criar serviço.");
      }

      setNome("");
      setDescricao("");
      setPreco("10.00");
      setImagemUrl("/servicos/default.jpg");
      setAtivo(true);

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  async function onSaveEdit() {
    if (!edit) return;

    setSaving(true);
    setErr("");

    try {
      const res = await fetch(`/api/admin/servicos/${edit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: edit.nome,
          descricao: edit.descricao,
          preco_eur: Number(editPreco),
          imagem_url: edit.imagem_url,
          ativo: edit.ativo === 1,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao guardar serviço.");
      }

      setEdit(null);
      setEditPreco("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(s: Servico, nextValue: boolean) {
    setErr("");
    setTogglingId(s.id);

    try {
      const res = await fetch(`/api/admin/servicos/${s.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ativo: nextValue,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao alterar estado do serviço.");
      }

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteServico(s: Servico) {
    const ok = window.confirm(`Tens a certeza que queres eliminar o serviço "${s.nome}"?`);
    if (!ok) return;

    setErr("");
    setTogglingId(s.id);

    try {
      const res = await fetch(`/api/admin/servicos/${s.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao eliminar serviço.");
      }

      if (edit?.id === s.id) {
        setEdit(null);
        setEditPreco("");
      }

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Administração · Loja</h1>
        <div style={styles.stats}>
          <div>
            Serviços: <b>{list.length}</b>
          </div>
          <div>
            Ativos: <b>{ativosCount}</b>
          </div>
        </div>
      </div>

      <div style={styles.quickRow}>
        <Link href="/admin" style={styles.quickCard}>
          <div style={styles.quickTitle}>Consultores</div>
          <div style={styles.quickText}>Voltar à gestão de consultores</div>
        </Link>

        <Link href="/admin/loja" style={styles.quickCardActive}>
          <div style={styles.quickTitle}>Loja</div>
          <div style={styles.quickText}>Criar serviços, descrição, imagens e preços</div>
        </Link>

        <Link href="/admin/pedidos-servicos" style={styles.quickCard}>
          <div style={styles.quickTitle}>Pedidos</div>
          <div style={styles.quickText}>Ver compras pagas e contactos dos clientes</div>
        </Link>
      </div>

      {err && <div style={styles.err}>{err}</div>}

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Novo serviço</h2>

          <form onSubmit={onCreate} style={styles.form}>
            <label style={styles.label}>Nome do serviço</label>
            <input
              style={styles.input}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Mesa Radiónica"
            />

            <label style={styles.label}>Descrição</label>
            <textarea
              style={styles.textarea}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreve o que inclui este serviço..."
            />

            <label style={styles.label}>Preço (€)</label>
            <input
              style={styles.input}
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="10.00"
            />

            <label style={styles.label}>Imagem (upload)</label>
            <div style={styles.row}>
              <img src={imagemUrl} alt="serviço" style={styles.thumb} />
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;

                    setUploading(true);
                    setErr("");

                    try {
                      const url = await uploadFile(f);
                      setImagemUrl(url);
                    } catch (er: any) {
                      setErr(String(er?.message ?? er));
                    } finally {
                      setUploading(false);
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <div style={styles.small}>{uploading ? "A enviar..." : imagemUrl}</div>
              </div>
            </div>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              <span>Serviço ativo</span>
            </label>

            <button type="submit" style={styles.btn} disabled={uploading}>
              Criar serviço
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <h2 style={styles.h2}>Lista de serviços</h2>

          {loading ? (
            <div style={styles.small}>A carregar...</div>
          ) : list.length === 0 ? (
            <div style={styles.small}>Ainda não tens serviços criados.</div>
          ) : (
            <div style={styles.list}>
              {list.map((s) => (
                <div key={s.id} style={styles.item}>
                  <img src={s.imagem_url} alt={s.nome} style={styles.avatar} />

                  <div style={{ flex: 1 }}>
                    <div style={styles.itemName}>{s.nome}</div>
                    <div style={styles.small}>{Number(s.preco_eur ?? 0).toFixed(2)}€</div>
                    <div style={styles.small}>
                      {s.ativo === 1 ? "Ativo" : "Inativo"}
                    </div>
                  </div>

                  <div style={styles.badge}>{s.ativo ? "Ativo" : "Inativo"}</div>

                  <button
                    style={styles.btnGreenSmall}
                    onClick={() => toggleAtivo(s, true)}
                    disabled={togglingId === s.id}
                  >
                    Ativar
                  </button>

                  <button
                    style={styles.btnGraySmall}
                    onClick={() => toggleAtivo(s, false)}
                    disabled={togglingId === s.id}
                  >
                    Desativar
                  </button>

                  <button
                    style={styles.btnDangerSmall}
                    onClick={() => deleteServico(s)}
                    disabled={togglingId === s.id}
                  >
                    Eliminar
                  </button>

                  <button
                    style={styles.btnSmall}
                    onClick={() => {
                      setEdit({ ...s });
                      setEditPreco(String(Number(s.preco_eur ?? 0)));
                    }}
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {edit && (
        <div style={styles.modalBackdrop} onClick={() => !saving && setEdit(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.h2}>Editar serviço</h2>

            <div style={styles.form}>
              <label style={styles.label}>Nome do serviço</label>
              <input
                style={styles.input}
                value={edit.nome}
                onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
              />

              <label style={styles.label}>Descrição</label>
              <textarea
                style={styles.textarea}
                value={edit.descricao ?? ""}
                onChange={(e) => setEdit({ ...edit, descricao: e.target.value })}
              />

              <label style={styles.label}>Preço (€)</label>
              <input
                type="text"
                inputMode="decimal"
                style={styles.input}
                value={editPreco}
                onChange={(e) => setEditPreco(e.target.value)}
              />

              <label style={styles.label}>Imagem (upload)</label>
              <div style={styles.row}>
                <img src={edit.imagem_url} alt="serviço" style={styles.thumb} />
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading || saving}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;

                      setUploading(true);
                      setErr("");

                      try {
                        const url = await uploadFile(f);
                        setEdit({ ...edit, imagem_url: url });
                      } catch (er: any) {
                        setErr(String(er?.message ?? er));
                      } finally {
                        setUploading(false);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <div style={styles.small}>{uploading ? "A enviar..." : edit.imagem_url}</div>
                </div>
              </div>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={edit.ativo === 1}
                  onChange={(e) => setEdit({ ...edit, ativo: e.target.checked ? 1 : 0 })}
                />
                <span>Serviço ativo</span>
              </label>

              <div style={styles.modalBtns}>
                <button
                  style={styles.btnGhost}
                  onClick={() => setEdit(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  style={styles.btn}
                  onClick={onSaveEdit}
                  disabled={saving || uploading}
                >
                  {saving ? "A guardar..." : "Guardar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 20, maxWidth: 1200, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  h1: { fontSize: 28, margin: 0 },
  stats: { display: "flex", gap: 16, opacity: 0.9, flexWrap: "wrap" },
  quickRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  quickCard: {
    display: "block",
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 16,
    color: "white",
  },
  quickCardActive: {
    display: "block",
    textDecoration: "none",
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.10)",
    borderRadius: 14,
    padding: 16,
    color: "#f4d78b",
  },
  quickTitle: {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 6,
  },
  quickText: {
    fontSize: 13,
    opacity: 0.82,
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginTop: 16,
  },
  card: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 16,
  },
  h2: { margin: "0 0 12px", fontSize: 18 },
  err: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.25)",
    whiteSpace: "pre-wrap",
  },
  form: { display: "grid", gap: 10 },
  label: { fontSize: 12, opacity: 0.9 },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    minHeight: 110,
  },
  btn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  btnSmall: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  btnGreenSmall: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(90,200,120,0.55)",
    background: "rgba(50,140,80,0.30)",
    color: "#d7ffe0",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnGraySmall: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(180,180,180,0.35)",
    background: "rgba(90,90,90,0.30)",
    color: "#f1f1f1",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnDangerSmall: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,80,80,0.55)",
    background: "rgba(160,20,20,0.35)",
    color: "#ffd6d6",
    fontWeight: 900,
    cursor: "pointer",
  },
  list: { display: "grid", gap: 10 },
  item: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    flexWrap: "wrap",
  },
  itemName: { fontWeight: 900 },
  small: {
    fontSize: 12,
    opacity: 0.75,
    marginTop: 4,
    wordBreak: "break-all",
  },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    fontSize: 12,
    opacity: 0.9,
    marginRight: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    objectFit: "cover",
  },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: 12,
    objectFit: "cover",
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  checkboxRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginTop: 6,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    width: "min(720px, 96vw)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(10,10,10,0.92)",
    padding: 16,
  },
  modalBtns: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 8,
  },
};