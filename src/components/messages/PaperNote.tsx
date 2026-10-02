import { Tape } from "./fasteners";

/**
 * Texto em folha. `letter`: papel liso rasgado com tinta azul.
 * `notebook`: folha de caderno pautada, com margem e furos.
 */
export function PaperNote({ text, variant }: { text: string; variant: "letter" | "notebook" }) {
  if (variant === "letter") {
    return (
      <article
        aria-label="Texto"
        className="paper-grain shadow-paper relative w-[14em] min-h-[13.5em] bg-[#f5f0e2] px-[1.3em] pt-[1.9em] pb-[1.3em]"
        style={{
          clipPath:
            "polygon(0 3%, 6% 0, 13% 2.5%, 21% 0.5%, 30% 3%, 39% 0, 48% 2%, 57% 0.5%, 66% 3%, 75% 0.5%, 84% 2.5%, 92% 0, 100% 2%, 100% 100%, 0 100%)",
          backgroundImage: "linear-gradient(120deg, rgba(0,0,0,.05), transparent 30%, rgba(255,255,255,.4) 60%, rgba(0,0,0,.04))",
        }}
      >
        <Tape className="top-[-0.5em] left-1/2 -translate-x-1/2" rotate={-3} />
        <p className="font-hand text-[1.55em] leading-[1.18] text-[#243a7a] [overflow-wrap:anywhere]">{text}</p>
      </article>
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
        backgroundPosition: "0 0, 0 calc(1.73em + 1px)",
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
      <Tape className="-top-[0.8em] right-[1.2em]" rotate={5} />
      <p className="font-hand text-[1.6em] leading-[0.96875] text-[#232838] [overflow-wrap:anywhere]">{text}</p>
      <span aria-hidden className="font-hand absolute right-[0.8em] bottom-[0.4em] text-[1.6em] text-[#232838]/70">☆</span>
    </article>
  );
}
