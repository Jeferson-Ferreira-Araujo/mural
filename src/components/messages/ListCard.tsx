import { handOf, tapeOf, type HandId, type TapeColor } from "@/lib/style";
import { Tape } from "./fasteners";

/** Lista: papel creme com checklist escrito à mão. */
export function ListCard({ title, items, font, tape, onEdit, onToggle }: { title: string; items: { text: string; done: boolean }[]; font?: HandId; tape?: TapeColor; onEdit?: () => void; /** marcar/desmarcar um item (só quem pode editar a lista) */ onToggle?: (index: number) => void }) {
  const hand = handOf(font);
  const canToggle = !!onToggle;
  // sem letra escolhida: o visual de sempre (título Caveat, itens Kalam); com letra escolhida, tudo na mesma
  const itemFont = font ? hand.family : "var(--font-kalam), cursive";
  const itemSize = font ? 1.18 * hand.scale : 0.88;
  return (
    <article
      aria-label="Lista"
      className="paper-grain shadow-paper relative w-[14em] bg-[#f7f1e1] px-[1.1em] pt-[1.8em] pb-[1.2em]"
      style={{
        borderRadius: "0.2em",
        clipPath: "polygon(0 -2em, 100% -2em, 100% 96%, 94% 100%, 86% 97%, 76% 100%, 64% 97.5%, 52% 100%, 40% 97%, 28% 100%, 16% 97.5%, 6% 100%, 0 97%)",
      }}
    >
      <Tape className="top-[-0.5em] right-[1.5em]" rotate={6} tone={tape ? tapeOf(tape).tone : undefined} />
      {onEdit && (
        <button
          type="button"
          aria-label="Editar lista"
          title="Editar lista"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute right-[0.5em] bottom-[1.4em] z-20 grid size-[2em] cursor-pointer place-items-center rounded-lg bg-[#2a2a33] text-white shadow-[0_0.15em_0.4em_rgba(0,0,0,.35)] transition hover:bg-[#44444f]"
        >
          <svg viewBox="0 0 24 24" className="size-[1.05em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
          </svg>
        </button>
      )}
      <div className="flex items-start justify-between">
        <h3 className="min-w-0 [overflow-wrap:anywhere] leading-none font-semibold text-[#2a2a33] underline decoration-[#2a2a33]/40 decoration-1 underline-offset-[0.12em]" style={{ fontFamily: hand.family, fontSize: `${1.9 * hand.scale}em` }}>
          {title}
        </h3>
        <svg viewBox="0 0 40 40" className="size-[2.4em] text-[#2a2a33]/80" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <circle cx="20" cy="20" r="6" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return <path key={i} d={`M${20 + Math.cos(a) * 10} ${20 + Math.sin(a) * 10}L${20 + Math.cos(a) * 15} ${20 + Math.sin(a) * 15}`} />;
          })}
        </svg>
      </div>
      <ul className="mt-[0.5em] space-y-[0.28em] leading-tight text-[#2a2a33]" style={{ fontFamily: itemFont, fontSize: `${itemSize}em` }}>
        {items.map((it, i) => (
          <li key={i}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={it.done}
                aria-label={`${it.done ? "Desmarcar" : "Marcar"}: ${it.text}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(i);
                }}
                className="flex w-full cursor-pointer items-start gap-[0.55em] rounded-[0.2em] text-left transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[0.1em] focus-visible:outline-[#2a2a33]/60"
              >
            <span className="mt-[0.1em] grid size-[1.05em] shrink-0 place-items-center rounded-[0.15em] border border-[#2a2a33]/70">
              {it.done && (
                <svg viewBox="0 0 12 12" className="size-[85%]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m2 6.3 2.6 2.6L10 3" />
                </svg>
              )}
            </span>
            <span className={`min-w-0 [overflow-wrap:anywhere] ${it.done && canToggle ? "opacity-60 line-through" : ""}`}>{it.text}</span>
              </button>
            ) : (
              <div className="flex items-start gap-[0.55em]">
            <span className="mt-[0.1em] grid size-[1.05em] shrink-0 place-items-center rounded-[0.15em] border border-[#2a2a33]/70">
              {it.done && (
                <svg viewBox="0 0 12 12" className="size-[85%]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m2 6.3 2.6 2.6L10 3" />
                </svg>
              )}
            </span>
            <span className={`min-w-0 [overflow-wrap:anywhere] ${it.done && canToggle ? "opacity-60 line-through" : ""}`}>{it.text}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
