import { Tape } from "./fasteners";

/** Lista: papel creme com checklist escrito à mão. */
export function ListCard({ title, items }: { title: string; items: { text: string; done: boolean }[] }) {
  return (
    <article
      aria-label="Lista"
      className="paper-grain shadow-paper relative w-[14em] bg-[#f7f1e1] px-[1.1em] pt-[1.8em] pb-[1.2em]"
      style={{
        borderRadius: "0.2em",
        clipPath: "polygon(0 0, 100% 0, 100% 96%, 94% 100%, 86% 97%, 76% 100%, 64% 97.5%, 52% 100%, 40% 97%, 28% 100%, 16% 97.5%, 6% 100%, 0 97%)",
      }}
    >
      <Tape className="top-[-0.5em] right-[1.5em]" rotate={6} />
      <div className="flex items-start justify-between">
        <h3 className="font-hand text-[1.9em] leading-none font-semibold text-[#2a2a33] underline decoration-[#2a2a33]/40 decoration-1 underline-offset-[0.12em]">
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
      <ul className="font-hand-alt mt-[0.5em] space-y-[0.28em] text-[0.88em] leading-tight text-[#2a2a33]">
        {items.map((it) => (
          <li key={it.text} className="flex items-start gap-[0.55em]">
            <span className="mt-[0.1em] grid size-[1.05em] shrink-0 place-items-center rounded-[0.15em] border border-[#2a2a33]/70">
              {it.done && (
                <svg viewBox="0 0 12 12" className="size-[85%]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m2 6.3 2.6 2.6L10 3" />
                </svg>
              )}
            </span>
            {it.text}
          </li>
        ))}
      </ul>
    </article>
  );
}
