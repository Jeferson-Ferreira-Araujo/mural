"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PlayerColor } from "@/lib/types";
import { CaptionNote } from "./CaptionNote";
import { PLAYER_PALETTE, type PlayerLook } from "./playerPalette";
import { Scene } from "./Scene";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (s: number) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
/** "0:24" → 24 */
const parse = (d?: string) => {
  const m = d?.match(/^(\d+):(\d{1,2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** Botão físico do aparelho: convexo, com brilho em cima e sombra embaixo. */
function HwButton({ look, label, onClick, big = false, children }: { look: PlayerLook; label: string; onClick?: () => void; big?: boolean; children: ReactNode }) {
  const btn = (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid cursor-pointer place-items-center rounded-full transition active:translate-y-[0.04em] active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f4c542] ${big ? "h-[2.2em] w-[2.6em]" : "h-[1.75em] w-[2.15em]"}`}
      style={{
        color: look.icon,
        background: `radial-gradient(120% 90% at 50% 15%, ${look.btn[0]}, ${look.btn[1]} 80%)`,
        boxShadow: "inset 0 0.08em 0.06em rgba(255,255,255,.55), inset 0 -0.1em 0.12em rgba(0,0,0,.4), 0 0.14em 0.2em rgba(0,0,0,.55)",
      }}
    >
      {children}
    </button>
  );
  if (!big) return btn;
  // o botão central tem um anel (encaixe) em volta
  return (
    <span
      className="rounded-full p-[0.16em]"
      style={{ background: "linear-gradient(180deg, rgba(0,0,0,.45), rgba(255,255,255,.28))", boxShadow: "inset 0 0.06em 0.12em rgba(0,0,0,.6)" }}
    >
      {btn}
    </span>
  );
}

const icon = "size-[1em]";

/**
 * Vídeo: um mini player MP4 (visto de frente). A mensagem, se houver, vai num papelzinho colado embaixo;
 * sem mensagem, aparece só o player. `color` = cor do aparelho (escolhida por quem envia).
 * `src` = vídeo escolhido pela pessoa (toca de verdade); sem `src`, é uma cena de exemplo com tempo simulado.
 */
export function VideoPrint({ caption, duration, src, color = "black" }: { caption: string; duration?: string; src?: string; color?: PlayerColor }) {
  const look = PLAYER_PALETTE[color];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(parse(duration));
  const [muted, setMuted] = useState(false);

  // exemplo (sem arquivo): o tempo corre sozinho enquanto "toca"
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
    const v = videoRef.current;
    if (v) {
      if (v.paused) void v.play();
      else v.pause();
    } else setPlaying((p) => !p);
  }

  function skip(delta: number) {
    const v = videoRef.current;
    if (v) v.currentTime = clamp(v.currentTime + delta, 0, v.duration || 0);
    else setCur((c) => clamp(c + delta, 0, dur));
  }

  const ratio = dur > 0 ? clamp(cur / dur, 0, 1) : 0;
  const PlayIcon = (
    <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  );
  const PauseIcon = (
    <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );

  return (
    <article aria-label="Vídeo" className="relative w-[14em]">
      {/* corpo do player */}
      <div
        className="relative rounded-[1.15em] p-[0.62em] pt-[0.78em]"
        style={{
          background: `linear-gradient(172deg, ${look.body[0]} 0%, ${look.body[1]} 46%, ${look.body[2]} 100%)`,
          boxShadow: [
            `inset 0 0 0 0.09em ${look.rim}`, // aro metálico
            "inset 0.1em 0.14em 0.2em rgba(255,255,255,.4)", // luz no canto de cima
            "inset -0.1em -0.16em 0.24em rgba(0,0,0,.5)", // sombra no canto de baixo
            "0 0.06em 0.1em rgba(40,20,5,.35)",
            "0.14em 0.55em 0.75em -0.1em rgba(40,20,5,.45)",
            "0.32em 1.1em 1.3em -0.3em rgba(40,20,5,.35)",
          ].join(", "),
        }}
      >
        {/* brilho de plástico/metal passando pelo corpo */}
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.15em]" style={{ background: "linear-gradient(150deg, rgba(255,255,255,.34) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 70%, rgba(255,255,255,.12) 100%)" }} />

        {/* marca gravada e LED */}
        <span aria-hidden className="absolute top-[0.22em] left-1/2 -translate-x-1/2 font-mono text-[0.42em] leading-none font-bold tracking-[0.6em]" style={{ color: look.icon, opacity: 0.42, textShadow: "0 0.08em 0 rgba(0,0,0,.35)" }}>
          PINZ
        </span>
        <span
          aria-hidden
          className="absolute top-[0.24em] right-[1.2em] size-[0.3em] rounded-full"
          style={{ background: playing ? "#52ff94" : "#1f6b3a", boxShadow: playing ? "0 0 0.5em 0.12em rgba(82,255,148,.8)" : "none", transition: "all .3s" }}
        />

        {/* moldura da tela (vidro) */}
        <div className="relative rounded-[0.75em] bg-black p-[0.2em]" style={{ boxShadow: "inset 0 0 0 0.07em rgba(255,255,255,.1), 0 0.08em 0.1em rgba(255,255,255,.35), inset 0 0.2em 0.5em rgba(0,0,0,.9)" }}>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[0.55em] bg-black">
            {src ? (
              <video
                ref={videoRef}
                src={`${src}#t=0.1`}
                preload="metadata"
                playsInline
                muted={muted}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDur(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
                className="size-full object-cover"
              />
            ) : (
              <Scene variant="sunset" />
            )}

            {/* play grande no centro (some enquanto toca) */}
            {!playing && (
              <button
                type="button"
                onClick={toggle}
                aria-label="Reproduzir vídeo"
                className="absolute top-1/2 left-1/2 grid size-[3em] -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/25 text-white shadow-[0_0.2em_0.8em_rgba(0,0,0,.4)] backdrop-blur-[2px] transition hover:bg-white/35 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
              >
                <svg viewBox="0 0 24 24" className="size-[45%] translate-x-[8%]" fill="currentColor" aria-hidden>
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
                </svg>
              </button>
            )}

            {/* barra de progresso dentro da tela */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-[0.55em] pt-[1.2em] pb-[0.4em] text-white">
              <div className="relative h-[0.22em] rounded-full bg-white/35" role="progressbar" aria-label="Progresso do vídeo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
                <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${ratio * 100}%` }} />
                <span className="absolute top-1/2 size-[0.6em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${ratio * 100}%` }} />
              </div>
              <div className="mt-[0.3em] flex items-center gap-[0.4em] font-mono text-[0.6em] leading-none">
                <span aria-hidden className="inline-block">{playing ? "❚❚" : "▶"}</span>
                <span>
                  {fmt(cur)} / {dur > 0 ? fmt(dur) : "--:--"}
                </span>
                <span className="ml-auto flex items-center gap-[0.6em]">
                  {src ? (
                    <button type="button" aria-label={muted ? "Ativar som" : "Silenciar"} aria-pressed={muted} onClick={() => setMuted((m) => !m)} className="pointer-events-auto cursor-pointer text-[1.5em] leading-none">
                      {muted ? "🔇" : "🔊"}
                    </button>
                  ) : (
                    <span aria-hidden className="text-[1.5em] leading-none">🔊</span>
                  )}
                  {src ? (
                    <button type="button" aria-label="Tela cheia" onClick={() => void videoRef.current?.requestFullscreen?.()} className="pointer-events-auto cursor-pointer text-[1.5em] leading-none">
                      ⛶
                    </button>
                  ) : (
                    <span aria-hidden className="text-[1.5em] leading-none">⛶</span>
                  )}
                </span>
              </div>
            </div>

            {/* reflexo no vidro + vinheta */}
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(118deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.06) 32%, rgba(255,255,255,0) 33%), radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,.45) 100%)" }} />
          </div>
        </div>

        {/* botões do aparelho */}
        <div className="mt-[0.6em] flex items-center justify-between px-[0.15em]">
          {/* alto-falante (furinhos num encaixe) */}
          <span aria-hidden className="rounded-[0.45em] p-[0.24em]" style={{ background: "rgba(0,0,0,.18)", boxShadow: "inset 0 0.08em 0.14em rgba(0,0,0,.5), 0 0.05em 0 rgba(255,255,255,.3)" }}>
            <span className="grid grid-cols-4 gap-[0.17em]">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className="size-[0.25em] rounded-full" style={{ background: look.hole, boxShadow: "0 0.05em 0 rgba(255,255,255,.3)" }} />
              ))}
            </span>
          </span>
          <span className="flex items-center gap-[0.22em]">
            <HwButton look={look} label="Voltar 5 segundos" onClick={() => skip(-5)}>
              <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
                <path d="M12 6v12L3 12l9-6Zm9 0v12l-9-6 9-6Z" />
              </svg>
            </HwButton>
            <HwButton look={look} label={playing ? "Pausar" : "Reproduzir"} onClick={toggle} big>
              {playing ? PauseIcon : PlayIcon}
            </HwButton>
            <HwButton look={look} label="Avançar 5 segundos" onClick={() => skip(5)}>
              <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
                <path d="M12 6v12l9-6-9-6ZM3 6v12l9-6-9-6Z" />
              </svg>
            </HwButton>
          </span>
          {/* botão de menu: só enfeite do aparelho */}
          <span
            aria-hidden
            className="grid h-[1.75em] w-[1.9em] place-items-center rounded-full"
            style={{ color: look.icon, background: `radial-gradient(120% 90% at 50% 15%, ${look.btn[0]}, ${look.btn[1]} 80%)`, boxShadow: "inset 0 0.08em 0.06em rgba(255,255,255,.5), inset 0 -0.1em 0.12em rgba(0,0,0,.4), 0 0.14em 0.2em rgba(0,0,0,.5)", opacity: 0.9 }}
          >
            <svg viewBox="0 0 24 24" className="size-[0.95em]" fill="currentColor">
              <path d="M5 7h14v2H5V7Zm0 4h14v2H5v-2Zm0 4h14v2H5v-2Z" />
            </svg>
          </span>
        </div>
      </div>

      {/* mensagem: papelzinho colado embaixo (some se não houver mensagem) */}
      {caption && <CaptionNote>{caption}</CaptionNote>}
    </article>
  );
}
