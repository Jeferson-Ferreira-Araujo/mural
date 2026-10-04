"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getAccount } from "@/lib/account";
import type { OwnMural } from "@/lib/auth";
import { getPublicMural, muralUrl, type MuralStats } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { PlanBadge } from "../board/PlanBadge";
import { Modal } from "./Modal";
import { MuralSettings } from "./MuralSettings";
import { PinsModal } from "./PinsModal";
import { PlansModal } from "./PlansModal";
import { ProfileModal } from "./ProfileModal";

type ModalId = "pins" | "plans" | "profile" | "edit" | "numbers";

function Row({ icon, label, hint, badge, onClick }: { icon: ReactNode; label: string; hint?: string; badge?: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-[#e1d3ba] bg-white/60 px-4 py-3.5 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1e7d2] text-[#4a3826]" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{label}</span>
        {hint && <span className="block truncate text-xs text-[#6b5440]">{hint}</span>}
      </span>
      {!!badge && <span className="rounded-full bg-[#d98a2b] px-2.5 py-0.5 text-sm font-bold text-white">{badge}</span>}
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
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const mural = murals.find((m) => m.slug === currentSlug) ?? murals[0];
  const account = { ...getAccount(), plan: mural?.plan ?? getAccount().plan }; // o plano vale por mural (definido no banco)
  const [modal, setModal] = useState<ModalId | null>(null);
  const [stats, setStats] = useState<MuralStats | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) setModal(null);
  }, [open]);

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
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Sua conta</p>
                <p className="font-title truncate text-xl font-semibold">{nick}</p>
                {mural && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#6b5440]">
                    <PlanBadge plan={mural.plan} />
                    <span>{mural.question ? "🔒 Privado" : "🌐 Público"}</span>
                  </p>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Fechar menu" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-2xl hover:bg-black/5">
                ×
              </button>
            </header>

            <nav aria-label="Menu da conta" className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
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
              <Row
                onClick={onOpenStore}
                label="Loja"
                hint={`Pins, temas e murais · ${credits} créditos`}
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
            </nav>

            <footer className="border-t border-[#e6d8bd] px-5 py-3">
              <button type="button" onClick={onSignOut} className="w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#6b2a1c] transition hover:bg-white">
                Sair da conta
              </button>
            </footer>
          </div>
        )}
      </dialog>

      {mural && <PinsModal open={open && modal === "pins"} onClose={close} muralId={mural.id} plan={mural.plan} onPending={onPending} />}
      {mural && (
        <Modal open={open && modal === "edit"} onClose={close} title="Editar mural">
          <MuralSettings mural={mural} onSaved={onChanged} onDeleted={onDeleted} />
        </Modal>
      )}
      <Modal open={open && modal === "numbers"} onClose={close} title="Números do mural">
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
      <PlansModal open={open && modal === "plans"} onClose={close} plan={account.plan} credits={credits} />
      <ProfileModal open={open && modal === "profile"} onClose={close} nick={nick} email={email} onSignOut={onSignOut} />
    </>
  );
}
