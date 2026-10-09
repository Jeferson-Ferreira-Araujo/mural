"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { embedFor } from "@/lib/embed";
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

/** O vídeo em tamanho grande, por cima da tela inteira. */
function BigVideo({ src, embedSrc, onClose }: { src?: string; embedSrc?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label="Vídeo em tamanho maior"
      className="m-0 size-full max-h-none max-w-none bg-black/95 p-0 backdrop:bg-black/95"
    >
      <div className="relative grid size-full place-items-center p-2 sm:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {embedSrc ? (
          <iframe src={embedSrc} title="Vídeo do YouTube" allow="autoplay; encrypted-media; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox" className="aspect-video max-h-full w-full max-w-[min(100%,calc((100dvh-3rem)*16/9))] rounded-xl border-0" />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={src} controls autoPlay playsInline className="max-h-full max-w-full rounded-xl" />
        )}
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 grid size-11 cursor-pointer place-items-center rounded-full bg-white/20 text-2xl text-white backdrop-blur transition hover:bg-white/35 active:scale-90">
          ×
        </button>
      </div>
    </dialog>
  );
}

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
export function VideoPrint({ caption, duration, src, link, color = "black" }: { caption: string; duration?: string; src?: string; link?: string; color?: PlayerColor }) {
  const look = PLAYER_PALETTE[color];
  // vídeo do YouTube: miniatura no aparelho e, ao tocar, o player oficial (só reconhecemos o endereço e extraímos o ID)
  const yt = !src ? embedFor(link) : null;
  const embed = yt?.provider === "youtube" ? yt : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(parse(duration));
  const [big, setBig] = useState(false);

  // exemplo (sem arquivo): o tempo corre sozinho enquanto "toca"
  useEffect(() => {
    if (src || embed || !playing || dur <= 0) return;
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
  }, [src, embed, playing, dur]);

  function toggle() {
    if (embed) return setPlaying((p) => !p); // abre/fecha o player do YouTube
    const v = videoRef.current;
    if (v) {
      if (v.paused) void v.play();
      else v.pause();
    } else setPlaying((p) => !p);
  }

  // ampliar: abre o vídeo grande por cima de tudo (para de tocar aqui; no grande ele já começa)
  function expand() {
    if (!src && !embed) return;
    videoRef.current?.pause();
    setPlaying(false);
    setBig(true);
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
      {big && <BigVideo src={src} embedSrc={embed?.src} onClose={() => setBig(false)} />}
      {/* corpo do player */}
      <div
        className="relative rounded-[1em] p-[0.3em]"
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
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1em]" style={{ background: "linear-gradient(150deg, rgba(255,255,255,.34) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 70%, rgba(255,255,255,.12) 100%)" }} />

        {/* moldura da tela (vidro) */}
        <div className="relative rounded-[0.7em] bg-black p-[0.12em]" style={{ boxShadow: "inset 0 0 0 0.07em rgba(255,255,255,.1), 0 0.08em 0.1em rgba(255,255,255,.35), inset 0 0.2em 0.5em rgba(0,0,0,.9)" }}>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[0.6em] bg-black">
            {embed ? (
              playing ? (
                <iframe
                  src={embed.src}
                  title="Vídeo do YouTube"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                  className="absolute inset-0 size-full border-0"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://i.ytimg.com/vi/${embed.id}/hqdefault.jpg`} alt="" draggable={false} className="size-full object-cover" />
              )
            ) : src ? (
              <video
                ref={videoRef}
                src={`${src}#t=0.1`}
                preload="metadata"
                playsInline
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
            <div hidden={!!embed} className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-[0.55em] pt-[1.2em] pb-[0.4em] text-white">
              <div className="relative h-[0.22em] rounded-full bg-white/35" role="progressbar" aria-label="Progresso do vídeo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
                <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${ratio * 100}%` }} />
                <span className="absolute top-1/2 size-[0.6em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${ratio * 100}%` }} />
              </div>
              <div className="mt-[0.3em] flex items-center gap-[0.4em] font-mono text-[0.6em] leading-none">
                <span aria-hidden className="inline-block">{playing ? "❚❚" : "▶"}</span>
                <span>
                  {fmt(cur)} / {dur > 0 ? fmt(dur) : "--:--"}
                </span>
              </div>
            </div>

            {/* reflexo no vidro + vinheta */}
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(118deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.06) 32%, rgba(255,255,255,0) 33%), radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,.45) 100%)" }} />
          </div>
        </div>

        {/* botões do aparelho: só tocar/pausar e ampliar */}
        <div className="mt-[0.35em] flex items-center justify-center gap-[0.5em]">
          <HwButton look={look} label={playing ? "Pausar" : "Reproduzir"} onClick={toggle} big>
            {playing ? PauseIcon : PlayIcon}
          </HwButton>
          <HwButton look={look} label="Ver o vídeo em tamanho maior" onClick={expand}>
            <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
            </svg>
          </HwButton>
        </div>
      </div>

      {/* mensagem: papelzinho colado embaixo (some se não houver mensagem) */}
      {caption && <CaptionNote>{caption}</CaptionNote>}
    </article>
  );
}
