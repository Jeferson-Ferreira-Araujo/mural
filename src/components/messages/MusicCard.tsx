"use client";

import { useState } from "react";
import { PlayButton, Tape } from "./fasteners";

/**
 * Música: cartão físico (papel) com um "cartão de player" roxo colado e a dedicatória.
 * Com `link`, o play abre a música em outra aba; sem link é só o cartão (o vinil gira de enfeite).
 */
export function MusicCard({
  title,
  artist,
  caption,
  duration,
  link,
}: {
  title: string;
  artist: string;
  caption: string;
  duration?: string;
  link?: string;
}) {
  const [playing, setPlaying] = useState(false);

  function onPlay() {
    if (link) window.open(link, "_blank", "noopener,noreferrer");
    else setPlaying((p) => !p);
  }

  return (
    <article
      aria-label="Música"
      className="paper-grain shadow-paper relative w-[14em] bg-[#f8f4e8] p-[0.6em] pb-[0.8em]"
      style={{ borderRadius: "0.25em" }}
    >
      <Tape className="top-[-0.55em] left-1/2 -translate-x-1/2" rotate={-2} />
      <div
        className="relative rounded-[0.7em] p-[0.7em] text-white"
        style={{ background: "linear-gradient(150deg, #b455e0 0%, #7a3ee0 55%, #5a2fb8 100%)" }}
      >
        <span
          aria-hidden
          className="absolute top-[0.55em] right-[0.55em] grid size-[1.5em] place-items-center rounded-full bg-[#3ddc84] text-[0.8em] leading-none text-[#0e2a1a]"
        >
          ♪
        </span>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[0.4em] bg-[#241038]">
          {/* capa: vinil */}
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 size-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, #e0a53c 0 14%, #111 15% 17%, transparent 17%), repeating-radial-gradient(circle, #141416 0 0.1em, #26262a 0.1em 0.2em)",
              animation: "spin 4s linear infinite",
              animationPlayState: playing ? "running" : "paused",
            }}
          />
          <PlayButton
            playing={playing}
            onClick={onPlay}
            label={link ? "música (abre o link)" : "música"}
            className="absolute top-1/2 left-1/2 size-[2.8em] -translate-x-1/2 -translate-y-1/2 bg-white/90 text-[#3a1a78] shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)] hover:bg-white"
          />
        </div>
        <p className="mt-[0.6em] text-[1em] leading-tight font-semibold break-words">{title}</p>
        <p className="text-[0.8em] leading-tight break-words text-white/75">{artist}</p>
        {duration && (
          <div className="mt-[0.5em] flex items-center gap-[0.5em] font-mono text-[0.68em] text-white/85">
            <span>0:00</span>
            <span aria-hidden className="relative h-[0.2em] flex-1 overflow-hidden rounded-full bg-white/30">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] ease-linear"
                style={{ width: playing ? "96%" : "0%", transitionDuration: playing ? "45s" : "0.3s" }}
              />
            </span>
            <span>{duration}</span>
          </div>
        )}
      </div>
      {caption && <p className="font-hand mt-[0.5em] px-[0.3em] text-[1.4em] leading-[1.08] break-words text-[#2f2a24]">{caption}</p>}
    </article>
  );
}
