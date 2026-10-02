"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { PlayerColor } from "@/lib/types";
import { CaptionNote } from "./CaptionNote";
import { PLAYER_PALETTE } from "./playerPalette";

const BARS = 26;

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (s: number) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
/** "0:27" → 27 */
const parse = (d?: string) => {
  const m = d?.match(/^(\d+):(\d{1,2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** Onda de exemplo (sempre a mesma para o mesmo seed): picos suaves, como uma voz. */
function fakePeaks(seed: number): number[] {
  let x = seed * 9301 + 49297;
  return Array.from({ length: BARS }, (_, i) => {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    const envelope = 0.45 + 0.55 * Math.sin((i / (BARS - 1)) * Math.PI);
    return clamp(0.18 + r * 0.82 * envelope, 0.12, 1);
  });
}

/** Lê o áudio e tira a "forma de onda" real (BARS barras). Se não der, usa a de exemplo. */
function usePeaks(src: string | undefined, seed: number) {
  const [peaks, setPeaks] = useState<number[]>(() => fakePeaks(seed));
  useEffect(() => {
    if (!src) return;
    let dead = false;
    (async () => {
      try {
        const buf = await (await fetch(src)).arrayBuffer();
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const audio = await ctx.decodeAudioData(buf);
        void ctx.close();
        const data = audio.getChannelData(0);
        const size = Math.floor(data.length / BARS);
        if (size < 1) return;
        const raw = Array.from({ length: BARS }, (_, b) => {
          let sum = 0;
          for (let i = b * size; i < (b + 1) * size; i += 8) sum += data[i] * data[i];
          return Math.sqrt(sum / (size / 8));
        });
        const max = Math.max(...raw, 0.0001);
        if (!dead) setPeaks(raw.map((v) => clamp(v / max, 0.12, 1)));
      } catch {
        /* mantém a onda de exemplo */
      }
    })();
    return () => {
      dead = true;
    };
  }, [src]);
  return peaks;
}

/**
 * Mensagem de voz: um gravadorzinho (visto de frente) com alto-falante, tela escura com a onda sonora e play.
 * A mensagem de texto, se houver, vai num papelzinho colado embaixo; sem ela, aparece só o aparelho.
 * `src` = áudio gravado/escolhido pela pessoa (toca de verdade); sem `src`, é um exemplo com tempo simulado.
 */
export function VoiceNote({ caption, duration, src, color = "cream" }: { caption: string; duration?: string; src?: string; color?: PlayerColor }) {
  const look = PLAYER_PALETTE[color];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(parse(duration));
  const peaks = usePeaks(src, Math.max(parse(duration), 7));

  // exemplo (sem arquivo): o tempo corre sozinho
  useEffect(() => {
    if (src || !playing || dur <= 0) return;
    const t = setInterval(() => {
      setCur((c) => {
        if (c + 1 >= dur) {
          setPlaying(false);
          return 0;
        }
        return c + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [src, playing, dur]);

  function toggle() {
    const a = audioRef.current;
    if (a) {
      if (a.paused) void a.play();
      else a.pause();
    } else setPlaying((p) => !p);
  }

  function seekTo(ratio: number) {
    const a = audioRef.current;
    const total = a && Number.isFinite(a.duration) ? a.duration : dur;
    if (total <= 0) return;
    if (a) a.currentTime = clamp(ratio, 0, 1) * total;
    else setCur(clamp(ratio, 0, 1) * total);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (dur <= 0) return;
    if (e.key === "ArrowRight") seekTo((cur + 5) / dur);
    if (e.key === "ArrowLeft") seekTo((cur - 5) / dur);
  }

  const ratio = dur > 0 ? clamp(cur / dur, 0, 1) : 0;

  return (
    <article aria-label="Mensagem de voz" className="relative w-[14em]">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDur(d);
          }}
        />
      )}

      {/* corpo do gravador */}
      <div
        className="relative flex gap-[0.5em] rounded-[1em] p-[0.55em]"
        style={{
          background: `linear-gradient(172deg, ${look.body[0]} 0%, ${look.body[1]} 50%, ${look.body[2]} 100%)`,
          boxShadow: [
            `inset 0 0 0 0.09em ${look.rim}`,
            "inset 0.1em 0.14em 0.2em rgba(255,255,255,.5)",
            "inset -0.1em -0.16em 0.24em rgba(0,0,0,.35)",
            "0 0.06em 0.1em rgba(40,20,5,.35)",
            "0.14em 0.55em 0.75em -0.1em rgba(40,20,5,.45)",
            "0.32em 1.1em 1.3em -0.3em rgba(40,20,5,.35)",
          ].join(", "),
        }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1em]" style={{ background: "linear-gradient(150deg, rgba(255,255,255,.4) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 72%, rgba(255,255,255,.12) 100%)" }} />

        {/* alto-falante: painel perfurado */}
        <span
          aria-hidden
          className="grid w-[2.9em] shrink-0 place-items-center rounded-[0.6em] py-[0.4em]"
          style={{ background: "rgba(0,0,0,.08)", boxShadow: "inset 0 0.1em 0.2em rgba(0,0,0,.28), 0 0.05em 0 rgba(255,255,255,.45)" }}
        >
          <span className="grid grid-cols-5 gap-[0.2em]">
            {Array.from({ length: 40 }, (_, i) => (
              <span key={i} className="size-[0.26em] rounded-full" style={{ background: look.hole, boxShadow: "0 0.05em 0 rgba(255,255,255,.4)" }} />
            ))}
          </span>
        </span>

        {/* tela escura com onda + play */}
        <div className="relative min-w-0 flex-1 rounded-[0.6em] bg-black p-[0.16em]" style={{ boxShadow: "inset 0 0 0 0.06em rgba(255,255,255,.1), 0 0.06em 0.08em rgba(255,255,255,.4), inset 0 0.2em 0.5em rgba(0,0,0,.9)" }}>
          <div className="relative overflow-hidden rounded-[0.45em] px-[0.6em] py-[0.55em] text-white" style={{ background: "linear-gradient(180deg, #121216 0%, #0a0a0d 100%)" }}>
            <div className="flex items-center gap-[0.45em]">
              {/* onda sonora (as barras já "tocadas" ficam brancas) */}
              <div className="flex h-[2.3em] flex-1 items-center justify-between" aria-hidden>
                {peaks.map((p, i) => (
                  <span key={i} className="w-[0.13em] rounded-full" style={{ height: `${p * 100}%`, background: i / BARS < ratio ? "#ffffff" : "#76767d" }} />
                ))}
              </div>
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "Pausar mensagem de voz" : "Ouvir mensagem de voz"}
                className="grid size-[1.9em] shrink-0 cursor-pointer place-items-center rounded-full border border-white/55 text-white transition hover:bg-white/10 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" className="size-[0.8em]" fill="currentColor" aria-hidden>
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="size-[0.8em] translate-x-[8%]" fill="currentColor" aria-hidden>
                    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
                  </svg>
                )}
              </button>
            </div>

            {/* progresso (clicável) */}
            <div
              role="slider"
              tabIndex={0}
              aria-label="Posição da mensagem de voz"
              aria-valuemin={0}
              aria-valuemax={Math.round(dur)}
              aria-valuenow={Math.round(cur)}
              onKeyDown={onKey}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                seekTo((e.clientX - r.left) / r.width);
              }}
              className="relative mt-[0.5em] flex h-[0.8em] cursor-pointer items-center focus-visible:outline-2 focus-visible:outline-white"
            >
              <span className="relative block h-[0.14em] w-full rounded-full bg-white/30">
                <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${ratio * 100}%` }} />
                <span className="absolute top-1/2 size-[0.5em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${ratio * 100}%` }} />
              </span>
            </div>
            <div className="mt-[0.1em] flex justify-between font-mono text-[0.55em] leading-none text-white/85">
              <span>{fmt(cur)}</span>
              <span>{dur > 0 ? fmt(dur) : "--:--"}</span>
            </div>

            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(118deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.04) 30%, rgba(255,255,255,0) 31%)" }} />
          </div>
        </div>
      </div>

      {caption && <CaptionNote>{caption}</CaptionNote>}
    </article>
  );
}
