/** Título manuscrito do mural. Tamanho controlado pelo font-size do pai (em). */
export function BoardTitle({ owner, tagline, tone = "light" }: { owner: string; tagline: string; tone?: "light" | "dark" }) {
  const ink = tone === "dark" ? "text-[#fbf3e2]" : "text-[#2a2118]";
  return (
    <header className={ink}>
      <h1 className="font-hand leading-[0.85]">
        <span className="block text-[1.9em] font-medium">Mural do</span>
        <span className="flex items-center gap-[0.15em]">
          <span className="text-[3.6em] font-bold">{owner}</span>
          <svg viewBox="0 0 48 48" className="mt-[0.2em] size-[1.5em] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="24" cy="24" r="19" />
            <path d="M17 19v2M31 19v2" strokeWidth="2.6" />
            <path d="M15 28q9 9 18 0" />
          </svg>
        </span>
      </h1>
      <p className={`mt-[0.6em] text-[0.95em] ${tone === "dark" ? "text-[#f1e6d0]/85" : "text-[#4a3826]"}`}>
        {tagline} <span aria-hidden>💙</span>
      </p>
    </header>
  );
}
