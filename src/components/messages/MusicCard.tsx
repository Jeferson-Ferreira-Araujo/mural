"use client";

import { useEffect, useState } from "react";
import type { PlayerColor } from "@/lib/types";
import { embedFor } from "@/lib/embed";
import { CaptionNote } from "./CaptionNote";
import { PLAYER_PALETTE } from "./playerPalette";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (s: number) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
/** "3:45" → 225 */
const parse = (d?: string) => {
  const m = d?.match(/^(\d+):(\d{1,2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};

/**
 * Música: um mini MP3 player horizontal (visto de frente): tela à esquerda, roda de controle à direita.
 * A mensagem/dedicatória, se houver, vai num papelzinho colado embaixo; sem ela, aparece só o aparelho.
 * Com `link` do Spotify ou do YouTube, o botão central toca ali mesmo (player oficial embutido, sem sair da página);
 * outros links abrem em outra aba; sem link, é só o aparelho (o tempo corre de enfeite).
 */
export function MusicCard({
  title,
  artist,
  caption,
  duration,
  link,
  color = "black",
}: {
  title: string;
  artist: string;
  caption: string;
  duration?: string;
  link?: string;
  color?: PlayerColor;
}) {
  const look = PLAYER_PALETTE[color];
  const dur = parse(duration);
  const embed = embedFor(link);
  // pins novos não têm nome nem artista: a tela mostra de onde vem a música
  const label = title || (embed ? (embed.provider === "spotify" ? "Spotify" : "YouTube") : "Minha música");
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);

  // sem link: simula a reprodução (tempo e vinil)
  useEffect(() => {
    if (link || !playing) return; // com link, quem toca é o player embutido (ou a outra aba)
    const t = setInterval(() => {
      setCur((c) => {
        if (dur > 0 && c + 1 >= dur) {
          setPlaying(false);
          return 0;
        }
        return c + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [link, playing, dur]);

  function onPlay() {
    if (embed) setPlaying((p) => !p); // abre/fecha o player embutido (fechar para a música)
    else if (link) window.open(link, "_blank", "noopener,noreferrer");
    else setPlaying((p) => !p);
  }

  const ratio = dur > 0 ? Math.min(cur / dur, 1) : playing ? 0.3 : 0;
  const key = "inset 0 0.08em 0.06em rgba(255,255,255,.55), inset 0 -0.1em 0.12em rgba(0,0,0,.4), 0 0.14em 0.2em rgba(0,0,0,.5)";
  const keyBg = `radial-gradient(120% 90% at 50% 15%, ${look.btn[0]}, ${look.btn[1]} 80%)`;
  const mark = { color: look.icon, opacity: 0.8 };

  return (
    <article aria-label="Música" className="relative w-[14em]">
      {/* corpo do MP3 player (horizontal) */}
      <div
        className="relative flex items-stretch gap-[0.55em] rounded-[1.2em] p-[0.6em]"
        style={{
          background: `linear-gradient(172deg, ${look.body[0]} 0%, ${look.body[1]} 46%, ${look.body[2]} 100%)`,
          boxShadow: [
            `inset 0 0 0 0.09em ${look.rim}`,
            "inset 0.1em 0.14em 0.2em rgba(255,255,255,.4)",
            "inset -0.1em -0.16em 0.24em rgba(0,0,0,.5)",
            "0 0.06em 0.1em rgba(40,20,5,.35)",
            "0.14em 0.55em 0.75em -0.1em rgba(40,20,5,.45)",
            "0.32em 1.1em 1.3em -0.3em rgba(40,20,5,.35)",
          ].join(", "),
        }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.2em]" style={{ background: "linear-gradient(150deg, rgba(255,255,255,.34) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 70%, rgba(255,255,255,.12) 100%)" }} />

        {/* tela (esquerda) */}
        <div className="relative min-w-0 flex-1 rounded-[0.7em] bg-black p-[0.18em]" style={{ boxShadow: "inset 0 0 0 0.07em rgba(255,255,255,.1), 0 0.08em 0.1em rgba(255,255,255,.35), inset 0 0.2em 0.5em rgba(0,0,0,.9)" }}>
          <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[0.5em] px-[0.55em] py-[0.45em] text-[#d9ecff]" style={{ background: "linear-gradient(180deg, #0f2a4d 0%, #0a1c36 100%)" }}>
            <div className="flex items-center justify-between font-mono text-[0.5em] leading-none text-[#8fc2ff]">
              <span>♪ Tocando</span>
              <span aria-hidden className="relative inline-block h-[0.85em] w-[1.5em] rounded-[0.15em] border border-current">
                <span className="absolute inset-[0.12em] right-[0.3em] rounded-[0.05em] bg-current" />
              </span>
            </div>

            <div className="my-[0.35em] flex items-center gap-[0.45em]">
              <span
                aria-hidden
                className="relative size-[1.9em] shrink-0 rounded-[0.3em]"
                style={{ background: `linear-gradient(135deg, ${look.body[0]}, ${look.body[2]})`, boxShadow: "inset 0 0 0 0.06em rgba(255,255,255,.25)" }}
              >
                <span
                  className="absolute inset-[0.25em] rounded-full"
                  style={{
                    background: "radial-gradient(circle, #e0a53c 0 16%, #111 17% 20%, transparent 20%), repeating-radial-gradient(circle, #141416 0 0.06em, #2a2a2e 0.06em 0.12em)",
                    animation: "spin 3s linear infinite",
                    animationPlayState: playing ? "running" : "paused",
                  }}
                />
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 block text-[0.78em] leading-[1.1] font-bold break-words">{label}</span>
                {artist && <span className="mt-[0.1em] line-clamp-1 block text-[0.58em] leading-tight break-words text-[#9ec8ff]">{artist}</span>}
              </span>
            </div>

            <div>
              <div className="relative h-[0.18em] rounded-full bg-white/20" role="progressbar" aria-label="Progresso da música" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
                <span className="absolute inset-y-0 left-0 rounded-full bg-[#5db2ff]" style={{ width: `${ratio * 100}%` }} />
                <span className="absolute top-1/2 size-[0.46em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${ratio * 100}%` }} />
              </div>
              <div className="mt-[0.25em] flex justify-between font-mono text-[0.46em] leading-none text-[#8fc2ff]">
                <span>{fmt(cur)}</span>
                <span>{dur > 0 ? `-${fmt(Math.max(dur - cur, 0))}` : "--:--"}</span>
              </div>
            </div>

            {/* reflexo no vidro */}
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(118deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.05) 32%, rgba(255,255,255,0) 33%)" }} />
          </div>
        </div>

        {/* roda de controle (direita) */}
        <div className="relative size-[5.3em] shrink-0 self-center rounded-full" style={{ background: `radial-gradient(circle at 50% 30%, ${look.btn[0]}, ${look.btn[1]} 85%)`, boxShadow: "inset 0 0.1em 0.1em rgba(255,255,255,.5), inset 0 -0.14em 0.2em rgba(0,0,0,.45), 0 0.16em 0.3em rgba(0,0,0,.5)" }}>
          {/* marcas da roda (só enfeite do aparelho) */}
          <span aria-hidden className="absolute top-[0.4em] left-1/2 -translate-x-1/2 font-mono text-[0.42em] leading-none font-bold tracking-wider" style={mark}>
            MENU
          </span>
          <svg aria-hidden viewBox="0 0 24 24" className="absolute top-1/2 left-[0.5em] size-[0.8em] -translate-y-1/2" style={mark} fill="currentColor">
            <path d="M12 6v12L3 12l9-6Zm9 0v12l-9-6 9-6Z" />
          </svg>
          <svg aria-hidden viewBox="0 0 24 24" className="absolute top-1/2 right-[0.5em] size-[0.8em] -translate-y-1/2" style={mark} fill="currentColor">
            <path d="M12 6v12l9-6-9-6ZM3 6v12l9-6-9-6Z" />
          </svg>
          <span aria-hidden className="absolute bottom-[0.4em] left-1/2 -translate-x-1/2 text-[0.6em] leading-none" style={mark}>
            ▶❚❚
          </span>

          {/* botão central: o único que funciona */}
          <button
            type="button"
            onClick={onPlay}
            aria-label={embed ? (playing ? "Parar a música" : "Ouvir a música aqui") : link ? "Ouvir a música (abre o link)" : playing ? "Pausar" : "Reproduzir"}
            className="absolute top-1/2 left-1/2 grid size-[2.3em] -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full transition active:scale-95 active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c542]"
            style={{ color: look.icon, background: keyBg, boxShadow: `${key}, 0 0 0 0.1em rgba(0,0,0,.28)` }}
          >
            {playing && (embed || !link) ? (
              <svg viewBox="0 0 24 24" className="size-[1em]" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-[1em] translate-x-[8%]" fill="currentColor" aria-hidden>
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {embed && playing && (
        <div className={`relative z-10 mx-auto mt-[0.6em] w-full overflow-hidden rounded-[0.7em] bg-black shadow-[0_0.3em_0.8em_rgba(0,0,0,.45)] ${embed.kind === "video" ? "aspect-video" : "h-[6.4em]"}`}>
          <iframe
            src={embed.src}
            title={`Tocando: ${label}`}
            allow="autoplay; encrypted-media; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            className="absolute inset-0 size-full border-0"
          />
        </div>
      )}

      {caption && <CaptionNote>{caption}</CaptionNote>}
    </article>
  );
}
