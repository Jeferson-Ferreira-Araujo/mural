"use client";

import { useState } from "react";
import { PlayButton, Pin } from "./fasteners";
import { Scene } from "./Scene";

/** Vídeo apresentado como uma fotografia impressa, com preview, play e barra de progresso. */
export function VideoPrint({ caption, duration }: { caption: string; duration: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article
      aria-label="Vídeo"
      className="paper-grain shadow-paper relative w-[14em] bg-[#f8f4e8] px-[0.8em] pt-[0.8em] pb-[0.9em]"
      style={{ borderRadius: "0.2em" }}
    >
      <Pin color="#e0160e" className="top-[-0.6em] left-[1.1em]" />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
        <Scene variant="sunset" />
        <span aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,.05)_0_1px,transparent_1px_3px)]" />
        <PlayButton
          playing={playing}
          onClick={() => setPlaying((p) => !p)}
          label="vídeo"
          className="absolute top-1/2 left-1/2 size-[3.2em] -translate-x-1/2 -translate-y-1/2 bg-black/55 text-white shadow-[0_0.2em_0.8em_rgba(0,0,0,.4)] backdrop-blur-[2px] hover:bg-black/70"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-[0.5em] bg-gradient-to-t from-black/70 to-transparent px-[0.6em] pt-[1em] pb-[0.4em] text-white">
          <span aria-hidden className="relative h-[0.22em] flex-1 overflow-hidden rounded-full bg-white/35">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] ease-linear"
              style={{ width: playing ? "96%" : "28%", transitionDuration: playing ? "24s" : "0.3s" }}
            />
          </span>
          <span className="font-mono text-[0.7em]">{duration}</span>
        </div>
      </div>
      <p className="font-hand mt-[0.45em] text-[1.4em] leading-[1.08] text-[#2f2a24]">{caption}</p>
    </article>
  );
}
