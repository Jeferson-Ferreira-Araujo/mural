"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getAccount } from "@/lib/account";
import type { OwnMural } from "@/lib/auth";
import { getPublicMural, muralUrl, type MuralStats } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { getOwnAvatar } from "@/lib/avatar";
import { Avatar } from "../Avatar";
import { Modal } from "./Modal";
import { MuralSettings } from "./MuralSettings";
import { PinsModal } from "./PinsModal";
import { PlansModal } from "./PlansModal";
import { ProfileModal } from "./ProfileModal";
import { SharedMurals } from "./SharedMurals";

type ModalId = "pins" | "plans" | "profile" | "edit" | "numbers" | "shared";

/** Dentro da coluna bege do desktop os atalhos ficam mais compactos. */
const CompactCtx = createContext(false);

function Row({ icon, label, hint, badge, onClick }: { icon: ReactNode; label: string; hint?: string; badge?: number; onClick: () => void }) {
  const compact = useContext(CompactCtx);
  return (
    <button type="button" onClick={onClick} className={`flex w-full cursor-pointer items-center rounded-2xl border border-[#e1d3ba] bg-white/60 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${compact ? "gap-2.5 px-3 py-2" : "gap-3 px-4 py-3.5"}`}>
      <span className={`grid shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-[#4a3826] ${compact ? "size-8" : "size-10"}`} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-bold ${compact ? "text-[14px]" : "text-[15px]"}`}>{label}</span>
        {hint && <span className="block truncate text-xs text-[#6b5440]">{hint}</span>}
      </span>
      {!!badge && <span className="rounded-md bg-[#d98a2b] px-2.5 py-0.5 text-sm font-bold text-white">{badge}</span>}
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
  onOpenStore,
  onChanged,
  onDeleted,
  onSignOut,
  onPending,
  onNotify,
  sharedInvites = 0,
  onSharedChanged,
  onExportImage,
  inline = false,
  notifications,
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
  onOpenStore: () => void;
  /** o mural foi editado: recarrega os dados da tela */
  onChanged: () => void;
  onDeleted: () => void;
  onSignOut: () => void;
  onPending: (n: number) => void;
  onNotify: (msg: string) => void;
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
  const isOpen = inline || open;
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

  async function copy() {
    if (!mural) return;
    try {
      await navigator.clipboard.writeText(`https://${muralUrl({ nick, slug: mural.slug })}`);
      onNotify("Link copiado ✓");
    } catch {
      onNotify("Não foi possível copiar o link.");
    }
  }
  const close = () => setModal(null);

  const rows = (
    <>
              {mural && (
                <>
                  <Row
                    onClick={() => setModal("pins")}
                    label="Pins do mural"
                    hint={pendingCount > 0 ? `${pendingCount} aguardando a sua aprovação` : "Aprovar, recusar e gerenciar"}
                    badge={pendingCount}
                    icon={
                      <svg {...ic}>
                        <path d="M5 4h14v12l-4 4H5V4Z" />
                        <path d="M15 20v-4h4M8.5 9h7M8.5 12.5h4" />
                      </svg>
                    }
                  />
                  <Row
                    onClick={() => setModal("edit")}
                    label="Editar mural"
                    hint={mural.title}
                    icon={
                      <svg {...ic}>
                        <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
                      </svg>
                    }
                  />
                  <Row
                    onClick={() => setModal("numbers")}
                    label="Números do mural"
                    icon={
                      <svg {...ic}>
                        <path d="M5 20V10M12 20V4M19 20v-7" />
                      </svg>
                    }
                  />
                  <Row
                    onClick={() => void copy()}
                    label="Copiar link do mural"
                    hint={muralUrl({ nick, slug: mural.slug })}
                    icon={
                      <svg {...ic}>
                        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
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
              {notifications && (
                <Row
                  onClick={() => {
                    onClose();
                    notifications.onOpen();
                  }}
                  label="Notificações"
                  hint={notifications.count > 0 ? `${notifications.count} nova${notifications.count > 1 ? "s" : ""}` : "Avisos sobre os seus pins"}
                  badge={notifications.count}
                  icon={
                    <svg {...ic}>
                      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
                      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
                    </svg>
                  }
                />
              )}
              <Row
                onClick={() => setModal("shared")}
                label="Mural compartilhado"
                hint={sharedInvites > 0 ? `${sharedInvites} convite${sharedInvites > 1 ? "s" : ""} para você` : "Um mural só de vocês dois (PLUS)"}
                badge={sharedInvites}
                icon={
                  <svg {...ic}>
                    <circle cx="9" cy="8.5" r="3" />
                    <circle cx="16.5" cy="9.5" r="2.5" />
                    <path d="M3.5 19c.6-3 2.7-4.6 5.5-4.6s4.9 1.600 5.500 4.600M15 14.800c2.600-.4 4.800.9 5.500 4.200" />
                  </svg>
                }
              />
              <Row
                onClick={onOpenStore}
                label="Loja"
                hint={`Bottons, temas e murais · ${credits} créditos`}
                icon={
                  <svg {...ic}>
                    <path d="M4 8h16l-1.2 11.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8L4 8Z" />
                    <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
                  </svg>
                }
              />
              <Row
                onClick={() => setModal("plans")}
                label="Planos"
                hint={`Seu plano: ${account.plan === "full" ? "PLUS" : "FREE"}`}
                icon={
                  <svg {...ic}>
                    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                  </svg>
                }
              />
              {isAdmin && (
                <Row
                  onClick={() => window.location.assign("/admin")}
                  label="Administração"
                  hint="Usuários, murais, créditos e bloqueios"
                  icon={
                    <svg {...ic}>
                      <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  }
                />
              )}
              <Row
                onClick={() => setModal("profile")}
                label="Perfil"
                hint="Foto, senha e dados da conta"
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
      {mural && (
        <Modal open={isOpen && modal === "edit"} onClose={close} title="Editar mural">
          <MuralSettings mural={mural} onSaved={onChanged} onDeleted={onDeleted} />
        </Modal>
      )}
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
      <PlansModal open={isOpen && modal === "plans"} onClose={close} plan={account.plan} credits={credits} />
      <ProfileModal open={isOpen && modal === "profile"} onClose={close} nick={nick} email={email} onSignOut={onSignOut} plus={account.plan === "full"} />
    </>
  );

  // desktop: atalhos direto na coluna bege (sem gaveta)
  if (inline) {
    return (
      <CompactCtx.Provider value>
        <nav aria-label="Menu da conta" className="space-y-1.5">
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
        className="fixed inset-y-0 right-0 left-auto m-0 ml-auto h-dvh max-h-none w-[min(26rem,100vw)] max-w-none overflow-hidden rounded-none border-l border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[-1rem_0_4rem_rgba(0,0,0,.45)] backdrop:bg-black/50 sm:rounded-l-3xl"
      >
        {open && (
          <div className="flex h-dvh flex-col">
            <header className="flex items-start justify-between gap-3 border-b border-[#e6d8bd] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={avatar} name={nick} plus={account.plan === "full"} className="size-12" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Sua conta</p>
                  <p className="font-title truncate text-xl font-semibold">{nick}</p>
                  {mural && <p className="mt-0.5 text-sm text-[#6b5440]">{mural.question ? "🔒 Privado" : "🌐 Público"}</p>}
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Fechar menu" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-2xl hover:bg-black/5">
                ×
              </button>
            </header>

            <nav aria-label="Menu da conta" className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
              {rows}
            </nav>

            <footer className="border-t border-[#e6d8bd] px-5 py-3">
              <button type="button" onClick={onSignOut} className="w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#6b2a1c] transition hover:bg-white">
                Sair da conta
              </button>
            </footer>
          </div>
        )}
      </dialog>

      {modals}
    </>
  );
}
