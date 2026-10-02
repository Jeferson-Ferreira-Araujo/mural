/** Separa "Mural do Jeferson" em linha pequena ("Mural do") + nome grande ("Jeferson"). */
function splitTitle(title: string): { lead: string | null; name: string } {
  const m = title.trim().match(/^(mural\s+d[oae]s?)\s+(.+)$/i);
  return m ? { lead: m[1], name: m[2] } : { lead: null, name: title.trim() };
}

/** Título manuscrito do mural. Tamanho controlado pelo font-size do pai (em). */
export function BoardTitle({ title, tagline, tone = "light" }: { title: string; tagline: string; tone?: "light" | "dark" }) {
  const ink = tone === "dark" ? "text-[#fbf3e2]" : "text-[#2a2118]";
  const { lead, name } = splitTitle(title);
  // nomes longos usam letra menor para caber
  const size = name.length > 22 ? "text-[2em]" : name.length > 12 ? "text-[2.8em]" : "text-[3.6em]";
  return (
    <header className={ink}>
      <h1 className="font-hand leading-[0.85] break-words">
        {lead && <span className="block text-[1.9em] font-medium">{lead}</span>}
        <span className="flex items-center gap-[0.15em]">
          <span className={`${size} min-w-0 font-bold`}>{name}</span>
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
