"use client";

import { useEffect, useRef, useState } from "react";
import { listSharedMurals, type SharedMural } from "@/lib/shared";
import { getBrowserSupabase } from "@/lib/supabase";
import type { MuralSwitch } from "./MuralSwitcher";

/**
 * Nome do mural aberto. Quando a pessoa tem outros murais, aparece uma seta para baixo ao lado do nome: tocar abre a lista dos outros
 * murais e, no fim, os murais compartilhados com alguém (se houver). Sem outros murais, é só o nome.
 */
export function MuralNameMenu({ title, sw, showShared = false, align = "left", className = "", label, triggerClassName }: { title: string; sw?: MuralSwitch; /** em vez do nome do mural, mostra só este rótulo (ex.: "Murais") e a lista traz TODOS os murais; sem outros murais, nada aparece (celular: nomes grandes não quebram o layout) */ label?: string; /** aparência do botão que abre a lista (ex.: pílula escura sobre o quadro) */ triggerClassName?: string; /** estou vendo um mural meu: lista também os compartilhados */ showShared?: boolean; align?: "left" | "right"; className?: string }) {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState<SharedMural[] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const others = (sw?.items ?? []).filter((m) => m.slug !== sw?.current);

  // os compartilhados só são lidos quando a pessoa pode vê-los (mural dela) e abre a lista
  useEffect(() => {
    if (!showShared) return;
    let alive = true;
    void listSharedMurals(getBrowserSupabase()).then((l) => alive && setShared((l ?? []).filter((m) => m.status === "accepted" && !m.locked)));
    return () => {
      alive = false;
    };
  }, [showShared]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  const sharedList = showShared ? (shared ?? []) : [];
  const hasMenu = others.length > 0 || sharedList.length > 0;
  const name = <span className="block min-w-0 truncate">{label ?? title}</span>;
  if (!hasMenu) return label ? null : <span className={`min-w-0 ${className}`}>{name}</span>;
  const listed = label ? (sw?.items ?? []) : others;

  const item = "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#2a1c12] transition hover:bg-[#f3e7cc] active:bg-[#ecdcb5]";
  return (
    <div ref={box} className={`relative min-w-0 ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={label ? "Ver meus murais" : `${title}: ver outros murais`} className={triggerClassName ?? "flex max-w-full cursor-pointer items-center gap-1.5"}>
        {name}
        <svg viewBox="0 0 24 24" className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className={`absolute top-full z-50 mt-2 w-max min-w-[12rem] max-w-[min(80vw,22rem)] rounded-xl border border-[#e1d3ba] bg-[#fbf6ea] p-1.5 text-[#2a1c12] shadow-[0_0.8rem_2rem_rgba(0,0,0,.4)] ${align === "right" ? "right-0" : "left-0"}`}>
          {listed.length > 0 && (
            <>
              {listed.map((m) => {
                const here = m.slug === sw?.current;
                return (
                  <button
                    key={m.slug}
                    type="button"
                    role="menuitem"
                    aria-current={here || undefined}
                    onClick={() => {
                      setOpen(false);
                      if (!here) sw?.onSelect(m.slug);
                    }}
                    className={`${item} ${here ? "bg-[#f3e7cc]" : ""}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{m.title}</span>
                    {here && <span className="shrink-0 text-xs font-bold text-[#8a6a2a]">✓ aberto</span>}
                  </button>
                );
              })}
            </>
          )}
          {sharedList.length > 0 && (
            <>
              <p className={`px-3 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-[#8a6a2a] uppercase ${others.length > 0 ? "mt-1 border-t border-[#e1d3ba] pt-2.5" : ""}`}>Compartilhados</p>
              {sharedList.map((m) => (
                <a key={m.id} role="menuitem" href={`/${m.owner}/${m.slug}`} className={item}>
                  <span className="min-w-0 flex-1 truncate">{m.title}</span>
                  <span className="shrink-0 text-xs font-normal text-[#6b5440]">com @{m.mine ? m.partner : m.owner}</span>
                </a>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
