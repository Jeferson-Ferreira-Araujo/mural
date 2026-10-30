"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import type { NoticeTexts } from "@/lib/notice";

type Row = { id: string; createdAt: string; texts: NoticeTexts; active: boolean; image?: string | null; link?: string | null; rev: number };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const field = "w-full rounded-xl border border-[#d9c9ad] bg-white px-3.5 py-2 text-base text-[#2a1c12] outline-none focus:border-[#d9a21b]";

/** Aviso na tela inicial: uma janela que aparece uma vez para todo mundo. Só o aviso ativo mais recente é mostrado; desative ou apague para tirar do ar. */
export function NoticePanel({ onToast }: { onToast: (t: string) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [button, setButton] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);
  const [again, setAgain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getBrowserSupabase().rpc("admin_list_notices");
    setRows(Array.isArray(data) ? (data as Row[]) : []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  function reset() {
    setEditing(null);
    setTitle("");
    setBody("");
    setButton("");
    setLink("");
    setImage("");
    setActive(true);
    setAgain(false);
  }

  async function token() {
    return (await getBrowserSupabase().auth.getSession()).data.session?.access_token ?? "";
  }

  async function save() {
    if (busy || !title.trim() || !body.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/notice", {
      method: "POST",
      headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing ?? undefined, title, body, button, link, image, active, again }),
    }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { failed?: string[]; error?: string } | null;
    setBusy(false);
    if (!res?.ok) return onToast(d?.error === "invalid_link" ? "O link deve começar com https:// ou com /." : "Não foi possível salvar agora.");
    onToast(d?.failed?.length ? `Salvo. ${d.failed.length} idioma(s) ficaram em português por falha na tradução (${d.failed.join(", ")}); salve de novo para tentar outra vez.` : "Salvo e traduzido para os 19 idiomas.");
    reset();
    void load();
  }

  async function upload(file: File | undefined) {
    if (!file || sending) return;
    setSending(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/news-image", { method: "POST", headers: { Authorization: `Bearer ${await token()}` }, body: fd }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { url?: string; error?: string } | null;
    setSending(false);
    if (!res?.ok || !d?.url) return onToast(d?.error === "too_large" ? "Imagem grande demais (máximo 3 MB)." : d?.error === "invalid_type" ? "Use uma imagem PNG, JPG ou WebP." : "Não foi possível enviar a imagem.");
    setImage(d.url);
  }

  async function toggle(r: Row) {
    await getBrowserSupabase().rpc("admin_set_notice_active", { p_id: r.id, p_active: !r.active });
    void load();
  }
  async function remove(r: Row) {
    if (!window.confirm(`Apagar o aviso "${r.texts.pt?.t}"?`)) return;
    await getBrowserSupabase().rpc("admin_delete_notice", { p_id: r.id });
    void load();
  }

  const current = rows?.find((r) => r.active);

  return (
    <section className="mt-4" aria-label="Aviso na tela inicial">
      <div className="rounded-2xl border border-[#e1d3ba] bg-white/70 p-4">
        <h3 className="font-title text-base font-semibold">{editing ? "Editar aviso" : "Novo aviso"}</h3>
        <p className="mt-0.5 text-xs text-[#6b5440]">Aparece como uma janela na tela inicial, uma vez para cada pessoa. Escreva em português: o texto é traduzido sozinho para os outros 18 idiomas. Se houver mais de um ativo, só o mais novo aparece.</p>
        <input className={`${field} mt-3`} placeholder="Título (ex.: Estamos de visual novo!)" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} aria-label="Título" />
        <textarea className={`${field} mt-2 min-h-24`} placeholder="Texto do aviso" value={body} maxLength={600} onChange={(e) => setBody(e.target.value)} aria-label="Texto" />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className={field} placeholder="Link (opcional: https://… ou /criar)" value={link} maxLength={300} onChange={(e) => setLink(e.target.value)} aria-label="Link" />
          <input className={field} placeholder="Texto do botão (ex.: Ver agora)" value={button} maxLength={40} disabled={!link.trim()} onChange={(e) => setButton(e.target.value)} aria-label="Texto do botão" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2 text-sm font-semibold">
            {sending ? "Enviando…" : image ? "Trocar imagem" : "Escolher imagem (opcional)"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={sending} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-12 w-20 rounded-lg border border-[#e1d3ba] bg-white object-contain" />
              <button type="button" className="cursor-pointer text-xs font-semibold text-[#a23b2a] underline" onClick={() => setImage("")}>Remover</button>
            </>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativo (aparecendo)
            </label>
            {editing && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} /> Mostrar de novo para quem já fechou
              </label>
            )}
          </span>
          <span className="flex gap-2">
            {editing && (
              <button type="button" onClick={reset} className="cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2 text-sm font-semibold">
                Cancelar
              </button>
            )}
            <button type="button" disabled={busy || !title.trim() || !body.trim()} onClick={() => void save()} className="cursor-pointer rounded-xl bg-[#1f232b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Traduzindo e salvando…" : editing ? "Salvar e traduzir" : "Publicar aviso"}
            </button>
          </span>
        </div>
      </div>

      {!rows ? (
        <div className="py-8">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6b5440]">Nenhum aviso ainda.</p>
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
                  <td className="px-3 py-2">{r.active ? (r.id === current?.id ? "no ar" : "ativo (um mais novo aparece)") : "desativado"}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="mr-2 cursor-pointer text-xs font-semibold underline"
                      onClick={() => {
                        setEditing(r.id);
                        setTitle(r.texts.pt?.t ?? "");
                        setBody(r.texts.pt?.b ?? "");
                        setButton(r.texts.pt?.c ?? "");
                        setLink(r.link ?? "");
                        setImage(r.image ?? "");
                        setActive(r.active);
                        setAgain(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Editar
                    </button>
                    <button type="button" className="mr-2 cursor-pointer text-xs font-semibold underline" onClick={() => void toggle(r)}>
                      {r.active ? "Desativar" : "Ativar"}
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
