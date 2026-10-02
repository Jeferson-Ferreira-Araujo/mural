import { Pin, Tape } from "./fasteners";

/** Folha de caderno pautada, com margem vermelha e furos. */
export function PaperNote({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <article
      aria-label="Texto"
      className={`paper-grain shadow-paper relative w-[15em] ${compact ? "min-h-[10em]" : "min-h-[17em]"} bg-[#fbf7ea] pt-[1.9em] pr-[1em] pb-[1.2em] pl-[3em]`}
      style={{
        borderRadius: "0.15em 0.15em 0.3em 0.15em",
        backgroundImage:
          "linear-gradient(90deg, transparent 2.35em, rgba(205,70,70,.55) 2.35em, rgba(205,70,70,.55) calc(2.35em + 1px), transparent calc(2.35em + 1px)), repeating-linear-gradient(180deg, transparent 0, transparent 1.55em, rgba(90,140,200,.38) 1.55em, rgba(90,140,200,.38) calc(1.55em + 1px))",
        backgroundPosition: "0 0, 0 1.1em",
      }}
    >
      {/* furos do caderno */}
      <span aria-hidden className="absolute top-[18%] left-[0.8em] size-[0.85em] rounded-full bg-[#3b2616]/55 shadow-[inset_0_0.1em_0.15em_rgba(0,0,0,.5)]" />
      <span aria-hidden className="absolute top-[48%] left-[0.8em] size-[0.85em] rounded-full bg-[#3b2616]/55 shadow-[inset_0_0.1em_0.15em_rgba(0,0,0,.5)]" />
      <span aria-hidden className="absolute top-[78%] left-[0.8em] size-[0.85em] rounded-full bg-[#3b2616]/55 shadow-[inset_0_0.1em_0.15em_rgba(0,0,0,.5)]" />

      {compact ? (
        <Pin color="#2f6fb5" className="top-[0.45em] left-1/2 -translate-x-1/2" />
      ) : (
        <Tape className="-top-[0.8em] left-1/2 -translate-x-1/2" rotate={-2} />
      )}

      <p className="font-hand-alt text-[1.02em] leading-[1.55em] whitespace-pre-line text-[#2a2f4a]">{text}</p>
      <span className="font-hand-alt mt-[0.6em] block text-right text-[0.85em] text-[#2a2f4a]/55">— anônimo</span>
    </article>
  );
}
