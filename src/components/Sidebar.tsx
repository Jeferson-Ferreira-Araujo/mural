import { Brand } from "./Brand";
import { GuestLinks, type AccountApi } from "./account/AccountActions";
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
export function Sidebar({ compact = false, siteStats, panel, notice, panelTitle, guestNext, account }: Pick<ViewProps, "siteStats" | "panel" | "notice" | "panelTitle" | "guestNext"> & { account?: AccountApi; /** há um mural escolhido: botões pequenos, o foco é a pergunta */ compact?: boolean }) {
  return (
    <aside
      className="paper-grain relative z-20 flex h-full w-[clamp(290px,23vw,360px)] shrink-0 flex-col overflow-x-hidden overflow-y-auto bg-[#f2e8d3] px-[1.6em] py-[1.8em] text-[clamp(14px,1.05vw,16px)] shadow-[0.4em_0_2em_rgba(30,12,0,.35)]"
      style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.35), transparent 40%)" }}
    >
      <h1 className="sr-only">Pinz</h1>
      {account?.onHome && !account.atHome && (
        <button
          type="button"
          onClick={account.onHome}
          className="mb-[0.8em] inline-flex cursor-pointer items-center gap-[0.5em] self-start rounded-full border border-[#d9c9ad] bg-white/60 px-[1em] py-[0.55em] text-[0.9em] font-semibold text-[#2a1c12] transition hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
        >
          <svg viewBox="0 0 24 24" className="size-[1.2em]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Voltar para meu Mural
        </button>
      )}
      {/* my-auto: o grupo fica no meio da faixa (e rola normalmente se não couber) */}
      <div className="my-auto flex flex-col gap-[1.4em]">
      <div className="flex justify-center">
        <Brand className="h-[6.4rem]" />
      </div>
      {!compact && <p className="intro-form -mt-[0.6em] text-center font-[family-name:var(--font-fredoka)] text-[1.15em] leading-tight font-semibold tracking-wide text-[#4a3826]">Seu mural de momentos compartilhados.</p>}

      {guestNext && <GuestLinks next={guestNext} className="justify-center" />}

      {/* divisor só quando a tela pede um título (ex.: a demonstração); na inicial o campo "Procurar usuário" já se explica */}
      {panelTitle && (
        <div className="flex items-center gap-[0.8em] text-[0.8em] text-[#8a7b69]" aria-hidden>
          <span className="h-px flex-1 bg-[#d9c9ad]" />
          {panelTitle}
          <span className="h-px flex-1 bg-[#d9c9ad]" />
        </div>
      )}

      {panel("light")}

      {notice?.("light")}

      </div>

      {siteStats && (
        <ul className="mt-[1.4em] grid grid-cols-2 gap-[0.4em] border-t border-[#d9c9ad] pt-[1.1em] text-[#2f2218]" aria-label="Pinz em números">
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
            label="PINZ colocados"
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <path d="M5 4h14v12l-4 4H5V4Z" />
                <path d="M15 20v-4h4M8.5 9h7M8.5 12.5h4" />
              </svg>
            }
          />
        </ul>
      )}

    </aside>
  );
}
