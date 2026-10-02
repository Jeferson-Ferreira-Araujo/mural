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
  music: (
    <span className="block w-10 rotate-[-3deg] rounded-[5px] bg-gradient-to-br from-[#b455e0] to-[#5a2fb8] p-[3px] shadow-[0_0.15rem_0.3rem_rgba(0,0,0,.3)]">
      <span className="block aspect-[16/10] rounded-[3px] bg-[#241038]" />
      <span className="mt-[3px] block h-[2px] bg-white/70" />
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
  return (
    <div>
      <h3 className="font-title text-lg font-semibold">Como você quer deixar o seu PINZ?</h3>
      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {formats.map((f) => (
          <li key={f}>
            <button
              type="button"
              onClick={() => onPick(f)}
              className="flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-[#e1d3ba] bg-white/60 px-3 py-4 text-center transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
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
