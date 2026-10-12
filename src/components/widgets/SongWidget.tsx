"use client";

import { baseStyle } from "@/lib/displayShape";
import { spotifyEmbed } from "@/lib/songSearch";
import { useInDetail } from "../board/ListEditContext";
import { WidgetFrame } from "./core";

/** Estilos da música favorita: vinil (escuro, com o disco), clássico (papel claro) e neon (roxo e rosa). */
const SKINS: Record<string, { bg: string; ink: string; sub: string; label: string; play: string; playInk: string; coverBg: string }> = {
  vinyl: { bg: "linear-gradient(135deg,#1d1814,#0b0908)", ink: "#f6efe0", sub: "rgba(246,239,224,.68)", label: "#e0a63a", play: "#e0a63a", playInk: "#1a1205", coverBg: "#3a2f26" },
  classic: { bg: "linear-gradient(150deg,#fffaf0,#f1e4c6)", ink: "#2f2218", sub: "#6b5440", label: "#b5471f", play: "#b5471f", playInk: "#ffffff", coverBg: "#e4d3ae" },
  neon: { bg: "linear-gradient(135deg,#2a1055,#0c0624)", ink: "#fbeaff", sub: "rgba(251,234,255,.68)", label: "#ff6ad5", play: "#ff6ad5", playInk: "#2a0a3a", coverBg: "#3a1f6a" },
};

/**
 * Música favorita (retangular): a capa, o nome e o artista, com o botão de tocar. No mural é só o cartão; ao tocar nele abre o detalhe,
 * e ali o cartão vira o player oficial do Spotify, que qualquer pessoa pode tocar (quem não tem conta ouve um trecho).
 */
export function SongWidget({ style = "vinyl", track, title, artist, cover, frame }: { style?: string; track?: string; title?: string; artist?: string; cover?: string; frame?: string | null }) {
  const inDetail = useInDetail();
  const sk = SKINS[baseStyle(style)] ?? SKINS.vinyl;
  const vinyl = baseStyle(style) === "vinyl";
  const name = (title ?? "").trim() || "Sua música favorita";
  const embed = inDetail ? spotifyEmbed(track) : null;

  return (
    <WidgetFrame frame={frame} label="Música favorita">
      {embed ? (
        <iframe title={`Player do Spotify: ${name}`} src={embed} className="absolute inset-0 size-full rounded-[1.1em] border-0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
      ) : (
        <div className="absolute inset-0 flex items-center gap-[1.1em] overflow-hidden px-[1.1em]" style={{ background: sk.bg, color: sk.ink }}>
          {vinyl && (
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute top-1/2 -right-[3.2em] size-[12em] -translate-y-1/2 opacity-80" aria-hidden>
              <circle cx="50" cy="50" r="49" fill="#0e0c0a" stroke="#2c2620" strokeWidth="1" />
              {[40, 33, 26].map((r) => (
                <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#2a241e" strokeWidth="1.2" />
              ))}
              <circle cx="50" cy="50" r="14" fill="#e0a63a" />
              <circle cx="50" cy="50" r="2.4" fill="#0e0c0a" />
            </svg>
          )}
          <div className="relative size-[8.6em] shrink-0 overflow-hidden rounded-[0.6em]" style={{ background: sk.coverBg, boxShadow: "0 0.25em 0.7em rgba(0,0,0,.45)" }}>
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={`Capa de ${name}`} draggable={false} referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-[45%]" fill="none" stroke={sk.ink} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden opacity=".55">
                <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z" />
              </svg>
            )}
            <span className="absolute right-[0.4em] bottom-[0.4em] grid size-[2.2em] place-items-center rounded-full shadow-[0_0.15em_0.4em_rgba(0,0,0,.5)]" style={{ background: sk.play, color: sk.playInk }}>
              <svg viewBox="0 0 24 24" className="size-[1.1em] translate-x-[0.05em]" fill="currentColor" aria-hidden>
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            </span>
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-[0.72em] font-extrabold tracking-[0.16em] uppercase" style={{ color: sk.label }}>
              Música favorita
            </p>
            <p className="mt-[0.3em] line-clamp-2 text-[1.35em] leading-[1.15] font-extrabold [overflow-wrap:anywhere]" title={name}>
              {name}
            </p>
            {artist && (
              <p className="mt-[0.3em] line-clamp-1 text-[0.95em] font-semibold" style={{ color: sk.sub }}>
                {artist}
              </p>
            )}
            <p className="mt-[0.55em] text-[0.62em] font-semibold tracking-wide uppercase" style={{ color: sk.sub }}>
              Toque para ouvir · Spotify
            </p>
          </div>
        </div>
      )}
    </WidgetFrame>
  );
}
