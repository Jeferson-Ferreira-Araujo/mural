import type { ReactNode } from "react";
import { fitSize } from "@/lib/fitText";
import { Tape } from "./fasteners";

/** Papelzinho com uma mensagem CURTA (até 3 linhas), colado com fita embaixo de um objeto (player de vídeo / de música). A letra diminui se o texto for longo; o que ainda não couber termina em "…". */
export function CaptionNote({ children }: { children: ReactNode }) {
  const text = typeof children === "string" ? children : "";
  const size = text ? fitSize(text, { w: 8.6, h: 3.3, lh: 1.1, max: 1.12, min: 0.8 }) : 1.12;
  return (
    <div className="relative z-10 mx-auto mt-[0.4em] w-[10.2em] rotate-[-1deg]" style={{ filter: "drop-shadow(0.1em 0.3em 0.28em rgba(40,20,5,.4))" }}>
      <Tape className="-top-[0.8em] left-1/2 h-[1.5em] w-[4.6em] -translate-x-1/2" rotate={0} tone="rgba(238, 224, 168, .85)" />
      <p
        className="paper-grain font-hand relative bg-[#f5f0e2] px-[0.8em] pt-[0.95em] pb-[0.7em] leading-[1.1] text-[#2f2a24]"
        style={{ fontSize: `${size}em`, clipPath: "polygon(0 0, 100% 0, 100% 94%, 94% 100%, 84% 95%, 72% 100%, 60% 95%, 48% 100%, 36% 95%, 24% 100%, 12% 95%, 5% 100%, 0 95%)" }}
      >
        {/* o limite de linhas vai no texto (não no papel com margem): senão a linha seguinte aparece cortada na margem de baixo */}
        <span className="line-clamp-3 block [overflow-wrap:anywhere] hyphens-auto">
          {children}
        </span>
      </p>
    </div>
  );
}
