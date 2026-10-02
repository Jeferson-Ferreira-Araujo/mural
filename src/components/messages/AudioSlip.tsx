"use client";

import { useState } from "react";
import { PlayButton, Pin } from "./fasteners";

const bars = [30, 55, 38, 70, 90, 60, 42, 76, 50, 34, 66, 84, 48, 28, 58, 72, 40, 62, 32, 24, 46, 68, 36, 52];

/** Recado de voz: ficha de papel kraft com forma de onda desenhada à tinta. */
export function AudioSlip({ caption, duration }: { caption: string; duration: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article
      aria-label="Áudio"
      className="paper-grain shadow-paper relative w-[16em] bg-[#e6cfa1] px-[1em] pt-[1.5em] pb-[0.9em]"
      style={{
        borderRadius: "0.2em",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,.22), transparent 30%), repeating-linear-gradient(90deg, rgba(120,80,30,.05) 0 2px, transparent 2px 5px)",
      }}
    >
      <Pin color="#2f6fb5" className="top-[0.4em] left-[0.7em]" />
      <Pin color="#2f6fb5" className="top-[0.4em] right-[0.7em]" />
      <div className="flex items-center gap-[0.8em]">
        <PlayButton
          playing={playing}
          onClick={() => setPlaying((p) => !p)}
          label="áudio"
          className="size-[3em] bg-[#3b2616] text-[#f6e8c8] hover:bg-[#51361f]"
        />
        <div className="flex h-[3.2em] flex-1 items-center gap-[0.18em]" aria-hidden>
          {bars.map((h, i) => (
            <span
              key={i}
              className="block w-[0.28em] origin-center rounded-full bg-[#3b2616]/80"
              style={{
                height: `${h}%`,
                animation: playing ? `bar ${0.7 + (i % 5) * 0.12}s ease-in-out ${i * 0.04}s infinite` : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-[0.45em] flex items-baseline justify-between">
        <p className="font-hand text-[1.4em] leading-none text-[#3b2616]">{caption}</p>
        <span className="font-mono text-[0.75em] text-[#3b2616]/70">{duration}</span>
      </div>
    </article>
  );
}
