"use client";

import { useBackClose } from "@/lib/backStack";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getAccount } from "@/lib/account";
import type { OwnMural } from "@/lib/auth";
import { getPublicMural } from "@/lib/mural";
import { getProfileSummary } from "@/lib/social";
import { getBrowserSupabase } from "@/lib/supabase";
import { getOwnAvatar } from "@/lib/avatar";
import { useInstall } from "@/lib/install";
import { Avatar } from "../Avatar";
import { PlanBadge } from "../board/PlanBadge";
import { EmbedCtx, Modal } from "./Modal";
import { TOUR_EVENT } from "@/lib/onboarding";
import { A11Y_OPEN_EVENT } from "@/lib/a11y";
import { MuralSettings } from "./MuralSettings";
import { MyMuralsModal } from "./MyMuralsModal";
import { FollowingModal, VisitorsModal } from "./PeopleModals";
import { PinsModal } from "./PinsModal";
import { PlansModal } from "./PlansModal";
import { ProfileModal } from "./ProfileModal";
import { RewardsModal } from "./RewardsModal";
import { SharedMurals } from "./SharedMurals";

type ModalId = "pins" | "plans" | "profile" | "edit" | "mymurals" | "numbers" | "shared" | "following" | "visitors" | "install" | "rewards";

/** "Visitantes" no menu da conta: desligado por enquanto (nada é apagado; para religar, troque para true). */
const VISITORS_ENABLED = false;

/** Dentro da coluna bege do desktop os atalhos ficam mais compactos. */
const CompactCtx = createContext(false);

function Row({ icon, label, hint, badge, onClick }: { icon: ReactNode; label: string; hint?: string; /** quantidade pendente: vira um selo vermelho no canto superior direito do cartão (some quando é zero) */ badge?: number; onClick: () => void }) {
  const compact = useContext(CompactCtx);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full cursor-pointer items-center rounded-2xl border border-[#ece1c9] bg-[#fffaf0]/90 text-left shadow-[0_1px_0_rgba(255,255,255,.8)_inset,0_2px_6px_rgba(90,60,20,.08)] transition hover:bg-white active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${compact ? "gap-2.5 px-3 py-2" : "gap-3.5 px-3.5 py-3"}`}
    >
      <span className={`grid shrink-0 place-items-center bg-[#f1e7d2] text-[#4a3826] ${compact ? "size-8 rounded-xl" : "size-12 rounded-2xl"}`} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block leading-tight font-bold ${compact ? "text-[14px]" : "text-[17px]"}`}>{label}</span>
        {hint && <span className={`block leading-snug text-[#6b5440] ${compact ? "truncate text-xs" : "mt-0.5 text-[13px]"}`}>{hint}</span>}
      </span>
      {!!badge && (
        <span aria-label={`${badge} pendente${badge > 1 ? "s" : ""}`} className="absolute -top-2 -right-1.5 grid min-w-6 place-items-center rounded-full bg-[#e0382d] px-1.5 py-0.5 text-xs leading-4 font-extrabold text-white shadow-[0_2px_5px_rgba(120,20,10,.45)] ring-2 ring-[#f7efdc]">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-[#8a7b69]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}

const ic = { viewBox: "0 0 24 24", className: "size-5", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * Menu da conta (abre pelo ícone do cabeçalho): uma lista de atalhos. Cada um abre uma janela própria
 * (pins em carrossel, planos em carrossel, perfil, editar mural, números). Não existe mais uma página de painel.
 */
export function AccountDrawer({
  open,
  onClose,
  nick,
  email,
  murals,
  currentSlug,
  pendingCount,
  credits,
  isAdmin = false,
  editProfileToken = 0,
  startPanel = "profile",
  onChanged,
  onDeleted,
  onSignOut,
  onPending,
  onNotify,
  onNewMural,
  sharedInvites = 0,
  onSharedChanged,
  onExportImage,
  inline = false,
}: {
  open: boolean;
  onClose: () => void;
  nick: string;
  email: string;
  murals: OwnMural[];
  currentSlug?: string;
  /** pins aguardando aprovação */
  pendingCount: number;
  /** créditos da conta */
  credits: number;
  /** conta de administrador: mostra o atalho da página de administração */
  isAdmin?: boolean;
  /** muda a cada pedido de "Editar perfil" (botão do resumo do perfil): abre o painel de perfil da conta */
  editProfileToken?: number;
  /** qual painel o pedido acima abre */
  startPanel?: "profile" | "plans";
  /** o mural foi editado: recarrega os dados da tela */
  onChanged: () => void;
  onDeleted: () => void;
  onSignOut: () => void;
  onPending: (n: number) => void;
  onNotify: (msg: string) => void;
  /** PINZ+ (e abaixo do limite de murais): abre a criação de um mural novo */
  onNewMural?: () => void;
  /** convites de mural compartilhado esperando resposta */
  sharedInvites?: number;
  /** a lista de murais compartilhados mudou (aceitou, criou, apagou) */
  onSharedChanged?: () => void;
  /** gera a imagem do mural aberto (só aparece quando dá para gerar) */
  onExportImage?: () => void;
  /** desktop: em vez de uma gaveta, desenha os atalhos direto na coluna bege (sempre aberto) */
  inline?: boolean;
  /** sino: quantas notificações novas e como abrir a lista */
  notifications?: { count: number; onOpen: () => void };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const mural = murals.find((m) => m.slug === currentSlug) ?? murals[0];
  const account = { ...getAccount(), plan: mural?.plan ?? getAccount().plan }; // o plano vale por mural (definido no banco)
  const [modal, setModal] = useState<ModalId | null>(null);
  const [closing, setClosing] = useState(false); // durante a animação de saída o conteúdo continua na gaveta
  const [slot, setSlot] = useState<HTMLElement | null>(null); // onde o painel aberto aparece (parte de baixo da gaveta)
  const isOpen = inline || open;
  useBackClose(open && !inline, onClose); // voltar (Android) fecha o menu
  // métricas da conta: visitas, pins nos seus murais e pins que a pessoa colocou nos murais dos outros
  const [metrics, setMetrics] = useState<{ visits: number | null; inMine: number | null; placed: number | null } | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  useEffect(() => {
    if (open && !inline) void getOwnAvatar(getBrowserSupabase()).then((a) => setAvatar(a.url));
  }, [open, inline]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.classList.remove("drawer-out");
      d.showModal();
    }
    if (!open && d.open) {
      // sai deslizando para a esquerda e só então fecha
      d.classList.add("drawer-out");
      setClosing(true);
      const t = window.setTimeout(() => {
        d.classList.remove("drawer-out");
        setClosing(false);
        if (d.open) d.close();
      }, 220);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!isOpen) setModal(null);
  }, [isOpen]);
  const tokenAt = useRef(0);
  useEffect(() => {
    if (!editProfileToken) return;
    tokenAt.current = Date.now();
  }, [editProfileToken]);
  useEffect(() => {
    // só vale logo depois do pedido (a gaveta do celular abre em seguida); uma gaveta aberta mais tarde não abre o perfil sozinha
    if (isOpen && editProfileToken && Date.now() - tokenAt.current < 2500) setModal(startPanel);
  }, [isOpen, editProfileToken, startPanel]);

  useEffect(() => {
    if (modal !== "numbers") return;
    let alive = true;
    const sb = getBrowserSupabase();
    setMetrics(null);
    void Promise.all([getProfileSummary(sb, nick), Promise.all(murals.map((m) => getPublicMural(sb, { nick, slug: m.slug })))]).then(([sum, list]) => {
      if (!alive) return;
      setMetrics({ visits: sum?.views ?? null, inMine: list.some((m) => m) ? list.reduce((n, m) => n + (m?.stats.messages ?? 0), 0) : null, placed: sum?.placed ?? null });
    });
    return () => {
      alive = false;
    };
  }, [modal, murals, nick]);

  const close = () => setModal(null);
  const app = useInstall(); // "Instalar o app": só aparece onde dá para instalar e ainda não está instalado

  const rows = (
    <>
              {mural && (
                <>
                  <Row
                    onClick={() => setModal("mymurals")}
                    label="Meus murais"
                    hint="Gerencie, personalize e acesse seus murais."
                    icon={
                      <svg {...ic}>
                        <rect x="4" y="3.5" width="16" height="11" rx="1.5" />
                        <path d="M8 20l2-5.5M16 20l-2-5.5M12 14.5V20M8.5 8h.01M12 8h.01M15.5 8h.01M8.5 11h7" />
                      </svg>
                    }
                  />
                  {VISITORS_ENABLED && (
                    <Row
                      onClick={() => setModal("visitors")}
                      label="Visitantes"
                      icon={
                        <svg {...ic}>
                          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      }
                    />
                  )}
                  <Row
                    onClick={() => setModal("pins")}
                    label="Aprovações"
                    hint={pendingCount > 0 ? `${pendingCount} aguardando a sua aprovação` : "Nenhum pin aguardando"}
                    badge={pendingCount}
                    icon={
                      <svg {...ic}>
                        <path d="M5 4h14v12l-4 4H5V4Z" />
                        <path d="M15 20v-4h4M8.5 9h7M8.5 12.5h4" />
                      </svg>
                    }
                  />
                  {account.plan === "full" && (
                  <Row
                    onClick={() => setModal("shared")}
                    label="Mural compartilhado"
                    hint={sharedInvites > 0 ? `${sharedInvites} convite${sharedInvites > 1 ? "s" : ""} para você` : "Um mural só de vocês dois (PINZ+)"}
                    badge={sharedInvites}
                    icon={
                      <svg {...ic}>
                        <circle cx="9" cy="8.5" r="3" />
                        <circle cx="16.5" cy="9.5" r="2.5" />
                        <path d="M3.5 19c.6-3 2.7-4.6 5.5-4.6s4.9 1.600 5.500 4.600M15 14.800c2.600-.4 4.800.9 5.500 4.200" />
                      </svg>
                    }
                  />
                  )}
                  <Row
                    onClick={() => setModal("numbers")}
                    label="Métricas"
                    hint="Visitas e pins colocados."
                    icon={
                      <svg {...ic}>
                        <path d="M5 20V10M12 20V4M19 20v-7" />
                      </svg>
                    }
                  />
                </>
              )}
              {onExportImage && (
                <Row
                  onClick={() => {
                    onClose();
                    onExportImage();
                  }}
                  label="Salvar imagem do mural"
                  hint="Uma imagem em alta qualidade para postar"
                  icon={
                    <svg {...ic}>
                      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                      <circle cx="9" cy="10" r="1.6" />
                      <path d="m4 17 5-4.5 3.5 3 3-2.5L20 16" />
                    </svg>
                  }
                />
              )}
              <Row
                onClick={() => setModal("following")}
                label="Seguidores e seguindo"
                hint="Quem segue você e quem você segue."
                icon={
                  <svg {...ic}>
                    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                  </svg>
                }
              />
              <Row
                onClick={() => setModal("rewards")}
                label="Ganhe créditos"
                hint="Tarefas que dão créditos na hora."
                icon={
                  <svg {...ic}>
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7.5v9M9.5 10c0-1 1.1-1.800 2.500-1.800s2.500.8 2.500 1.800-1.100 1.600-2.500 1.900-2.500.9-2.500 1.900 1.100 1.800 2.500 1.800 2.500-.8 2.500-1.800" />
                  </svg>
                }
              />
              <Row
                onClick={() => {
                  onClose();
                  window.setTimeout(() => window.dispatchEvent(new CustomEvent(TOUR_EVENT)), 300);
                }}
                label="Tour pelo Pinz"
                hint="Descubra todas as funcionalidades."
                icon={
                  <svg {...ic}>
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
                  </svg>
                }
              />
              <Row
                onClick={() => setModal("plans")}
                label="Planos"
                hint={`Seu plano atual: ${account.plan === "full" ? "PINZ+" : "FREE"}.`}
                icon={
                  <svg {...ic}>
                    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                  </svg>
                }
              />
              {isAdmin && (
                <Row
                  onClick={() => window.location.assign("/admin")}
                  label="Administrar site"
                  hint="Usuários, murais, créditos e recursos"
                  icon={
                    <svg {...ic}>
                      <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  }
                />
              )}
              {!app.installed && (app.native || app.ios) && (
                <Row
                  onClick={() => {
                    if (app.native) {
                      onClose();
                      void app.install();
                    } else setModal("install");
                  }}
                  label="Instalar o app"
                  hint="Pinz na tela inicial, em tela cheia"
                  icon={
                    <svg {...ic}>
                      <path d="M12 4v10M8 10.5l4 4 4-4" />
                      <path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
                    </svg>
                  }
                />
              )}
              <Row
                onClick={() => {
                  onClose();
                  window.setTimeout(() => window.dispatchEvent(new CustomEvent(A11Y_OPEN_EVENT)), 300);
                }}
                label="Acessibilidade"
                hint="Daltonismo, texto maior e contraste"
                icon={
                  <svg {...ic}>
                    <circle cx="12" cy="4.5" r="1.8" />
                    <path d="M5 8.5c2.3.9 4.7 1.3 7 1.3s4.7-.4 7-1.3M12 9.8V14m0 0-3 6m3-6 3 6" />
                  </svg>
                }
              />
    </>
  );
  const modals = (
    <>
      {mural && <PinsModal open={isOpen && modal === "pins"} onClose={close} muralId={mural.id} plan={mural.plan} onPending={onPending} />}
      <VisitorsModal open={isOpen && modal === "visitors"} onClose={close} />
      <FollowingModal open={isOpen && modal === "following"} onClose={close} nick={nick} />
      <MyMuralsModal open={isOpen && modal === "mymurals"} onClose={close} murals={murals} currentId={mural?.id} onNewMural={onNewMural} onChanged={onChanged} onDeleted={onDeleted} />
      {mural && (
        <Modal open={isOpen && modal === "edit"} onClose={close} title="Editar mural">
          <MuralSettings mural={mural} onSaved={onChanged} onDeleted={onDeleted} canDelete={mural.id !== murals[0]?.id} />
        </Modal>
      )}
      <Modal open={isOpen && modal === "install"} onClose={close} title="Instalar o Pinz">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[#4a3826]">
          <li>
            Toque no botão <strong>Compartilhar</strong> do Safari (o quadrado com a seta para cima).
          </li>
          <li>
            Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.
          </li>
          <li>
            Confirme em <strong>Adicionar</strong>. O Pinz fica na sua tela inicial e abre em tela cheia.
          </li>
        </ol>
        <p className="mt-3 text-xs text-[#6b5440]">Se não aparecer a opção, abra o Pinz pelo Safari (outros navegadores do iPhone não instalam apps).</p>
      </Modal>
      <Modal open={isOpen && modal === "numbers"} onClose={close} title="Métricas">
        <dl className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
          {(
            [
              ["visitas nos seus murais", metrics?.visits],
              ["pins nos seus murais", metrics?.inMine],
              ["pins que você colocou em murais de outras pessoas", metrics?.placed],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-xl bg-[#f1e7d2]/70 px-3 py-4">
              <dd className="text-3xl font-semibold tabular-nums">{v == null ? "–" : v.toLocaleString("pt-BR")}</dd>
              <dt className="mt-1 text-sm text-[#6b5440]">{label}</dt>
            </div>
          ))}
        </dl>
      </Modal>
      <Modal open={isOpen && modal === "shared"} onClose={close} title="Mural compartilhado">
        <SharedMurals plus={account.plan === "full"} onChanged={() => onSharedChanged?.()} onNotify={onNotify} />
      </Modal>
      <RewardsModal open={isOpen && modal === "rewards"} onClose={close} />
      <PlansModal open={isOpen && modal === "plans"} onClose={close} plan={account.plan} credits={credits} />
      <ProfileModal open={isOpen && modal === "profile"} onClose={close} nick={nick} email={email} onSignOut={onSignOut} onPrivacySaved={onChanged} plus={account.plan === "full"} />
    </>
  );

  // desktop: atalhos direto na coluna bege (sem gaveta)
  if (inline) {
    return (
      <CompactCtx.Provider value>
        <nav aria-label="Menu da conta" data-tour="menu" className="space-y-1.5">
          {rows}
        </nav>
        <button type="button" onClick={onSignOut} className="mt-2 w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-2 text-sm font-semibold text-[#6b2a1c] transition hover:bg-white">
          Sair da conta
        </button>
        {modals}
      </CompactCtx.Provider>
    );
  }

  return (
    <>
      <dialog
        ref={ref}
        onClose={onClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        aria-label="Menu da conta"
        className="fixed inset-y-0 right-auto left-0 m-0 mr-auto drawer-slide h-dvh max-h-none w-[min(26rem,calc(100vw-3.5rem))] max-w-none overflow-hidden rounded-none border-r border-[#e6d8bd] bg-[#f7efdc] p-0 text-[#2f2218] shadow-[1rem_0_4rem_rgba(0,0,0,.45)] backdrop:bg-black/50 sm:rounded-r-3xl"
      >
        {(open || closing) && (
          <div className="flex h-dvh flex-col">
            {/* cabeçalho simples: foto, nome e selo, sem fundo próprio */}
            <header className="relative flex shrink-0 items-center gap-4 px-5 pt-5 pb-3">
              <Avatar src={avatar} name={nick} plus={account.plan === "full"} className="size-[4.4rem] shrink-0" />
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-xs font-semibold tracking-[0.12em] text-[#8a7b69] uppercase">Sua conta</p>
                <p className="font-title text-[1.7rem] leading-tight font-semibold [overflow-wrap:anywhere]">{nick}</p>
                {account.plan === "full" && <PlanBadge plan="full" className="mt-1" />}
              </div>
              <button type="button" onClick={onClose} aria-label="Fechar menu" className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-lg text-[#6b5440] transition hover:bg-black/5 hover:text-[#2f2218] active:scale-95">
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <nav aria-label="Menu da conta" className={`flex-1 space-y-2.5 overflow-y-auto bg-[#f7efdc] px-4 pt-2 pb-4 ${modal ? "hidden" : ""}`}>
              {rows}
            </nav>
            {/* o painel do atalho aberto ocupa o lugar do menu, com a seta de voltar */}
            <div ref={setSlot} className={`relative min-h-0 flex-1 overflow-hidden bg-[#f7efdc] ${modal ? "" : "hidden"}`} />

            <footer className={`relative shrink-0 overflow-hidden bg-[#f7efdc] px-5 pt-3 pb-4 ${modal ? "hidden" : ""}`}>
              <div className="mb-3 border-t border-dashed border-[#d9c9ad]" aria-hidden />
              <button type="button" onClick={onSignOut} className="relative z-10 mx-auto flex w-[80%] cursor-pointer items-center justify-center gap-3 rounded-2xl border border-[#f1c8c1] bg-[#fbe5e0] px-4 py-3.5 text-base font-bold text-[#b3261e] shadow-[0_2px_6px_rgba(120,40,30,.12)] transition hover:bg-[#fbd9d2] active:scale-[0.99]">
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H9M15 8l4 4-4 4M19 12H9" />
                </svg>
                Sair da conta
              </button>
            </footer>
          </div>
        )}
      </dialog>

      <EmbedCtx.Provider value={slot}>{modals}</EmbedCtx.Provider>
    </>
  );
}
