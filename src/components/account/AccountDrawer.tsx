"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getAccount } from "@/lib/account";
import type { OwnMural } from "@/lib/auth";
import { getPublicMural, muralUrl, type MuralStats } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AvatarUploader } from "../AvatarUploader";
import { OwnerPins } from "../board/OwnerPins";
import { PlanBadge } from "../board/PlanBadge";
import { PlansOverview } from "../PlansOverview";
import { MuralSettings } from "./MuralSettings";

export type DrawerSection = "pins" | "numbers" | "edit" | "share" | "photo" | "plans";

function Section({ id, title, badge, open, onToggle, children }: { id: DrawerSection; title: string; badge?: number; open: boolean; onToggle: (id: DrawerSection, open: boolean) => void; children: ReactNode }) {
  return (
    <details open={open} onToggle={(e) => onToggle(id, (e.currentTarget as HTMLDetailsElement).open)} className="rounded-2xl border border-[#e1d3ba] bg-white/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[15px] font-bold">
        <span>
          {title} {!!badge && <span className="ml-1 rounded-full bg-[#d98a2b] px-2 py-0.5 text-xs text-white">{badge}</span>}
        </span>
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-[#8a7b69]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="border-t border-[#e1d3ba] px-4 py-4">{open ? children : null}</div>
    </details>
  );
}

/**
 * Menu da conta (abre pelo ícone do cabeçalho): tudo o que antes ficava no painel — pins para aprovar, números,
 * editar o mural, compartilhar, foto, planos — e sair. Não existe mais uma página separada de painel.
 */
export function AccountDrawer({
  open,
  onClose,
  nick,
  murals,
  currentSlug,
  initial,
  onChanged,
  onDeleted,
  onSignOut,
  onPending,
  onNotify,
}: {
  open: boolean;
  onClose: () => void;
  nick: string;
  murals: OwnMural[];
  currentSlug?: string;
  initial?: DrawerSection;
  /** o mural foi editado: recarrega os dados da tela */
  onChanged: () => void;
  onDeleted: () => void;
  onSignOut: () => void;
  /** quantos pins aguardam aprovação (para o selo do menu) */
  onPending: (n: number) => void;
  onNotify: (msg: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const account = getAccount();
  const mural = murals.find((m) => m.slug === currentSlug) ?? murals[0];
  const [sections, setSections] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(0);
  const [stats, setStats] = useState<MuralStats | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // ao abrir: abre a seção pedida (ou a dos pins, se houver algo para aprovar)
  useEffect(() => {
    if (open) setSections(initial ? { [initial]: true } : {});
  }, [open, initial]);

  useEffect(() => {
    if (!open || !mural) return;
    void getPublicMural(getBrowserSupabase(), { nick, slug: mural.slug }).then((m) => setStats(m?.stats ?? null));
  }, [open, mural, nick]);

  const toggle = useCallback((id: DrawerSection, v: boolean) => setSections((s) => (s[id] === v ? s : { ...s, [id]: v })), []);
  const onCount = useCallback(
    (n: number) => {
      setPending(n);
      onPending(n);
    },
    [onPending],
  );

  async function copy() {
    if (!mural) return;
    try {
      await navigator.clipboard.writeText(`https://${muralUrl({ nick, slug: mural.slug })}`);
      onNotify("Link copiado ✓");
    } catch {
      onNotify("Não foi possível copiar. Copie o endereço acima.");
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Menu da conta"
      className="fixed inset-y-0 right-0 left-auto m-0 ml-auto h-dvh max-h-none w-[min(30rem,100vw)] max-w-none overflow-hidden rounded-none border-l border-[#e6d8bd] bg-[#fbf6ea] p-0 text-[#2f2218] shadow-[-1rem_0_4rem_rgba(0,0,0,.45)] backdrop:bg-black/50 sm:rounded-l-3xl"
    >
      {open && (
        <div className="flex h-dvh flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-[#e6d8bd] px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Sua conta</p>
              <p className="font-title truncate text-xl font-semibold">{nick}</p>
              {mural && <p className="mt-0.5 truncate text-sm text-[#6b5440]">{muralUrl({ nick, slug: mural.slug })}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar menu" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-2xl hover:bg-black/5">
              ×
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {mural ? (
              <>
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <strong className="font-title text-base">{mural.title}</strong>
                  <PlanBadge plan={mural.plan} />
                  <span className="text-[#6b5440]">{mural.question ? "🔒 Privado" : "🌐 Público"}</span>
                </p>

                <Section id="pins" title="Pins para aprovar" badge={pending} open={!!sections.pins} onToggle={toggle}>
                  <OwnerPins muralId={mural.id} plan={mural.plan} onCount={onCount} />
                </Section>

                <Section id="numbers" title="Números do mural" open={!!sections.numbers} onToggle={toggle}>
                  <dl className="grid grid-cols-4 gap-2 text-center">
                    {(
                      [
                        ["visitaram", stats?.visited],
                        ["tentaram", stats?.tried],
                        ["acertaram", stats?.correct],
                        ["mensagens", stats?.messages],
                      ] as const
                    ).map(([label, v]) => (
                      <div key={label} className="rounded-xl bg-[#f1e7d2]/70 px-1 py-2">
                        <dd className="text-lg font-semibold">{v ?? "–"}</dd>
                        <dt className="text-[11px] text-[#6b5440]">{label}</dt>
                      </div>
                    ))}
                  </dl>
                </Section>

                <Section id="edit" title="Editar mural" open={!!sections.edit} onToggle={toggle}>
                  <MuralSettings mural={mural} onSaved={onChanged} onDeleted={onDeleted} />
                </Section>

                <Section id="share" title="Compartilhar" open={!!sections.share} onToggle={toggle}>
                  <p className="rounded-xl border border-[#e1d3ba] bg-white/70 px-3 py-2 text-sm break-all">{muralUrl({ nick, slug: mural.slug })}</p>
                  <button type="button" onClick={copy} className="mt-3 w-full cursor-pointer rounded-xl bg-[#1f232b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c313b]">
                    Copiar link
                  </button>
                </Section>
              </>
            ) : (
              <p className="rounded-xl border border-[#e1d3ba] bg-white/60 px-4 py-3 text-sm text-[#6b5440]">Você ainda não tem um mural.</p>
            )}

            <Section id="photo" title="Foto de perfil" open={!!sections.photo} onToggle={toggle}>
              <AvatarUploader nickname={nick} />
            </Section>

            <Section id="plans" title="Planos" open={!!sections.plans} onToggle={toggle}>
              <PlansOverview account={account} />
            </Section>
          </div>

          <footer className="border-t border-[#e6d8bd] px-5 py-3">
            <button type="button" onClick={onSignOut} className="w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#6b2a1c] transition hover:bg-white">
              Sair da conta
            </button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
