"use client";

import { NATURAL_W, shapeOfStyle } from "@/lib/displayShape";
import { useInDetail } from "../board/ListEditContext";
import { useTranslations } from "next-intl";

/** Display em segredo: o mesmo visual do pin em segredo (cartão borrado com o cadeado e "Segredo"); nenhum dado do display aparece. Tamanho em em, como o widget. */
export function SecretCover({ style }: { style?: string }) {
  const tx = useTranslations("components.badges.SecretCover");
  const inDetail = useInDetail();
  const shape = shapeOfStyle(style);
  return (
    <div aria-label={tx("displayEmSegredo")} role="img" className="relative select-none" style={{ width: `${NATURAL_W[shape]}em`, height: `${shape === "tall" ? 18 : 12}em` }}>
      <div inert aria-hidden className="pointer-events-none size-full rounded-[1.2em] bg-[#e8dcc0]" style={{ filter: "blur(0.38em) saturate(0.9)" }} />
      <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center" style={{ fontSize: inDetail ? "1em" : "1.6em" }}>
        <span className="flex flex-col items-center gap-[0.45em]">
          <span className="grid size-[2.6em] place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)]">
            <svg viewBox="0 0 24 24" className="size-[1.3em]" fill="currentColor">
              <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
            </svg>
          </span>
          <span className="rounded-lg bg-black/55 px-[0.9em] py-[0.4em] text-center text-[0.85em] leading-tight font-semibold text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.35)]">{tx("segredo")}</span>
        </span>
      </span>
    </div>
  );
}
