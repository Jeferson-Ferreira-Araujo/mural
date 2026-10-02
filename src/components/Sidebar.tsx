import { Brand } from "./Brand";
import { CreateMuralLink } from "./CreateMuralLink";
import { SlotMeter } from "./board/SlotMeter";
import type { ViewProps } from "./viewProps";

const icon = "size-[1.5em]";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Stat({ icon: Icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <li className="flex flex-col items-center gap-[0.15em] text-center">
      {Icon}
      <span className="text-[1.05em] leading-none font-semibold">{value}</span>
      <span className="text-[0.72em] leading-tight text-[#6b5440]">{label}</span>
    </li>
  );
}

/** Coluna esquerda do desktop: logo, criar mural em destaque, busca/pergunta e números do mural. */
export function Sidebar({ stats, panel, plan, used, showMeter, notice, panelTitle = "ou encontre um mural" }: Pick<ViewProps, "stats" | "panel" | "plan" | "showMeter" | "notice" | "panelTitle"> & { used: number }) {
  return (
    <aside
      className="paper-grain relative z-20 flex h-full w-[clamp(290px,23vw,360px)] shrink-0 flex-col overflow-x-hidden overflow-y-auto bg-[#f2e8d3] px-[1.6em] py-[1.8em] text-[clamp(14px,1.05vw,16px)] shadow-[0.4em_0_2em_rgba(30,12,0,.35)]"
      style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.35), transparent 40%)" }}
    >
      <h1 className="sr-only">Pinz</h1>
      {/* my-auto: o grupo fica no meio da faixa (e rola normalmente se não couber) */}
      <div className="my-auto flex flex-col gap-[1.4em]">
      <div className="flex justify-center">
        <Brand className="h-[6.4rem]" />
      </div>

      <CreateMuralLink big className="w-full" />

      <div className="flex items-center gap-[0.8em] text-[0.8em] text-[#8a7b69]" aria-hidden>
        <span className="h-px flex-1 bg-[#d9c9ad]" />
        {panelTitle}
        <span className="h-px flex-1 bg-[#d9c9ad]" />
      </div>

      {panel("light")}

      {showMeter && <SlotMeter plan={plan} used={used} />}
      {notice?.("light")}

      {stats && (
        <ul className="grid grid-cols-4 gap-[0.4em] border-t border-[#d9c9ad] pt-[1.1em] text-[#2f2218]" aria-label="Números do mural">
          <Stat
            value={stats.visited}
            label="visitaram"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
          <Stat
            value={stats.tried}
            label="tentaram entrar"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <rect x="5" y="10" width="14" height="10" rx="1.5" />
                <path d="M8 10V8a4 4 0 0 1 8 0v2" />
              </svg>
            }
          />
          <Stat
            value={stats.correct}
            label="acertaram"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="m8.5 12 2.5 2.5 4.5-5" />
              </svg>
            }
          />
          <Stat
            value={stats.messages}
            label="mensagens"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <path d="M4 5h16v11H9l-5 4V5Z" />
                <path d="M9 10h6" />
              </svg>
            }
          />
        </ul>
      )}
      </div>
    </aside>
  );
}
