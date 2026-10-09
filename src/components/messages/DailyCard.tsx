import type { DailyCategory } from "@/lib/types";
import { LeafIcon, ScenicCard, SunIcon } from "./ScenicCard";

const TITLE: Record<"versiculo" | "frase", string> = { versiculo: "Versículo do dia", frase: "Frase do dia" };

/** Pins "Versículo do dia" e "Frase motivacional": o texto de hoje vem do servidor e muda sozinho a cada dia. */
export function DailyCard({ category, text, reference, frame }: { category: DailyCategory; kind?: string; text?: string; reference?: string | null; frame?: string | null }) {
  const bible = category === "versiculo";
  const body = text ?? "O texto de hoje aparece aqui.";
  // textos longos (versículos) pedem letra menor para caber no cartão
  const size = body.length <= 60 ? 1.2 : body.length <= 110 ? 0.98 : body.length <= 160 ? 0.82 : 0.7;
  return (
    <ScenicCard scene={bible ? "meadow" : "mountains"} frame={frame} left={<LeafIcon />} right={<SunIcon />} label={TITLE[bible ? "versiculo" : "frase"]}>
      <p className="leading-[1.18] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--font-patrick), cursive", fontSize: `${size}em` }}>
        {body}
      </p>
      {reference && (
        <p className="mt-[0.5em] text-[0.7em] leading-tight font-semibold opacity-90" style={{ fontFamily: "var(--font-patrick), cursive" }}>
          {reference}
        </p>
      )}
    </ScenicCard>
  );
}

