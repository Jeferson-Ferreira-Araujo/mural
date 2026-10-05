"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { Avatar } from "./Avatar";
import { cleanNickname, searchProfiles, type ProfileHit } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import type { Tone } from "./viewProps";

/** Busca de pessoas pelo nickname, com lista de resultados (combobox acessível). */
export function SearchBox({ onSelect, tone = "light", hideLabel = false }: { onSelect: (nickname: string) => void; tone?: Tone; hideLabel?: boolean }) {
  const dark = tone === "dark";
  const id = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ProfileHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const clean = cleanNickname(q.replace(/^@/, ""));

  useEffect(() => {
    if (clean.length < 2) {
      setHits([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchProfiles(getBrowserSupabase(), clean);
      if (cancelled) return;
      setHits(res);
      setSearched(true);
      setActive(-1);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [clean]);

  function pick(nick: string) {
    setQ("");
    setHits([]);
    setSearched(false);
    setOpen(false);
    onSelect(nick);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = hits[active] ?? (hits.length === 1 ? hits[0] : undefined);
      if (target) pick(target.nickname);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && clean.length >= 2 && searched;

  return (
    <div className="relative">
      <label htmlFor={id} className={`${hideLabel ? "sr-only" : "mb-[0.5em] block"} block text-center text-[0.9em] font-semibold ${dark ? "text-white/90" : "text-[#4a3826]"}`}>
        Pesquisar Usuário
      </label>
      <div className="relative">
        <svg viewBox="0 0 24 24" className={`pointer-events-none absolute top-1/2 left-[0.9em] size-[1.15em] -translate-y-1/2 ${dark ? "text-[#6b5440]" : "text-[#8a7b69]"}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          data-focus-target
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Ex: jeferson"
          className={`w-full rounded-[0.7em] border py-[0.75em] pr-[0.9em] pl-[2.5em] text-[1em] outline-none placeholder:text-[#8a7b69] focus-visible:ring-2 focus-visible:ring-[#d98a2b]/70 ${
            dark ? "border-transparent bg-[#e9e5df] text-[#2f2218]" : "border-[#e1d3ba] bg-white/85 text-[#2f2218] focus:bg-white"
          }`}
        />
      </div>

      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 z-30 mt-[0.4em] max-h-[16em] overflow-auto rounded-[0.8em] border border-[#d9c9ad] bg-[#fbf6ea] p-[0.35em] text-[#2f2218] shadow-[0_0.8em_2em_rgba(30,12,0,.35)]"
        >
          {hits.length === 0 ? (
            <li role="presentation" className="px-[0.9em] py-[0.8em] text-[0.9em] text-[#6b5440]">
              Nenhuma pessoa encontrada.
            </li>
          ) : (
            hits.map((h, i) => (
              <li key={h.nickname} role="presentation">
                <button
                  id={`${id}-opt-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(h.nickname)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-[0.8em] rounded-[0.6em] px-[0.8em] py-[0.65em] text-left transition-colors ${i === active ? "bg-[#efe4cf]" : "hover:bg-[#f3ead8]"}`}
                >
                  <span className="flex min-w-0 items-center gap-[0.6em]">
                    <Avatar src={h.avatar} name={h.nickname} plus={h.plus} className="size-[1.9em]" />
                    <span className="font-semibold break-all">{h.nickname}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
