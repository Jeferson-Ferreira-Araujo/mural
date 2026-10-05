"use client";

import type { ReactNode } from "react";
import { formatInfo, type MessageType } from "@/lib/types";

/** Miniaturas que lembram cada formato físico (sem ícones genéricos iguais). */
const THUMBS: Record<MessageType, ReactNode> = {
  postit: <span className="block size-9 rotate-[-4deg] bg-[#fbe36a] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)]" style={{ borderRadius: "1px 1px 8px 1px" }} />,
  text: (
    <span
      className="block h-10 w-8 rotate-[3deg] bg-[#fbf7ea] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)]"
      style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 6px, rgba(90,140,200,.5) 6px 7px)" }}
    />
  ),
  list: (
    <span className="block h-10 w-8 rotate-[-2deg] bg-[#f7f1e1] p-1 shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="mb-[3px] flex items-center gap-[2px]">
          <span className="size-[5px] border border-[#2a2a33]" />
          <span className="h-[2px] flex-1 bg-[#2a2a33]/60" />
        </span>
      ))}
    </span>
  ),
  photo: (
    <span className="block w-9 rotate-[4deg] bg-white p-[3px] pb-[8px] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)]">
      <span className="block aspect-square bg-gradient-to-b from-[#3b4a7a] via-[#d9766b] to-[#f5b46a]" />
    </span>
  ),
  draw: (
    <span className="block h-9 w-11 rotate-[-3deg] bg-[#fdfcf7] p-[3px] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)]">
      <svg viewBox="0 0 40 28" className="size-full" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 21c5-14 9 6 14-6s8 5 12-5" stroke="#e0443a" strokeWidth="2.4" />
        <circle cx="31" cy="20" r="3" stroke="#2b6fd6" strokeWidth="2" />
      </svg>
    </span>
  ),
  music: (
    <span className="flex h-8 w-12 items-center gap-[3px] rounded-[8px] bg-gradient-to-b from-[#7a3ee0] to-[#4a1fb0] p-[3px] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)] ring-1 ring-white/40">
      <span className="h-full flex-1 rounded-[3px] bg-[#0f2a4d]" />
      <span className="size-[18px] shrink-0 rounded-full bg-white/75 ring-1 ring-black/20" />
    </span>
  ),
  place: (
    <span className="block h-8 w-12 rounded-[8px] bg-gradient-to-b from-[#f1f1f5] to-[#8e8f99] p-[3px] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)] ring-1 ring-white/60">
      <span className="relative block h-full overflow-hidden rounded-[4px] bg-[#dfe9d5]">
        <span className="absolute top-[8px] -left-1 h-[3px] w-[60px] rotate-[-18deg] bg-white" />
        <span className="absolute -top-1 left-[10px] h-[40px] w-[3px] rotate-[12deg] bg-[#f4d58a]" />
        <span className="absolute top-[3px] left-[18px] size-[8px] rotate-[45deg] rounded-full rounded-br-none bg-[#e53935]" />
      </span>
    </span>
  ),
  voice: (
    <span className="flex h-7 w-11 gap-[3px] rounded-[7px] bg-gradient-to-b from-[#f1e6d3] to-[#b5a07a] p-[3px] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)] ring-1 ring-white/60">
      <span className="grid w-[10px] place-items-center rounded-[3px] bg-black/10">
        <span className="size-[2px] rounded-full bg-[#6b5a3c] shadow-[0_3px_0_#6b5a3c,0_-3px_0_#6b5a3c]" />
      </span>
      <span className="flex flex-1 items-center justify-center gap-[1px] rounded-[3px] bg-[#111]">
        {[4, 9, 6, 11, 5, 8].map((h, i) => (
          <span key={i} className="w-[1.5px] rounded-full bg-white/85" style={{ height: h }} />
        ))}
      </span>
    </span>
  ),
  video: (
    <span className="block w-10 rounded-[6px] bg-gradient-to-br from-[#3b3b40] to-[#19191b] p-[3px] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)] ring-1 ring-[#d6a062]/60">
      <span className="grid aspect-[16/10] place-items-center rounded-[3px] bg-black text-[9px] text-white">▶</span>
      <span className="mt-[3px] flex justify-center gap-[2px]">
        <span className="h-[4px] w-[6px] rounded-full bg-[#55555a]" />
        <span className="h-[4px] w-[8px] rounded-full bg-[#55555a]" />
        <span className="h-[4px] w-[6px] rounded-full bg-[#55555a]" />
      </span>
    </span>
  ),
};

/** Escolha do formato. Mostra SÓ os formatos liberados neste mural (o visitante nunca vê o que não está disponível). */
export function FormatPicker({ formats, onPick }: { formats: readonly MessageType[]; onPick: (f: MessageType) => void }) {
  const card = "flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-[#e1d3ba] bg-white/60 px-3 py-4 text-center transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  return (
    <div>
      <h3 className="font-title text-lg font-semibold">Como você quer deixar o seu PINZ?</h3>
      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {formats.map((f) => (
          <li key={f}>
                        <button
              type="button"
              onClick={() => onPick(f)}
              className={card}
            >
              <span className="grid h-12 place-items-center">{THUMBS[f]}</span>
              <span className="text-sm font-bold">{formatInfo[f].label}</span>
              <span className="text-xs leading-tight text-[#6b5440]">{formatInfo[f].hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
