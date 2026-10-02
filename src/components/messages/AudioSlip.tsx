"use client";

import { useState } from "react";
import { PlayButton, Tape } from "./fasteners";

const bars = [30, 55, 38, 70, 90, 60, 42, 76, 50, 34, 66, 84, 48, 28, 58, 72, 40, 62, 32, 46];

/** Áudio: papel verde-menta com cápsula de reprodução e forma de onda. */
export function AudioSlip({ text, duration }: { text: string; duration: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article
      aria-label="Áudio"
      className="paper-grain shadow-paper relative w-[14em] bg-[#cfe6cf] px-[1em] pt-[2em] pb-[1em]"
      style={{
        borderRadius: "0.2em",
        backgroundImage: "linear-gradient(160deg, rgba(255,255,255,.35), transparent 40%, rgba(0,0,0,.06))",
      }}
    >
      <Tape className="top-[-0.5em] left-1/2 -translate-x-1/2" rotate={2} tone="rgba(246, 238, 190, .75)" />
      <div className="flex items-center gap-[0.55em] rounded-full bg-[#9fcba5]/70 p-[0.4em] pr-[0.8em]">
        <PlayButton
          playing={playing}
          onClick={() => setPlaying((p) => !p)}
          label="áudio"
          className="size-[2.5em] bg-[#1f5f3f] text-white hover:bg-[#276f49]"
        />
        <div className="flex h-[2.2em] flex-1 items-center gap-[0.14em]" aria-hidden>
          {bars.map((h, i) => (
            <span
              key={i}
              className="block w-[0.2em] origin-center rounded-full bg-[#1f5f3f]"
              style={{
                height: `${h}%`,
                animation: playing ? `bar ${0.7 + (i % 5) * 0.12}s ease-in-out ${i * 0.04}s infinite` : undefined,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-[0.7em] text-[#1f3d2c]">{duration}</span>
      </div>
      <p className="font-hand mt-[0.5em] text-[1.4em] leading-[1.1] text-[#1f3d2c]">{text}</p>
    </article>
  );
}
