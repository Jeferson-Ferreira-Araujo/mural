"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useLit } from "@/i18n/literal";
import { useTag } from "@/i18n/useTag";
import { fetchNews, newsText, type NewsItem } from "@/lib/news";
import { getBrowserSupabase } from "@/lib/supabase";
import { Modal } from "./account/Modal";

const TONES = ["border-[#efdfa8] bg-[#fdf4d9]", "border-[#f0cfc8] bg-[#fbe9e5]", "border-[#cfe2c2] bg-[#e9f4e2]", "border-[#d3d0ee] bg-[#ebe9f9]"];
const SEEN_KEY = "pinz:news-seen";

/** "Novidades": link discreto abaixo das estatísticas; abre a lista de novidades do site, no idioma da pessoa. A bolinha dourada some depois que ela abre. */
export function NovidadesLink() {
  const tl = useLit();
  const locale = useLocale();
  const tag = useTag();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null); // o que já tinha visto antes de abrir (marca o que é NOVO)

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(SEEN_KEY));
    } catch {}
    void fetchNews(getBrowserSupabase()).then(setItems);
  }, []);

  if (!items || items.length === 0) return null;
  const latest = items[0].createdAt;
  const fresh = !seen || new Date(latest).getTime() > new Date(seen).getTime();

  function show() {
    setLastSeen(seen);
    setOpen(true);
    try {
      localStorage.setItem(SEEN_KEY, latest);
    } catch {}
    setSeen(latest);
  }

  return (
    <>
      <button type="button" onClick={show} className="mx-auto mt-[0.7em] flex cursor-pointer items-center gap-[0.4em] text-[0.82em] font-semibold text-[#6b5440] transition hover:text-[#2a1c12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]">
        <svg viewBox="0 0 24 24" className="size-[1.1em] text-[#d9a21b]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
          <path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" />
        </svg>
        {tl("Novidades")}
        {fresh && <span className="size-[0.55em] rounded-full bg-[#d9a21b]" aria-label={tl("Tem novidade")} />}
        <svg viewBox="0 0 24 24" className="size-[0.95em]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={tl("Novidades")} wide>
        <p className="-mt-1 mb-3 text-sm text-[#6b5440]">{tl("Fique por dentro das últimas atualizações do PINZ.")}</p>
        <ul className="space-y-3">
          {items.map((n, i) => {
            const x = newsText(n.texts, locale);
            const isNew = !lastSeen || new Date(n.createdAt).getTime() > new Date(lastSeen).getTime();
            return (
              <li key={n.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${TONES[i % TONES.length]}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">
                    {new Date(n.createdAt).toLocaleDateString(tag, { day: "2-digit", month: "long", year: "numeric" })}
                    {isNew && <span className="rounded-full bg-[#f7c948] px-2.5 py-0.5 text-[11px] font-extrabold text-[#3a2a08]">{tl("NOVO")}</span>}
                  </p>
                  <h3 className="font-title mt-1 text-xl leading-tight font-bold text-[#2a1c12]">{x.t}</h3>
                  <p className="mt-1.5 text-[15px] leading-snug whitespace-pre-line text-[#3a2c1d]">{x.b}</p>
                </div>
                {n.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt="" loading="lazy" className="hidden h-28 w-[34%] max-w-44 shrink-0 object-contain sm:block" />
                )}
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
