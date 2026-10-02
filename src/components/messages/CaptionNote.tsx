import type { ReactNode } from "react";
import { Tape } from "./fasteners";

/** Papelzinho com uma mensagem CURTA (até 2 linhas), colado com fita embaixo de um objeto (player de vídeo / de música). */
export function CaptionNote({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 mx-auto mt-[0.4em] w-[10.2em] rotate-[-1deg]" style={{ filter: "drop-shadow(0.1em 0.3em 0.28em rgba(40,20,5,.4))" }}>
      <Tape className="-top-[0.8em] left-1/2 h-[1.5em] w-[4.6em] -translate-x-1/2" rotate={0} tone="rgba(238, 224, 168, .85)" />
      <p
        className="paper-grain font-hand relative line-clamp-2 bg-[#f5f0e2] px-[0.8em] pt-[0.95em] pb-[0.7em] text-[1.12em] leading-[1.1] break-words text-[#2f2a24]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 94%, 94% 100%, 84% 95%, 72% 100%, 60% 95%, 48% 100%, 36% 95%, 24% 100%, 12% 95%, 5% 100%, 0 95%)" }}
      >
        {children}
      </p>
    </div>
  );
}
