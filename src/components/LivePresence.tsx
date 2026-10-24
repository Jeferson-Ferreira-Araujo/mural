"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase";
import { useLit } from "@/i18n/literal";

/** Quem está vendo o mural agora: o apelido (ou "visitante", se não entrou na conta) e quando chegou. */
type Viewer = { key: string; nick: string | null; t: number };

/**
 * Presença em tempo real, nos dois sentidos e só para quem ligou:
 * - o DONO com a opção ligada vê quem está no mural dele agora (lista por chegada mais recente);
 * - quem VISITA aparece só se o dono tem a opção ligada e, se a pessoa tem conta, se ela também ligou a dela (visitante sem conta aparece como "visitante").
 * Quem desligou não vê ninguém e não aparece para ninguém: nem entra no canal.
 */
export function LivePresence({ muralId, ownerNick, isOwner, logged, myNick }: { muralId: string; ownerNick: string; isOwner: boolean; logged: boolean; myNick: string | null }) {
  const tl = useLit();
  const [mine, setMine] = useState<boolean | null>(null); // a minha opção (só para quem tem conta)
  const [ownerOn, setOwnerOn] = useState<boolean | null>(null); // a opção do dono do mural que estou vendo
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!logged) return setMine(true); // sem conta não há opção: conta como visitante, se o dono ligou
    let alive = true;
    void getBrowserSupabase()
      .rpc("get_live_presence")
      .then(({ data }) => alive && setMine(data === true));
    return () => {
      alive = false;
    };
  }, [logged]);

  useEffect(() => {
    if (isOwner) return setOwnerOn(true);
    let alive = true;
    setOwnerOn(null);
    void getBrowserSupabase()
      .rpc("live_presence_of", { p_nick: ownerNick })
      .then(({ data }) => alive && setOwnerOn(data === true));
    return () => {
      alive = false;
    };
  }, [isOwner, ownerNick]);

  useEffect(() => {
    // dono: precisa estar com a opção ligada para ver; visitante: o dono e ele mesmo (se tem conta) precisam estar com ela ligada
    const allowed = isOwner ? mine === true : ownerOn === true && mine === true;
    if (!allowed) {
      setViewers([]);
      return;
    }
    const sb = getBrowserSupabase();
    const me = crypto.randomUUID();
    const ch: RealtimeChannel = sb.channel(`live:${muralId}`, { config: { presence: { key: me } } });
    const sync = () => {
      const st = ch.presenceState<{ nick: string | null; t: number }>();
      const list: Viewer[] = [];
      for (const [key, metas] of Object.entries(st)) {
        const m = metas[0];
        if (!m || key === me) continue;
        list.push({ key, nick: m.nick ?? null, t: Number(m.t) || 0 });
      }
      list.sort((a, b) => b.t - a.t); // a chegada mais recente primeiro
      setViewers(list);
    };
    if (isOwner) ch.on("presence", { event: "sync" }, sync);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED" && !isOwner) void ch.track({ nick: logged ? myNick : null, t: Date.now() });
    });
    return () => {
      void sb.removeChannel(ch);
    };
  }, [muralId, isOwner, ownerOn, mine, logged, myNick]);

  // fecha a lista ao tocar fora
  useEffect(() => {
    if (!open) return;
    const h = (e: Event) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [open]);
  useEffect(() => {
    if (viewers.length === 0) setOpen(false);
  }, [viewers.length]);

  if (!isOwner || mine !== true || viewers.length === 0) return null;
  const n = viewers.length;
  return (
    <div ref={box} className="pointer-events-none fixed bottom-24 left-3 z-[120] lg:bottom-4 lg:left-4">
      {open && (
        <div role="list" aria-label={tl("Vendo agora")} className="pointer-events-auto mb-2 max-h-64 w-60 overflow-y-auto rounded-2xl border border-[#e1d3ba] bg-[#fffaf0] p-2 shadow-xl">
          <p className="px-2 pt-1 pb-1.5 text-xs font-bold tracking-wide text-[#6b5440] uppercase">{tl("Vendo agora")}</p>
          {viewers.map((v) => (
            <div role="listitem" key={v.key} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e9d8b6] text-sm font-bold text-[#4a3826]" aria-hidden>
                {v.nick ? v.nick.slice(0, 1).toUpperCase() : "?"}
              </span>
              <span className="min-w-0 truncate text-sm font-semibold text-[#2a1c12]">{v.nick ? `@${v.nick}` : tl("Visitante")}</span>
            </div>
          ))}
        </div>
      )}
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="pointer-events-auto inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1f232b]/92 px-3.5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-[#1f232b]">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3ddc84] opacity-70" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[#3ddc84]" />
        </span>
        {n} {n === 1 ? tl("visitante no seu mural") : tl("visitantes no seu mural")}
      </button>
    </div>
  );
}
