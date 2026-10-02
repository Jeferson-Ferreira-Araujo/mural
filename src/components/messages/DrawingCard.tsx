import { Pin } from "./fasteners";

function Stick({ x, h = 1, arms = "up" }: { x: number; h?: number; arms?: "up" | "down" }) {
  return (
    <g transform={`translate(${x} 0) scale(${h})`} fill="none" stroke="#2a2a33" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="38" r="9" />
      <path d="M-3 36v1M3 36v1" strokeWidth="2.6" />
      <path d="M-3 42q3 3 6 0" strokeWidth="1.6" />
      <path d="M0 47v28M0 55l-14 -12" />
      <path d={arms === "up" ? "M0 55l14 -12" : "M0 55l14 10"} />
      <path d="M0 75l-9 22M0 75l9 22" />
    </g>
  );
}

/** Desenho: papel amassado com bonequinhos de palito feitos à caneta. */
export function DrawingCard({ caption }: { caption: string }) {
  return (
    <article
      aria-label="Desenho"
      className="paper-grain shadow-paper relative w-[14em] bg-[#f6f0e0] px-[1em] pt-[1.9em] pb-[1em]"
      style={{
        borderRadius: "0.3em 0.2em 0.35em 0.2em",
        backgroundImage:
          "linear-gradient(115deg, rgba(0,0,0,.05) 0%, transparent 18%, rgba(255,255,255,.35) 40%, transparent 55%, rgba(0,0,0,.05) 80%, transparent)",
      }}
    >
      <Pin color="#e0160e" className="top-[0.5em] right-[1.2em]" />
      <p className="font-hand absolute top-[0.9em] left-[1.1em] text-[1.45em] leading-[1] text-[#2a2a33] [transform:rotate(-8deg)]">
        {caption}
      </p>
      <svg viewBox="0 0 140 110" className="mt-[2.4em] block w-full" aria-hidden>
        <Stick x={28} h={0.95} />
        <Stick x={70} h={1.05} arms="down" />
        <Stick x={112} h={0.95} />
        <path d="M42 66q14 -6 14 0M84 66q14 -6 14 0" fill="none" stroke="#2a2a33" strokeWidth="2" strokeLinecap="round" />
        <path d="M120 22c-3-6-12-3-8 3 3 4 8 6 8 6s5-2 8-6c4-6-5-9-8-3Z" fill="none" stroke="#e0160e" strokeWidth="1.8" strokeLinejoin="round" transform="translate(-4 0)" />
      </svg>
    </article>
  );
}
