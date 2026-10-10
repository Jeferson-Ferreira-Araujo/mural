import { Brand } from "./Brand";
import { GuestLinks, type AccountApi } from "./account/AccountActions";
import type { ViewProps } from "./viewProps";

const icon = "size-[2.1em]";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Stat({ icon: Icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <li className="flex items-center justify-center gap-[0.7em]">
      <span className="shrink-0 text-[#4a3826]">{Icon}</span>
      <span className="min-w-0 text-center">
        <span className="font-title block text-[1.6em] leading-none font-semibold">{value}</span>
        <span className="mt-[0.2em] block text-[0.78em] leading-tight text-[#6b5440]">{label}</span>
      </span>
    </li>
  );
}

/** Coluna esquerda do desktop: logo, criar mural em destaque, busca/pergunta e números do mural. */
export function Sidebar({ compact = false, siteStats, panel, notice, panelTitle, guestNext, account, menu }: Pick<ViewProps, "siteStats" | "panel" | "notice" | "panelTitle" | "guestNext"> & { account?: AccountApi; /** atalhos da conta (desktop) */ menu?: React.ReactNode; /** há um mural escolhido: botões pequenos, o foco é a pergunta */ compact?: boolean }) {
  return (
    <aside
      className="paper-grain relative z-20 flex h-full min-w-[clamp(290px,23vw,360px)] max-w-[30em] flex-[1000_0_0] flex-col overflow-x-hidden overflow-y-auto portrait:h-auto portrait:max-h-[48dvh] portrait:w-full portrait:min-w-0 portrait:max-w-none portrait:flex-none bg-[#f2e8d3] px-[1.6em] py-[1.8em] text-[clamp(14px,min(calc(0.5vw+7.5px),2.2dvh),22px)] shadow-[0.4em_0_2em_rgba(30,12,0,.35)] portrait:text-[clamp(15px,1.6vw,22px)] portrait:shadow-[0_0.4em_2em_rgba(30,12,0,.35)] [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[26em]"
      style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.35), transparent 40%)" }}
    >
      <h1 className="sr-only">Pinz</h1>
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
            Voltar para meu Mural
          </button>
        </div>
      )}
      {/* my-auto: o grupo fica no meio da faixa (e rola normalmente se não couber) */}
      <div className={`flex flex-col gap-[1.4em] ${menu || account ? "" : "my-auto"}`}>
      <div className="flex justify-center">
        <Brand className="h-[clamp(6.4rem,17dvh,13rem)]" />
      </div>
      {!compact && <p className="intro-form -mt-[0.6em] text-center font-[family-name:var(--font-jakarta)] text-[1.15em] leading-tight font-semibold tracking-wide text-[#4a3826]">Seu mural de momentos compartilhados.</p>}

      {/* vendo o mural de outra pessoa: pesquisa e notificações ficam abaixo do logo (o logo é sempre o primeiro item, só a seta de voltar vem antes) */}
      {account?.onHome && !account.atHome && (
        <div className="flex items-center gap-[0.5em]">
          <button
            type="button"
            onClick={account.onSearch}
            aria-label="Pesquisar Usuário"
            className="inline-flex flex-1 cursor-pointer justify-center items-center gap-[0.45em] rounded-xl border border-[#d9c9ad] bg-white/60 px-[0.8em] py-[0.55em] text-[0.9em] font-semibold text-[#2a1c12] transition hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
          >
            <svg viewBox="0 0 24 24" className="size-[1.2em]" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </svg>
            Pesquisar
          </button>
          {/* notificações chegam em tempo real: o sino fica sempre à vista */}
          {account.notifications && (
            <button
              type="button"
              onClick={account.notifications.onOpen}
              aria-label={account.notifications.count ? `Notificações (${account.notifications.count} novas)` : "Notificações"}
              title="Notificações"
              className="relative grid size-[2.5em] cursor-pointer place-items-center rounded-xl border border-[#d9c9ad] bg-white/60 text-[#2a1c12] transition hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
            >
              <svg viewBox="0 0 24 24" className="size-[1.3em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
                <path d="M10 20a2.2 2.2 0 0 0 4 0" />
              </svg>
              {!!account.notifications.count && (
                <span aria-hidden className="absolute -top-[0.3em] -right-[0.3em] grid min-w-[1.4em] place-items-center rounded-md bg-[#d98a2b] px-[0.3em] text-[0.7em] leading-[1.7] font-bold text-white">
                  {account.notifications.count}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {guestNext && <GuestLinks next={guestNext} className="justify-center" />}

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
