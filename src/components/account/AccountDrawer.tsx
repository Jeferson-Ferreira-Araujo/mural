"use client";

import { useBackClose } from "@/lib/backStack";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getAccount } from "@/lib/account";
import type { OwnMural } from "@/lib/auth";
import { getPublicMural, type MuralStats } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { getOwnAvatar } from "@/lib/avatar";
import { useInstall } from "@/lib/install";
import { Avatar } from "../Avatar";
import { PlanBadge } from "../board/PlanBadge";
import { EmbedCtx, Modal } from "./Modal";
import { ONBOARDING_EVENT, TOUR_EVENT } from "@/lib/onboarding";
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

type Tint = "orange" | "purple" | "pink" | "green" | "yellow" | "blue" | "gold";
const TINTS: Record<Tint, { bg: string; fg: string }> = {
  orange: { bg: "#f9e5cb", fg: "#c4782a" },
  purple: { bg: "#e8e2f6", fg: "#6c4fc2" },
  pink: { bg: "#fbe0e6", fg: "#d9547a" },
  green: { bg: "#dcf1e1", fg: "#2f8f4e" },
  yellow: { bg: "#fbefc9", fg: "#c99a14" },
  blue: { bg: "#dbe9fa", fg: "#2f6fc9" },
  gold: { bg: "#fbebc2", fg: "#b9831a" },
};

/** Ilustrações pequenas do lado direito de cada atalho (só desenho, sem imagens de fora). */
const Polaroid = ({ rot, children, className = "" }: { rot: number; children: ReactNode; className?: string }) => (
  <span className={`absolute block rounded-[2px] bg-white p-[2px] pb-[6px] shadow-[0_2px_5px_rgba(60,35,10,.35)] ${className}`} style={{ transform: `rotate(${rot}deg)` }}>
    {children}
  </span>
);
const ArtMurals = () => (
  <span aria-hidden className="relative block h-12 w-[4.2rem]">
    <Polaroid rot={-9} className="top-1 left-0 w-9">
      <span className="block aspect-square bg-gradient-to-b from-[#4a6a8a] to-[#9ac0a0]" />
    </Polaroid>
    <Polaroid rot={6} className="top-0 left-4 w-10">
      <span className="block aspect-square bg-gradient-to-b from-[#f3a65a] via-[#d9606b] to-[#4c3a6e]" />
    </Polaroid>
    <span className="absolute top-0 left-[3.1rem] size-2.5 rounded-full bg-[#e0443a] shadow-[0_1px_2px_rgba(0,0,0,.4)]" />
  </span>
);
const PersonGlyph = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
    <circle cx="12" cy="9" r="4" />
    <path d="M4 21c.6-4 4-6 8-6s7.4 2 8 6Z" />
  </svg>
);
const ArtShared = () => (
  <span aria-hidden className="relative block h-12 w-[4.4rem]">
    <span className="absolute top-2 left-0 grid size-9 place-items-center rounded-full bg-[#f2dcb4] text-[#b9833a]">
      <PersonGlyph />
    </span>
    <span className="absolute top-3 left-7 grid size-9 place-items-center rounded-full bg-[#ecd2a8] text-[#a8743a]">
      <PersonGlyph />
    </span>
    <svg viewBox="0 0 24 24" className="absolute top-0 left-6 size-5 text-[#e0443a]" fill="currentColor">
      <path d="M12 21s-7.5-4.6-9.5-9.2C1 8 3.2 5 6.2 5c2 0 3.3 1 3.8 2.2C10.5 6 11.8 5 13.8 5 16.8 5 19 8 17.5 11.8 15.5 16.4 12 21 12 21Z" />
    </svg>
  </span>
);
const ArtBars = () => (
  <span aria-hidden className="flex h-12 w-[4.2rem] items-end justify-center gap-1 border-b border-[#d9c9ad] pb-px">
    {(
      [
        ["#f2b84a", 14],
        ["#ee7fc0", 22],
        ["#7aa6e6", 30],
        ["#58cbb0", 40],
      ] as const
    ).map(([c, h]) => (
      <span key={c} className="w-3 rounded-t-[3px]" style={{ background: c, height: h }} />
    ))}
  </span>
);
const ArtFollowing = () => (
  <span aria-hidden className="relative block h-12 w-[4.2rem]">
    <Polaroid rot={-7} className="top-1 left-1 w-9">
      <span className="grid aspect-square place-items-end justify-center overflow-hidden bg-[#c9b49a]">
        <span className="size-5 rounded-full bg-[#6b4a3a]" />
      </span>
    </Polaroid>
    <Polaroid rot={8} className="top-0 left-6 w-9">
      <span className="grid aspect-square place-items-end justify-center overflow-hidden bg-[#a9bccf]">
        <span className="size-5 rounded-full bg-[#4a5a6a]" />
      </span>
    </Polaroid>
  </span>
);
const ArtCoin = () => (
  <span aria-hidden className="inline-flex items-center gap-1 rounded-xl bg-[#f6c64a] px-3 py-2 text-sm font-black text-[#5a3b05] shadow-[inset_0_1px_0_rgba(255,255,255,.6)]">
    +
    <span className="grid size-6 place-items-center rounded-full bg-[#b9831a] text-[13px] text-white">P</span>
  </span>
);
const ArtMap = () => (
  <span aria-hidden className="relative block h-12 w-[4.2rem] rotate-[-4deg] rounded-[3px] bg-[#f3e6c8] shadow-[0_2px_5px_rgba(60,35,10,.3)]">
    <svg viewBox="0 0 64 48" className="absolute inset-0 size-full" fill="none">
      <path d="M6 34c8-14 14 4 22-8s14 6 24-10" stroke="#8a5a2a" strokeWidth="1.6" strokeDasharray="3 3" strokeLinecap="round" />
      <path d="M50 8c-4 0-7 3-7 7 0 5 7 11 7 11s7-6 7-11c0-4-3-7-7-7Z" fill="#e0443a" />
      <circle cx="50" cy="15" r="2.4" fill="#fff" />
    </svg>
  </span>
);
const ArtWelcome = () => (
  <span aria-hidden className="relative grid h-11 w-[4.2rem] place-items-center overflow-hidden rounded-[4px] bg-gradient-to-br from-[#8a5a2a] to-[#4a2f14] shadow-[0_2px_5px_rgba(60,35,10,.35)]">
    <span className="absolute inset-1 rounded-[2px] bg-[repeating-linear-gradient(90deg,#d8b98a_0_6px,#c79e66_6px_12px)] opacity-60" />
    <span className="relative grid size-6 place-items-center rounded-full bg-white text-[#2f2218]">
      <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
        <path d="M8 5v14l11-7Z" />
      </svg>
    </span>
  </span>
);

function Row({ icon, label, hint, badge, onClick, tint = "orange", art, pill }: { icon: ReactNode; label: string; hint?: string; badge?: number; onClick: () => void; /** cor do ícone */ tint?: Tint; /** desenho do lado direito (só na gaveta) */ art?: ReactNode; /** etiqueta do lado direito (plano atual…) */ pill?: ReactNode }) {
  const compact = useContext(CompactCtx);
  const t = TINTS[tint];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center rounded-2xl border border-[#ece1c9] bg-[#fffaf0]/90 text-left shadow-[0_1px_0_rgba(255,255,255,.8)_inset,0_2px_6px_rgba(90,60,20,.08)] transition hover:bg-white active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${compact ? "gap-2.5 px-3 py-2" : "gap-3.5 px-3.5 py-3"}`}
    >
      <span className={`grid shrink-0 place-items-center ${compact ? "size-8 rounded-xl" : "size-12 rounded-2xl"}`} style={{ background: t.bg, color: t.fg }} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block leading-tight font-bold ${compact ? "text-[14px]" : "text-[17px]"}`}>{label}</span>
        {hint && <span className={`block leading-snug text-[#6b5440] ${compact ? "truncate text-xs" : "mt-0.5 text-[13px]"}`}>{hint}</span>}
      </span>
      {!compact && art}
      {!compact && pill}
      {badge !== undefined && (badge > 0 ? <span className="rounded-lg bg-[#d98a2b] px-2.5 py-0.5 text-sm font-bold text-white">{badge}</span> : !compact && <span className="grid min-w-9 place-items-center rounded-xl bg-[#efe6d3] px-2 py-1.5 text-base font-bold text-[#6b5440]">0</span>)}
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
  const [slot, setSlot] = useState<HTMLElement | null>(null); // onde o painel aberto aparece (parte de baixo da gaveta)
  const isOpen = inline || open;
  useBackClose(open && !inline, onClose); // voltar (Android) fecha o menu
  const [stats, setStats] = useState<MuralStats | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  useEffect(() => {
    if (open && !inline) void getOwnAvatar(getBrowserSupabase()).then((a) => setAvatar(a.url));
  }, [open, inline]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!isOpen) setModal(null);
  }, [isOpen]);

  useEffect(() => {
    if (!modal || modal !== "numbers" || !mural) return;
    void getPublicMural(getBrowserSupabase(), { nick, slug: mural.slug }).then((m) => setStats(m?.stats ?? null));
  }, [modal, mural, nick]);

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
                    tint="orange"
                    art={<ArtMurals />}
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
                    tint="purple"
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
                    tint="pink"
                    art={<ArtShared />}
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
                    label="Números do mural"
                    hint="Veja estatísticas e interações."
                    tint="green"
                    art={<ArtBars />}
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
                  tint="pink"
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
                label="Seguindo"
                hint="Murais de quem você segue."
                tint="yellow"
                art={<ArtFollowing />}
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
                tint="gold"
                art={<ArtCoin />}
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
                tint="blue"
                art={<ArtMap />}
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
                tint="purple"
                pill={<span className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-extrabold ${account.plan === "full" ? "bg-[#6c4fc2] text-white" : "bg-[#e9e2d2] text-[#6b5440]"}`}>{account.plan === "full" ? "👑 PINZ+" : "FREE"}</span>}
                icon={
                  <svg {...ic}>
                    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                  </svg>
                }
              />
              {isAdmin && (
                <Row
                  onClick={() => {
                    onClose();
                    window.setTimeout(() => window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT)), 300);
                  }}
                  label="Testar as boas-vindas"
                  hint="Veja como é a experiência de novo."
                  tint="green"
                  art={<ArtWelcome />}
                  icon={
                    <svg {...ic}>
                      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M5.600 18.400l2.100-2.100M16.300 7.700l2.100-2.100" />
                    </svg>
                  }
                />
              )}
              {isAdmin && (
                <Row
                  onClick={() => window.location.assign("/admin")}
                  label="Administração"
                  hint="Usuários, murais, créditos e bloqueios"
                  tint="purple"
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
                  tint="green"
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
                tint="blue"
                icon={
                  <svg {...ic}>
                    <circle cx="12" cy="4.5" r="1.8" />
                    <path d="M5 8.5c2.3.9 4.7 1.3 7 1.3s4.7-.4 7-1.3M12 9.8V14m0 0-3 6m3-6 3 6" />
                  </svg>
                }
              />
              <Row
                onClick={() => setModal("profile")}
                label="Perfil"
                hint="Foto, senha e dados da conta"
                tint="orange"
                icon={
                  <svg {...ic}>
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" />
                  </svg>
                }
              />
    </>
  );
  const modals = (
    <>
      {mural && <PinsModal open={isOpen && modal === "pins"} onClose={close} muralId={mural.id} plan={mural.plan} onPending={onPending} />}
      <VisitorsModal open={isOpen && modal === "visitors"} onClose={close} />
      <FollowingModal open={isOpen && modal === "following"} onClose={close} />
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
      <Modal open={isOpen && modal === "numbers"} onClose={close} title="Números do mural">
        <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {(
            [
              ["visitaram", stats?.visited],
              ["tentaram", stats?.tried],
              ["acertaram", stats?.correct],
              ["mensagens", stats?.messages],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-xl bg-[#f1e7d2]/70 px-1 py-4">
              <dd className="text-2xl font-semibold">{v ?? "–"}</dd>
              <dt className="text-xs text-[#6b5440]">{label}</dt>
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
        className="fixed inset-y-0 right-0 left-auto m-0 ml-auto h-dvh max-h-none w-[min(26rem,100vw)] max-w-none overflow-hidden rounded-none border-l border-[#e6d8bd] bg-[#f7efdc] p-0 text-[#2f2218] shadow-[-1rem_0_4rem_rgba(0,0,0,.45)] backdrop:bg-black/50 sm:rounded-l-3xl"
      >
        {open && (
          <div className="flex h-dvh flex-col">
            {/* cabeçalho: faixa de cortiça com o cartão de papel da conta, a foto com a coroa do PINZ+ e o logo */}
            <header
              className="relative shrink-0 px-4 pt-4 pb-5"
              style={{
                backgroundColor: "#b98a55",
                backgroundImage: "radial-gradient(rgba(60,35,10,.28) 1px, transparent 1.6px), radial-gradient(rgba(255,235,200,.22) 1px, transparent 1.6px), linear-gradient(160deg, #c99a63, #a87846)",
                backgroundSize: "7px 7px, 11px 11px, auto",
                backgroundPosition: "0 0, 3px 4px, 0 0",
              }}
            >
              <button type="button" onClick={onClose} aria-label="Fechar menu" className="absolute top-3 right-3 z-10 grid size-10 cursor-pointer place-items-center rounded-full bg-white/95 text-[#2f2218] shadow-[0_2px_8px_rgba(0,0,0,.3)] transition hover:bg-white active:scale-95">
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
              <div className="paper-grain relative mt-5 flex items-center gap-3 rounded-[1.6rem] bg-[#fbf3e1] px-4 py-4 shadow-[0_6px_16px_rgba(60,35,10,.35)]">
                <span className="relative shrink-0">
                  <Avatar src={avatar} name={nick} plus={account.plan === "full"} className="size-[4.6rem]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[#8a7b69] uppercase">Sua conta</p>
                  <p className="font-title text-[1.7rem] leading-tight font-semibold [overflow-wrap:anywhere]">{nick}</p>
                  {account.plan === "full" && <PlanBadge plan="full" className="mt-1" />}
                </div>
              </div>
            </header>

            <nav aria-label="Menu da conta" className={`-mt-3 flex-1 space-y-2.5 overflow-y-auto rounded-t-[1.6rem] bg-[#f7efdc] px-4 py-4 ${modal ? "hidden" : ""}`}>
              {rows}
            </nav>
            {/* o painel do atalho aberto ocupa o lugar do menu, com a seta de voltar */}
            <div ref={setSlot} className={`relative -mt-3 min-h-0 flex-1 overflow-hidden rounded-t-[1.6rem] bg-[#f7efdc] ${modal ? "" : "hidden"}`} />

            <footer className={`relative shrink-0 overflow-hidden bg-[#f7efdc] px-5 pt-3 pb-4 ${modal ? "hidden" : ""}`}>
              <div className="mb-3 border-t border-dashed border-[#d9c9ad]" aria-hidden />
              <button type="button" onClick={onSignOut} className="relative z-10 mx-auto flex w-[80%] cursor-pointer items-center justify-center gap-3 rounded-2xl border border-[#f1c8c1] bg-[#fbe5e0] px-4 py-3.5 text-base font-bold text-[#b3261e] shadow-[0_2px_6px_rgba(120,40,30,.12)] transition hover:bg-[#fbd9d2] active:scale-[0.99]">
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H9M15 8l4 4-4 4M19 12H9" />
                </svg>
                Sair da conta
              </button>
              {/* folhinhas de enfeite nos cantos */}
              <svg aria-hidden viewBox="0 0 60 50" className="pointer-events-none absolute -bottom-2 -left-2 w-16 opacity-80">
                <path d="M4 48C6 28 20 14 40 12 38 30 26 44 4 48Z" fill="#3f8a45" />
                <path d="M4 48C16 36 26 26 40 12" stroke="#2c6a33" strokeWidth="1.4" fill="none" />
              </svg>
              <svg aria-hidden viewBox="0 0 60 50" className="pointer-events-none absolute -right-2 -bottom-2 w-16 scale-x-[-1] opacity-80">
                <path d="M4 48C6 28 20 14 40 12 38 30 26 44 4 48Z" fill="#4f9a4f" />
                <path d="M4 48C16 36 26 26 40 12" stroke="#2c6a33" strokeWidth="1.4" fill="none" />
              </svg>
            </footer>
          </div>
        )}
      </dialog>

      <EmbedCtx.Provider value={slot}>{modals}</EmbedCtx.Provider>
    </>
  );
}
