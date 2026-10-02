"use client";

import { useState } from "react";
import { PlayButton, Pin } from "./fasteners";

/** Música: capa de disco em papelão com o vinil saindo pela lateral. */
export function MusicSleeve({ title, artist }: { title: string; artist: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article aria-label="Música" className="relative h-[12em] w-[17em]">
      {/* vinil */}
      <div
        aria-hidden
        className="absolute top-[0.9em] left-[5em] size-[10.2em] rounded-full shadow-[0.2em_0.5em_0.8em_rgba(30,12,0,.5)]"
        style={{
          background:
            "radial-gradient(circle, #d9a441 0 15%, #1b1b1d 16% 18%, transparent 18%), repeating-radial-gradient(circle, #151517 0 0.12em, #232326 0.12em 0.24em)",
          animation: "spin 3.2s linear infinite",
          animationPlayState: playing ? "running" : "paused",
        }}
      >
        <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,transparent,rgba(255,255,255,.14),transparent_30%,transparent_50%,rgba(255,255,255,.1),transparent_80%)]" />
        <span className="absolute top-1/2 left-1/2 size-[0.7em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#efe7d2]" />
      </div>
      {/* capa */}
      <div
        className="paper-grain shadow-paper absolute top-0 left-0 flex size-[12em] flex-col justify-between bg-[#2f5d62] p-[1em] text-[#f4ead2]"
        style={{
          borderRadius: "0.2em",
          backgroundImage:
            "radial-gradient(circle at 80% 15%, rgba(255,214,140,.35), transparent 40%), linear-gradient(160deg, transparent 55%, rgba(0,0,0,.25))",
        }}
      >
        <Pin color="#e0b043" className="top-[0.45em] left-1/2 -translate-x-1/2" />
        <span className="font-mono mt-[0.6em] text-[0.62em] tracking-[0.25em] uppercase opacity-70">♪ pra você ouvir</span>
        <div>
          <p className="font-title text-[1.5em] leading-[1.05] font-semibold">{title}</p>
          <p className="font-hand mt-[0.15em] text-[1.25em] leading-none opacity-85">{artist}</p>
        </div>
        <div className="flex items-center gap-[0.6em]">
          <PlayButton
            playing={playing}
            onClick={() => setPlaying((p) => !p)}
            label="música"
            className="size-[2.4em] bg-[#f4ead2] text-[#2f5d62] hover:bg-white"
          />
          <span aria-hidden className="relative h-[0.2em] flex-1 overflow-hidden rounded-full bg-[#f4ead2]/30">
            <span
              className="absolute inset-y-0 left-0 w-[35%] rounded-full bg-[#f4ead2] transition-[width] duration-[4000ms] ease-linear"
              style={{ width: playing ? "92%" : "35%" }}
            />
          </span>
        </div>
      </div>
    </article>
  );
}
