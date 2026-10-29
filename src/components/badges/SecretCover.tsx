"use client";

import { NATURAL_W, shapeOfStyle } from "@/lib/displayShape";
import { SecretBadge } from "../messages/HiddenPin";
import { useTranslations } from "next-intl";

/** Display em segredo: o mesmo visual do pin em segredo (cartão borrado com o cadeado e "Segredo"); nenhum dado do display aparece. Tamanho em em, como o widget. */
export function SecretCover({ style, locked = false }: { style?: string; /** quem vê não tem permissão (visitante): tocar no selo avisa */ locked?: boolean }) {
  const tx = useTranslations("components.badges.SecretCover");
  const shape = shapeOfStyle(style);
  return (
    <div aria-label={tx("displayEmSegredo")} role="img" className="relative select-none" style={{ width: `${NATURAL_W[shape]}em`, height: `${shape === "tall" ? 18 : 12}em` }}>
      <div inert aria-hidden className="pointer-events-none size-full rounded-[1.2em] bg-[#e8dcc0]" style={{ filter: "blur(0.38em) saturate(0.9)" }} />
      <SecretBadge locked={locked} what="display" scale="1.6em" />
    </div>
  );
}
