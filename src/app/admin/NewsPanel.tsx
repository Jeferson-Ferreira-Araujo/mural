"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import type { NewsTexts } from "@/lib/news";

type Row = { id: string; createdAt: string; texts: NewsTexts; published: boolean; image?: string | null };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const field = "w-full rounded-xl border border-[#d9c9ad] bg-white px-3.5 py-2 text-base text-[#2a1c12] outline-none focus:border-[#d9a21b]";

/** Novidades do site: escreva em português; ao publicar, o texto é traduzido para os outros 18 idiomas e aparece no botão "Novidades" do menu. */
export function NewsPanel({ onToast }: { onToast: (t: string) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getBrowserSupabase().rpc("admin_list_news");
    setRows(Array.isArray(data) ? (data as Row[]) : []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  function reset() {
    setEditing(null);
    setTitle("");
    setBody("");
    setImage("");
    setPublished(true);
  }

  async function save() {
    if (busy || !title.trim() || !body.trim()) return;
    setBusy(true);
    const token = (await getBrowserSupabase().auth.getSession()).data.session?.access_token ?? "";
    const res = await fetch("/api/admin/news", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing ?? undefined, title, body, published, image }),
    }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { failed?: string[] } | null;
    setBusy(false);
    if (!res?.ok) return onToast("Não foi possível salvar agora.");
    onToast(d?.failed?.length ? `Publicado. ${d.failed.length} idioma(s) ficaram em português por falha na tradução (${d.failed.join(", ")}); salve de novo para tentar outra vez.` : "Publicado e traduzido para os 19 idiomas.");
    reset();
    void load();
  }

  async function toggle(r: Row) {
    await getBrowserSupabase().rpc("admin_save_news", { p_id: r.id, p_texts: r.texts, p_published: !r.published });
    void load();
  }
  async function remove(r: Row) {
    if (!window.confirm(`Apagar a novidade "${r.texts.pt?.t}"?`)) return;
    await getBrowserSupabase().rpc("admin_delete_news", { p_id: r.id });
    void load();
  }

  return (
    <section className="mt-4" aria-label="Novidades">
      <div className="rounded-2xl border border-[#e1d3ba] bg-white/70 p-4">
        <h3 className="font-title text-base font-semibold">{editing ? "Editar novidade" : "Nova novidade"}</h3>
        <p className="mt-0.5 text-xs text-[#6b5440]">Escreva em português, com palavras simples. Ao publicar, o texto é traduzido sozinho para os outros 18 idiomas.</p>
        <input className={`${field} mt-3`} placeholder="Título (ex.: Agora você pode seguir pessoas)" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} aria-label="Título" />
        <textarea className={`${field} mt-2 min-h-24`} placeholder="Texto curto explicando a novidade" value={body} maxLength={450} onChange={(e) => setBody(e.target.value)} aria-label="Texto" />
        <input className={`${field} mt-2`} placeholder="Imagem (opcional): endereço, ex.: /novidades/sino.png" value={image} maxLength={300} onChange={(e) => setImage(e.target.value)} aria-label="Imagem" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Visível no site
          </label>
          <span className="flex gap-2">
            {editing && (
              <button type="button" onClick={reset} className="cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2 text-sm font-semibold">
                Cancelar
              </button>
            )}
            <button type="button" disabled={busy || !title.trim() || !body.trim()} onClick={() => void save()} className="cursor-pointer rounded-xl bg-[#1f232b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Traduzindo e salvando…" : editing ? "Salvar e traduzir" : "Publicar"}
            </button>
          </span>
        </div>
      </div>

      {!rows ? (
        <div className="py-8">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6b5440]">Nenhuma novidade ainda.</p>
      ) : (
        <div className="mt-3 overflow-auto rounded-2xl border border-[#e1d3ba] bg-white/70">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-[#f1e6cf] text-[11px] tracking-wide text-[#6b5440] uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Data</th>
                <th className="px-3 py-2 font-semibold">Título</th>
                <th className="px-3 py-2 font-semibold">Idiomas</th>
                <th className="px-3 py-2 font-semibold">Situação</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eadfc8]">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-[#6b5440]">{fmt(r.createdAt)}</td>
                  <td className="max-w-[18rem] truncate px-3 py-2 font-semibold">{r.texts.pt?.t}</td>
                  <td className="px-3 py-2 tabular-nums">{Object.keys(r.texts).length}/19</td>
                  <td className="px-3 py-2">{r.published ? "visível" : "oculta"}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="mr-2 cursor-pointer text-xs font-semibold underline"
                      onClick={() => {
                        setEditing(r.id);
                        setTitle(r.texts.pt?.t ?? "");
                        setBody(r.texts.pt?.b ?? "");
                        setImage(r.image ?? "");
                        setPublished(r.published);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Editar
                    </button>
                    <button type="button" className="mr-2 cursor-pointer text-xs font-semibold underline" onClick={() => void toggle(r)}>
                      {r.published ? "Ocultar" : "Mostrar"}
                    </button>
                    <button type="button" className="cursor-pointer text-xs font-semibold text-[#a23b2a] underline" onClick={() => void remove(r)}>
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
