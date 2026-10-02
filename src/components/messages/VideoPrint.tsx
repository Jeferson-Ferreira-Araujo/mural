"use client";

import { useState } from "react";
import { PlayButton, Tape } from "./fasteners";
import { Scene } from "./Scene";

/** Vídeo apresentado como uma fotografia impressa com um botão de play. */
export function VideoPrint({ caption, duration }: { caption: string; duration: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article
      aria-label="Vídeo"
      className="paper-grain shadow-paper relative w-[17em] bg-[#f6f1e4] px-[0.9em] pt-[0.9em] pb-[0.8em]"
      style={{ borderRadius: "0.2em" }}
    >
      <Tape className="-top-[0.9em] left-[1.2em]" rotate={-8} />
      <Tape className="-top-[0.9em] right-[1.2em]" rotate={7} tone="rgba(190, 215, 230, .7)" />
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <Scene variant="hills" />
        {/* marcas de "vídeo" */}
        <span aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,.05)_0_1px,transparent_1px_3px)]" />
        <span className="absolute top-[0.5em] left-[0.55em] flex items-center gap-[0.35em] rounded-[0.2em] bg-black/55 px-[0.5em] py-[0.15em] font-mono text-[0.7em] text-white">
          <span className={`size-[0.55em] rounded-full bg-red-500 ${playing ? "animate-pulse" : ""}`} /> REC
        </span>
        <PlayButton
          playing={playing}
          onClick={() => setPlaying((p) => !p)}
          label="vídeo"
          className="absolute top-1/2 left-1/2 size-[3.6em] -translate-x-1/2 -translate-y-1/2 bg-white/90 text-[#3b2616] shadow-[0_0.2em_0.8em_rgba(0,0,0,.4)] hover:bg-white"
        />
        <span className="absolute right-[0.5em] bottom-[0.45em] rounded-[0.2em] bg-black/60 px-[0.45em] py-[0.1em] font-mono text-[0.72em] text-white">
          {playing ? `0:0${3} / ${duration}` : duration}
        </span>
      </div>
      <p className="font-hand mt-[0.35em] text-[1.45em] leading-tight text-[#3a2f24]">{caption}</p>
    </article>
  );
}
