"use client";

import { useEffect, useRef, useState } from "react";
import { Tape } from "./fasteners";
import { Scene } from "./Scene";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (s: number) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
/** "0:24" → 24 */
const parse = (d?: string) => {
  const m = d?.match(/^(\d+):(\d{1,2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** Botão físico do player (aro escuro com brilho). */
function HwButton({ label, onClick, big = false, children }: { label: string; onClick?: () => void; big?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid cursor-pointer place-items-center rounded-full text-[#e8e8ea] shadow-[inset_0_0.08em_0.1em_rgba(255,255,255,.28),0_0.12em_0.25em_rgba(0,0,0,.6)] transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f4c542] ${big ? "h-[2.3em] w-[2.8em]" : "h-[1.8em] w-[2.2em]"}`}
      style={{ background: "linear-gradient(180deg, #4a4a4f, #232326 70%, #1b1b1d)" }}
    >
      {children}
    </button>
  );
}

const icon = "size-[1em]";

/**
 * Vídeo: um mini player MP4 (visto de frente). A mensagem, se houver, vai num papelzinho colado embaixo;
 * sem mensagem, aparece só o player.
 * `src` = vídeo escolhido pela pessoa (toca de verdade); sem `src`, é uma cena de exemplo com tempo simulado.
 */
export function VideoPrint({ caption, duration, src }: { caption: string; duration?: string; src?: string }) {
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
        className="shadow-paper relative rounded-[1.1em] p-[0.6em]"
        style={{
          background: "linear-gradient(160deg, #3b3b40 0%, #19191b 55%, #232326 100%)",
          boxShadow:
            "inset 0 0 0 0.1em rgba(214,160,98,.5), inset 0 0.12em 0.2em rgba(255,255,255,.18), 0 0.06em 0.1em rgba(40,20,5,.3), 0.12em 0.5em 0.7em -0.1em rgba(40,20,5,.4), 0.3em 1em 1.2em -0.3em rgba(40,20,5,.3)",
        }}
      >
        {/* tela */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[0.6em] bg-black shadow-[inset_0_0_0_0.1em_#000]">
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
        </div>

        {/* botões do aparelho */}
        <div className="mt-[0.6em] flex items-center justify-between px-[0.2em]">
          {/* alto-falante */}
          <span aria-hidden className="grid grid-cols-4 gap-[0.18em]">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="size-[0.26em] rounded-full bg-[#050506] shadow-[0_0.05em_0_rgba(255,255,255,.18)]" />
            ))}
          </span>
          <span className="flex items-center gap-[0.25em]">
            <HwButton label="Voltar 5 segundos" onClick={() => skip(-5)}>
              <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
                <path d="M12 6v12L3 12l9-6Zm9 0v12l-9-6 9-6Z" />
              </svg>
            </HwButton>
            <HwButton label={playing ? "Pausar" : "Reproduzir"} onClick={toggle} big>
              {playing ? PauseIcon : PlayIcon}
            </HwButton>
            <HwButton label="Avançar 5 segundos" onClick={() => skip(5)}>
              <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
                <path d="M12 6v12l9-6-9-6ZM3 6v12l9-6-9-6Z" />
              </svg>
            </HwButton>
          </span>
          {/* botão de menu: só enfeite do aparelho */}
          <span aria-hidden className="grid h-[1.8em] w-[1.9em] place-items-center rounded-full text-[#bdbdc2]" style={{ background: "linear-gradient(180deg, #3c3c40, #1d1d1f)" }}>
            <svg viewBox="0 0 24 24" className="size-[1em]" fill="currentColor">
              <path d="M5 7h14v2H5V7Zm0 4h14v2H5v-2Zm0 4h14v2H5v-2Z" />
            </svg>
          </span>
        </div>
      </div>

      {/* mensagem: papelzinho colado embaixo (some se não houver mensagem) */}
      {caption && (
        <div className="relative z-10 mx-auto mt-[0.45em] w-[11.6em] rotate-[-1deg]" style={{ filter: "drop-shadow(0.1em 0.3em 0.28em rgba(40,20,5,.4))" }}>
          <Tape className="-top-[0.8em] left-1/2 h-[1.5em] w-[4.6em] -translate-x-1/2" rotate={0} tone="rgba(238, 224, 168, .85)" />
          <p
            className="paper-grain font-hand relative bg-[#f5f0e2] px-[0.9em] pt-[1.1em] pb-[0.9em] text-[1.3em] leading-[1.12] break-words text-[#2f2a24]"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 94%, 94% 100%, 84% 95%, 72% 100%, 60% 95%, 48% 100%, 36% 95%, 24% 100%, 12% 95%, 5% 100%, 0 95%)" }}
          >
            {caption}
          </p>
        </div>
      )}
    </article>
  );
}
