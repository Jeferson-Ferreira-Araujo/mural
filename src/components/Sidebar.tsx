import { Brand } from "./Brand";
import { FitSidebar } from "./FitSidebar";
import { GuestLinks, type AccountApi } from "./account/AccountActions";
import { LanguagePicker } from "./LanguagePicker";
import type { ViewProps } from "./viewProps";
import { useTranslations } from "next-intl";

const icon = "size-8";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Stat({ icon: Icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <li className="flex items-center justify-center gap-[0.7em]">
      <span className="shrink-0 text-[#4a3826]">{Icon}</span>
      <span className="min-w-0 text-center">
        <span className="font-title block text-[1.5rem] leading-none font-semibold">{value}</span>
        <span className="mt-[0.2em] block text-[0.8rem] leading-tight text-[#6b5440]">{label}</span>
      </span>
    </li>
  );
}

/** Coluna esquerda do desktop: logo, criar mural em destaque, busca/pergunta e números do mural. */
export function Sidebar({ compact = false, siteStats, panel, notice, panelTitle, guestNext, account, menu, collapsed = false }: Pick<ViewProps, "siteStats" | "panel" | "notice" | "panelTitle" | "guestNext"> & { account?: AccountApi; /** atalhos da conta (desktop) */ menu?: React.ReactNode; /** há um mural escolhido: botões pequenos, o foco é a pergunta */ compact?: boolean; /** desktop: coluna recolhida (escondida), o mural fica centralizado */ collapsed?: boolean }) {
  const tx = useTranslations("components.Sidebar");
  return (
    <aside
      data-collapsed={collapsed} data-account={!!account} className="paper-grain data-[account=true]:text-[clamp(14px,calc(0.4vw+7.5px),17px)] data-[account=true]:[scrollbar-color:#cdbb97_transparent] data-[account=true]:[scrollbar-width:thin] landscape:transition-[margin-left,visibility] landscape:duration-[450ms,0s] landscape:ease-[cubic-bezier(.22,.7,.2,1)] landscape:[transition-delay:0s,0s] landscape:data-[collapsed=true]:-ml-[clamp(330px,17vw,420px)] landscape:data-[collapsed=true]:invisible landscape:data-[collapsed=true]:[transition-delay:0s,450ms] relative z-20 flex h-full w-[clamp(330px,17vw,420px)] min-w-[330px] flex-none flex-col overflow-x-hidden overflow-y-auto data-[account=false]:[scrollbar-width:none] data-[account=false]:[&::-webkit-scrollbar]:hidden portrait:h-auto portrait:max-h-[48dvh] portrait:w-full portrait:min-w-0 portrait:max-w-none portrait:flex-none bg-[#f2e8d3] px-[1.6em] py-[1.1em] text-[clamp(14px,min(calc(0.5vw+7.5px),2.2dvh),22px)] shadow-[0.4em_0_2em_rgba(30,12,0,.35)] portrait:text-[clamp(15px,1.6vw,22px)] portrait:shadow-[0_0.4em_2em_rgba(30,12,0,.35)] [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[32em]"
      style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.35), transparent 40%)" }}
    >
      <h1 className="sr-only">{tx("pinz")}</h1>
      {/* em qualquer monitor, a letra da coluna diminui até o conteúdo caber na altura, sem barra de rolagem */}
      <FitSidebar />
      {/* vendo o mural de outra pessoa: seta para voltar ao seu mural (sem fundo), antes do logo */}
      {account?.onHome && !account.atHome && (
        <div className="mb-[0.8em] flex items-center">
          <button
            type="button"
            onClick={account.onHome}
            className="inline-flex cursor-pointer items-center gap-[0.5em] rounded-xl px-[0.4em] py-[0.55em] text-[0.9em] font-semibold text-[#2a1c12] transition hover:bg-black/5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
          >
            <svg viewBox="0 0 24 24" className="size-[1.2em]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            {tx("x_voltarParaMeuMural")}</button>
        </div>
      )}
      {/* my-auto: o grupo fica no meio da faixa (e rola normalmente se não couber) */}
      <div className={`flex flex-col gap-[0.9em] ${menu || account ? "" : "my-auto"}`}>
      <div className="flex justify-center">
        <Brand className="h-[calc(clamp(5.5rem,16dvh,13rem)*var(--logo-k,1))]" />
      </div>
      {!compact && <p className="text-center text-[14px] leading-snug text-[#6b5440]">{tx("compartilheMomentosEspeciaisRecebaRecados")}</p>}

      {guestNext && <GuestLinks next={guestNext} className="justify-center" />}
      {!account && <LanguagePicker variant="icon" className="!absolute top-[0.8em] right-[0.8em] z-30 !mx-0 !w-auto !max-w-none" />}

      {/* divisor só quando a tela pede um título (ex.: a demonstração); na inicial o campo "Procurar usuário" já se explica */}
      {panelTitle && (
        <div className="flex items-center gap-[0.8em] text-[0.8em] text-[#8a7b69]" aria-hidden>
          <span className="h-px flex-1 bg-[#d9c9ad]" />
          {panelTitle}
          <span className="h-px flex-1 bg-[#d9c9ad]" />
        </div>
      )}

      {panel("light", "profile")}

      {notice?.("light")}

      </div>

      {/* atalhos da conta: ocupam o espaço entre o cartão do mural e os números */}
      {menu && <div className="mt-[1.4em] flex-1">{menu}</div>}

      {/* os números do site aparecem só na tela inicial de login (sem conta e sem mural aberto) */}
      {siteStats && !compact && !account && (
        <ul className="mt-[0.9em] grid grid-cols-2 gap-[0.4em] border-t border-[#d9c9ad] pt-[0.7em] text-[#2f2218]" aria-label={tx("pinzEmNumeros")}>
          <Stat
            value={siteStats.murals}
            label={tx("murais")}
            icon={
              <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M12 8.5v.01M8 8.5v.01M16 8.5v.01M7 14h10" />
              </svg>
            }
          />
          <Stat
            value={siteStats.cards}
            label={tx("pinzColocados")}
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
