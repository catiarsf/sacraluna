"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type BlogPost = {
  id: number;
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  imagem_url: string;
  ativo: 0 | 1;
};

export default function AdminBlogPage() {
  const [list, setList] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [imagemUrl, setImagemUrl] = useState("/servicos/default.jpg");
  const [ativo, setAtivo] = useState(true);

  const [edit, setEdit] = useState<BlogPost | null>(null);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/admin/blog", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Erro ao carregar posts.");
      setList(Array.isArray(data?.posts) ? data.posts : []);
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
    if (!res.ok) throw new Error(data?.error || "Erro no upload.");
    return data.url as string;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    try {
      setSaving(true);

      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, resumo, conteudo, imagem_url: imagemUrl, ativo }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro ao criar post.");

      setTitulo("");
      setResumo("");
      setConteudo("");
      setImagemUrl("/servicos/default.jpg");
      setAtivo(true);

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit() {
    if (!edit) return;

    try {
      setSaving(true);
      setErr("");

      const res = await fetch(`/api/admin/blog/${edit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro ao guardar post.");

      setEdit(null);
      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(post: BlogPost) {
    const ok = window.confirm(`Eliminar o post "${post.titulo}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro ao eliminar post.");

      if (edit?.id === post.id) setEdit(null);
      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Administração · Blog</h1>
      </div>

      <div style={styles.quickRow}>
        <Link href="/admin" style={styles.quickCard}>
          <div style={styles.quickTitle}>Consultores</div>
          <div style={styles.quickText}>Voltar à administração</div>
        </Link>

        <Link href="/admin/loja" style={styles.quickCard}>
          <div style={styles.quickTitle}>Loja</div>
          <div style={styles.quickText}>Gerir serviços</div>
        </Link>

        <Link href="/admin/blog" style={styles.quickCardActive}>
          <div style={styles.quickTitle}>Blog</div>
          <div style={styles.quickText}>Criar cartas do dia e artigos</div>
        </Link>
      </div>

      {err && <div style={styles.err}>{err}</div>}

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Novo artigo</h2>

          <form onSubmit={onCreate} style={styles.form}>
            <label style={styles.label}>Título</label>
            <input style={styles.input} value={titulo} onChange={(e) => setTitulo(e.target.value)} />

            <label style={styles.label}>Resumo</label>
            <textarea style={styles.textarea} value={resumo} onChange={(e) => setResumo(e.target.value)} />

            <label style={styles.label}>Conteúdo</label>
            <textarea
              style={{ ...styles.textarea, minHeight: 220 }}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
            />

            <label style={styles.label}>Imagem</label>
            <div style={styles.row}>
              <img src={imagemUrl} alt="preview" style={styles.thumb} />
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setUploading(true);
                      const url = await uploadFile(f);
                      setImagemUrl(url);
                    } finally {
                      setUploading(false);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            </div>

            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span>Publicado</span>
            </label>

            <button type="submit" style={styles.btn} disabled={saving || uploading}>
              {saving ? "A guardar..." : "Criar artigo"}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <h2 style={styles.h2}>Artigos</h2>

          {loading ? (
            <div style={styles.small}>A carregar...</div>
          ) : list.length === 0 ? (
            <div style={styles.small}>Ainda não tens artigos.</div>
          ) : (
            <div style={styles.list}>
              {list.map((p) => (
                <div key={p.id} style={styles.item}>
                  <img src={p.imagem_url} alt={p.titulo} style={styles.avatar} />

                  <div style={{ flex: 1 }}>
                    <div style={styles.itemName}>{p.titulo}</div>
                    <div style={styles.small}>/{p.slug}</div>
                    <div style={styles.small}>{p.ativo ? "Publicado" : "Rascunho"}</div>
                  </div>

                  <button style={styles.btnDangerSmall} onClick={() => deletePost(p)}>
                    Eliminar
                  </button>

                  <button style={styles.btnSmall} onClick={() => setEdit({ ...p })}>
                    Editar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {edit && (
        <div style={styles.modalBackdrop} onClick={() => setEdit(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.h2}>Editar artigo</h2>

            <div style={styles.form}>
              <label style={styles.label}>Título</label>
              <input
                style={styles.input}
                value={edit.titulo}
                onChange={(e) => setEdit({ ...edit, titulo: e.target.value })}
              />

              <label style={styles.label}>Resumo</label>
              <textarea
                style={styles.textarea}
                value={edit.resumo ?? ""}
                onChange={(e) => setEdit({ ...edit, resumo: e.target.value })}
              />

              <label style={styles.label}>Conteúdo</label>
              <textarea
                style={{ ...styles.textarea, minHeight: 220 }}
                value={edit.conteudo ?? ""}
                onChange={(e) => setEdit({ ...edit, conteudo: e.target.value })}
              />

              <label style={styles.label}>Imagem</label>
              <div style={styles.row}>
                <img src={edit.imagem_url} alt="preview" style={styles.thumb} />
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        setUploading(true);
                        const url = await uploadFile(f);
                        setEdit({ ...edit, imagem_url: url });
                      } finally {
                        setUploading(false);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={edit.ativo === 1}
                  onChange={(e) => setEdit({ ...edit, ativo: e.target.checked ? 1 : 0 })}
                />
                <span>Publicado</span>
              </label>

              <div style={styles.modalBtns}>
                <button style={styles.btnGhost} onClick={() => setEdit(null)}>
                  Cancelar
                </button>
                <button style={styles.btn} onClick={onSaveEdit} disabled={saving || uploading}>
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
  header: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  h1: { fontSize: 28, margin: 0 },
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
  quickTitle: { fontSize: 18, fontWeight: 900, marginBottom: 6 },
  quickText: { fontSize: 13, opacity: 0.82, lineHeight: 1.5 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 },
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
    minHeight: 90,
  },
  btn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
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
  small: { fontSize: 12, opacity: 0.75, marginTop: 4, wordBreak: "break-all" },
  avatar: { width: 44, height: 44, borderRadius: 12, objectFit: "cover" },
  thumb: { width: 70, height: 70, borderRadius: 12, objectFit: "cover" },
  row: { display: "flex", gap: 12, alignItems: "center" },
  checkboxRow: { display: "flex", gap: 8, alignItems: "center", marginTop: 6 },
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
  modalBtns: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
};