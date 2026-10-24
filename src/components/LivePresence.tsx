"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { getLivePresence } from "@/lib/social";
import { useLit } from "@/i18n/literal";

/** Quem está vendo o mural agora: apelido e foto (ou "visitante", se não entrou na conta) e quando chegou. */
type Viewer = { nick: string | null; avatar: string | null; at: number };

const PING_MS = 20_000; // o visitante avisa que continua no mural
const POLL_MS = 15_000; // reserva: quem some sem avisar (celular desligado, sinal) só deixa de contar depois de 45 s, sem aviso em tempo real

/**
 * Presença em tempo real, decidida inteiramente no servidor (nada passa pelo navegador de ninguém além do que cada um pode ver):
 * - quem VISITA avisa a cada 20 s (`live_ping`); o servidor só registra se o dono ligou a opção e, havendo conta, se o visitante também ligou a dela;
 * - o DONO com a opção ligada lê a lista (`live_list`, mais recentes primeiro); para qualquer outra pessoa o servidor devolve nada.
 * - em tempo real: o banco manda um aviso vazio a cada entrada ou saída; o dono, ao recebê-lo, busca a lista de novo.
 * Quem desligou não vê ninguém e não aparece para ninguém. Quem sai da página some da lista em até 45 s (ou na hora, se avisar que saiu).
 */
export function LivePresence({ muralId, isOwner }: { muralId: string; isOwner: boolean }) {
  const tl = useLit();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // visitante: avisa que está aqui
  useEffect(() => {
    if (isOwner) return;
    const sb = getBrowserSupabase();
    const key = crypto.randomUUID();
    let stopped = false;
    let timer = 0;
    const ping = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      const { data } = await sb.rpc("live_ping", { p_mural_id: muralId, p_key: key });
      if (data !== true) stopped = true; // o dono ou o visitante deixou desligado: não insiste
    };
    void ping();
    timer = window.setInterval(() => void ping(), PING_MS);
    const vis = () => document.visibilityState === "visible" && void ping();
    const leave = () => void sb.rpc("live_leave", { p_key: key });
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", leave);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [muralId, isOwner]);

  // dono: lê a lista (o servidor só responde se a opção dele está ligada)
  useEffect(() => {
    if (!isOwner) return;
    const sb = getBrowserSupabase();
    let alive = true;
    let timer = 0;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await sb.rpc("live_list", { p_mural_id: muralId });
      if (!alive) return;
      setViewers(Array.isArray(data) ? (data as Viewer[]) : []);
    };
    let ch: ReturnType<typeof sb.channel> | null = null;
    void getLivePresence(sb).then((on) => {
      if (!alive || !on) return;
      void load();
      // tempo real: o banco avisa (sem dados) quando alguém entra ou sai, e a lista é buscada de novo no servidor
      ch = sb.channel(`live:${muralId}`).on("broadcast", { event: "live" }, () => void load()).subscribe();
      timer = window.setInterval(() => void load(), POLL_MS);
    });
    return () => {
      alive = false;
      window.clearInterval(timer);
      if (ch) void sb.removeChannel(ch);
      setViewers([]);
    };
  }, [muralId, isOwner]);

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

  if (!isOwner || viewers.length === 0) return null;
  const n = viewers.length;
  return (
    <div ref={box} className="pointer-events-none fixed bottom-24 left-3 z-[120] lg:bottom-4 lg:left-4">
      {open && (
        <div role="list" aria-label={tl("Vendo agora")} className="pointer-events-auto mb-2 max-h-64 w-64 overflow-y-auto rounded-2xl border border-[#e1d3ba] bg-[#fffaf0] p-2 shadow-xl">
          <p className="px-2 pt-1 pb-1.5 text-xs font-bold tracking-wide text-[#6b5440] uppercase">{tl("Vendo agora")}</p>
          {viewers.map((v, i) => (
            <div role="listitem" key={`${v.at}-${v.nick ?? "anon"}-${i}`} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e9d8b6] text-sm font-bold text-[#4a3826]" aria-hidden>
                {v.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.avatar} alt="" className="size-full object-cover" draggable={false} />
                ) : v.nick ? (
                  v.nick.slice(0, 1).toUpperCase()
                ) : (
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                )}
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
