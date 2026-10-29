"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useLit } from "@/i18n/literal";
import { useTag } from "@/i18n/useTag";
import { fetchNews, newsText, type NewsItem } from "@/lib/news";
import { getBrowserSupabase } from "@/lib/supabase";
import { Modal } from "./account/Modal";

const SEEN_KEY = "pinz:news-seen";

/** "Novidades": link discreto abaixo das estatísticas; abre a lista de novidades do site, no idioma da pessoa. A bolinha dourada some depois que ela abre. */
export function NovidadesLink() {
  const tl = useLit();
  const locale = useLocale();
  const tag = useTag();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);

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
      <Modal open={open} onClose={() => setOpen(false)} title={tl("Novidades")}>
        <ul className="space-y-3">
          {items.map((n) => {
            const x = newsText(n.texts, locale);
            return (
              <li key={n.id} className="rounded-2xl border border-[#e1d3ba] bg-white/70 p-3.5">
                <p className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">{new Date(n.createdAt).toLocaleDateString(tag, { day: "2-digit", month: "long", year: "numeric" })}</p>
                <h3 className="font-title mt-0.5 text-lg font-semibold text-[#2a1c12]">{x.t}</h3>
                <p className="mt-1 text-[15px] leading-snug whitespace-pre-line text-[#3a2c1d]">{x.b}</p>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
