import { useSession } from "@/lib/auth";
import { Brand } from "./Brand";
import { CreateMuralLink } from "./CreateMuralLink";
import { MyMuralLink } from "./MyMuralLink";
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
export function Sidebar({ compact = false, siteStats, capacity, panel, plan, used, showMeter, notice, panelTitle }: Pick<ViewProps, "siteStats" | "capacity" | "panel" | "plan" | "showMeter" | "notice" | "panelTitle"> & { used: number; /** há um mural escolhido: botões pequenos, o foco é a pergunta */ compact?: boolean }) {
  const { session } = useSession();
  const logged = !!session;
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
      {!compact && <p className="intro-form -mt-[0.6em] text-center font-title text-[1.05em] leading-snug text-[#4a3826]">Seu mural de momentos compartilhados.</p>}

      {!logged ? null : compact ? (
        <div className="grid grid-cols-2 gap-[0.5em]">
          <CreateMuralLink label="Criar mural" className="w-full justify-center rounded-[0.8em] border border-[#d9c9ad] bg-white/60 px-[0.6em] py-[0.6em] !text-[0.85em] font-semibold text-[#2f2218] hover:bg-white" />
          <MyMuralLink tone="light" short className="w-full !py-[0.6em] !text-[0.85em]" />
        </div>
      ) : (
        <div className="flex flex-col gap-[0.6em]">
          <CreateMuralLink big className="w-full" />
          <MyMuralLink tone="light" className="w-full" />
        </div>
      )}

      {/* divisor só quando a tela pede um título (ex.: a demonstração); na inicial o campo "Procurar mural" já se explica */}
      {panelTitle && (
        <div className="flex items-center gap-[0.8em] text-[0.8em] text-[#8a7b69]" aria-hidden>
          <span className="h-px flex-1 bg-[#d9c9ad]" />
          {panelTitle}
          <span className="h-px flex-1 bg-[#d9c9ad]" />
        </div>
      )}

      {panel("light")}

      {showMeter && <SlotMeter plan={plan} used={used} capacity={capacity} />}
      {notice?.("light")}

      </div>

      {siteStats && (
        <ul className="mt-[1.4em] grid grid-cols-4 gap-[0.4em] border-t border-[#d9c9ad] pt-[1.1em] text-[#2f2218]" aria-label="Pinz em números">
          <Stat
            value={siteStats.murals}
            label="murais"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M12 8.5v.01M8 8.5v.01M16 8.5v.01M7 14h10" />
              </svg>
            }
          />
          <Stat
            value={siteStats.cards}
            label="mensagens enviadas"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <path d="M5 4h14v12l-4 4H5V4Z" />
                <path d="M15 20v-4h4M8.5 9h7M8.5 12.5h4" />
              </svg>
            }
          />
          <Stat
            value={siteStats.people}
            label="pessoas"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" />
              </svg>
            }
          />
          <Stat
            value={siteStats.unlocks}
            label="desbloqueios"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
        </ul>
      )}

    </aside>
  );
}
