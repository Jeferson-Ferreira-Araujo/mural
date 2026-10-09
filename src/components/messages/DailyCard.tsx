import type { DailyCategory } from "@/lib/types";
import { handOf, tapeOf, type HandId, type TapeColor } from "@/lib/style";
import { TapeSlot } from "./fasteners";

const TITLE: Record<Exclude<DailyCategory, "mix">, string> = { mensagem: "Mensagem do dia", frase: "Frase do dia", versiculo: "Versículo do dia" };
const ACCENT: Record<Exclude<DailyCategory, "mix">, string> = { mensagem: "#c9803a", frase: "#4f7f5c", versiculo: "#4a6a9c" };

/** Cartão do pin "Mensagem do dia": o texto de hoje vem do servidor e muda sozinho a cada dia. */
export function DailyCard({ category, kind, text, reference, font, tape }: { category: DailyCategory; kind?: Exclude<DailyCategory, "mix">; text?: string; reference?: string | null; font?: HandId; tape?: TapeColor }) {
  const k = kind ?? (category === "mix" ? "mensagem" : category);
  const hand = handOf(font ?? "caveat");
  const tone = tape ? tapeOf(tape).tone : undefined;
  return (
    <div className="relative w-[14em]">
      <article aria-label={TITLE[k]} className="paper-grain shadow-paper relative w-full min-h-[11em] bg-[#fbf6e6] px-[1.2em] pt-[1.8em] pb-[1.1em]" style={{ borderRadius: "0.15em" }}>
        <p className="text-[0.62em] leading-none font-bold tracking-[0.16em] uppercase" style={{ color: ACCENT[k] }}>
          {TITLE[k]}
        </p>
        <p className="mt-[0.7em] leading-[1.2] text-[#2f2218] [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${1.45 * hand.scale}em` }}>
          {text ?? "O texto de hoje aparece aqui."}
        </p>
        {reference && <p className="mt-[0.8em] text-[0.7em] leading-tight font-semibold text-[#6b5440]">{reference}</p>}
      </article>
      <TapeSlot top="top-[-0.5em]" at="center" tone={tone} />
    </div>
  );
}
