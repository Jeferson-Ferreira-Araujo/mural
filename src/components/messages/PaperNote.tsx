import { handOf, tapeOf, type HandId, type TapeColor } from "@/lib/style";
import { TapeSlot } from "./fasteners";

/**
 * Texto em folha. `letter`: papel liso rasgado com tinta azul.
 * `notebook`: folha de caderno pautada, com margem e furos.
 */
export function PaperNote({ text, variant, font, tape }: { text: string; variant: "letter" | "notebook"; font?: HandId; tape?: TapeColor }) {
  const hand = handOf(font);
  const tone = tape ? tapeOf(tape).tone : undefined;
  if (variant === "letter") {
    return (
      <div className="relative w-[14em]">
      <article
        aria-label="Texto"
        className="paper-grain shadow-paper relative w-full min-h-[13.5em] bg-[#f5f0e2] px-[1.3em] pt-[1.9em] pb-[1.3em]"
        style={{
          clipPath:
            "polygon(0 3%, 6% 0, 13% 2.5%, 21% 0.5%, 30% 3%, 39% 0, 48% 2%, 57% 0.5%, 66% 3%, 75% 0.5%, 84% 2.5%, 92% 0, 100% 2%, 100% 100%, 0 100%)",
          backgroundImage: "linear-gradient(120deg, rgba(0,0,0,.05), transparent 30%, rgba(255,255,255,.4) 60%, rgba(0,0,0,.04))",
        }}
      >
        <p className="leading-[1.18] text-[#243a7a] [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${1.55 * hand.scale}em` }}>
          {text}
        </p>
      </article>
      {/* fita fora do papel recortado, para não ser cortada junto com a borda rasgada */}
      <TapeSlot top="top-[-0.5em]" at="center" tone={tone} />
      </div>
    );
  }

  return (
    <article
      aria-label="Texto"
      className="paper-grain shadow-paper relative w-[14em] min-h-[13.5em] bg-[#fbf7ea] pt-[1.9em] pr-[1em] pb-[1.4em] pl-[2.9em]"
      style={{
        borderRadius: "0.15em 0.15em 0.3em 0.15em",
        backgroundImage:
          "linear-gradient(90deg, transparent 2.3em, rgba(205,70,70,.5) 2.3em, rgba(205,70,70,.5) calc(2.3em + 1px), transparent calc(2.3em + 1px)), repeating-linear-gradient(180deg, transparent 0, transparent calc(1.55em - 1px), rgba(90,140,200,.36) calc(1.55em - 1px), rgba(90,140,200,.36) 1.55em)",
        backgroundPosition: `0 0, 0 calc(${(1.73 + hand.rule).toFixed(3)}em + 1px)`,
      }}
    >
      {[18, 48, 78].map((top) => (
        <span
          key={top}
          aria-hidden
          className="absolute left-[0.7em] size-[0.8em] rounded-full bg-[#3b2616]/55 shadow-[inset_0_0.1em_0.15em_rgba(0,0,0,.5)]"
          style={{ top: `${top}%` }}
        />
      ))}
      <TapeSlot top="-top-[0.8em]" at="right" tone={tone} />
      {/* a pauta tem 1,55em por linha; a altura de linha do texto é igual, qualquer que seja a letra */}
      <p className="text-[#232838] [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${1.6 * hand.scale}em`, lineHeight: `${1.55 / (1.6 * hand.scale)}` }}>
        {text}
      </p>
      <span aria-hidden className="font-hand absolute right-[0.8em] bottom-[0.4em] text-[1.6em] text-[#232838]/70">☆</span>
    </article>
  );
}
