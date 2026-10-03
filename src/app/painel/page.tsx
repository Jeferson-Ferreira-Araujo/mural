"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccount } from "@/lib/account";
import { getOwnMurals, getOwnNickname, useSession, type OwnMural } from "@/lib/auth";
import { getPublicMural, muralPath, muralUrl, type MuralStats } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AvatarUploader } from "@/components/AvatarUploader";
import { OwnerPins } from "@/components/board/OwnerPins";
import { PlanBadge } from "@/components/board/PlanBadge";
import { SlotMeter } from "@/components/board/SlotMeter";
import { PLANS } from "@/lib/plans";
import { PlansOverview } from "@/components/PlansOverview";
import { AuthShell, ghostButton, primaryButton, Spinner } from "@/components/ui";

type Item = OwnMural & { stats: MuralStats | null };

export default function Painel() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [nick, setNick] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, number>>({}); // pins aguardando aprovação, por mural
  const account = getAccount();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/entrar");
      return;
    }
    const sb = getBrowserSupabase();
    (async () => {
      const [murals, n] = await Promise.all([getOwnMurals(sb), getOwnNickname(sb)]);
      if (murals.length === 0) return router.replace("/criar");
      setNick(n);
      const withStats = await Promise.all(
        murals.map(async (m) => ({ ...m, stats: n ? ((await getPublicMural(sb, { nick: n, slug: m.slug }))?.stats ?? null) : null })),
      );
      setItems(withStats);
    })();
  }, [loading, session, router]);

  async function copy(m: Item) {
    if (!nick) return;
    try {
      await navigator.clipboard.writeText(`https://${muralUrl({ nick, slug: m.slug })}`);
      setCopied(m.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* sem permissão de área de transferência */
    }
  }

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.replace("/");
  }

  if (loading || !items || !nick) {
    return (
      <AuthShell wide>
        <Spinner />
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-title text-2xl font-semibold">Meus murais</h1>
          <p className="mt-1 text-sm text-[#6b5440]">
            Seu nickname: <strong className="break-all">{nick}</strong>
          </p>
        </div>
        <button type="button" onClick={signOut} className="shrink-0 cursor-pointer text-sm font-semibold text-[#6b5440] underline">
          Sair
        </button>
      </div>

      <AvatarUploader nickname={nick} />

      <ul className="mt-6 space-y-4">
        {items.map((m) => (
          <li key={m.id} className="rounded-2xl border border-[#e1d3ba] bg-white/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-title min-w-0 text-xl leading-tight font-semibold break-words">{m.title}</h2>
              <PlanBadge plan={m.plan} />
            </div>
            <p className="mt-1 text-sm break-all text-[#6b5440]">{muralUrl({ nick, slug: m.slug })}</p>

            <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
              {(
                [
                  ["visitaram", m.stats?.visited],
                  ["tentaram", m.stats?.tried],
                  ["acertaram", m.stats?.correct],
                  ["mensagens", m.stats?.messages],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="rounded-xl bg-[#f1e7d2]/70 px-1 py-2">
                  <dd className="text-lg font-semibold">{v ?? "–"}</dd>
                  <dt className="text-[11px] text-[#6b5440]">{label}</dt>
                </div>
              ))}
            </dl>

            <SlotMeter plan={m.plan} used={m.stats?.messages ?? 0} className="mt-3 text-[14px]" />

            <details className="mt-4 rounded-xl border border-[#e1d3ba] bg-[#fbf6ea]/70 p-3" open={(pending[m.id] ?? 0) > 0}>
              <summary className="cursor-pointer text-sm font-bold">
                Pins do mural {(pending[m.id] ?? 0) > 0 && <span className="ml-1 rounded-full bg-[#d98a2b] px-2 py-0.5 text-xs text-white">{pending[m.id]} para aprovar</span>}
              </summary>
              <div className="mt-3">
                <OwnerPins muralId={m.id} plan={m.plan} onCount={(n) => setPending((s) => (s[m.id] === n ? s : { ...s, [m.id]: n }))} />
              </div>
            </details>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href={muralPath({ nick, slug: m.slug })} className={`${primaryButton} sm:flex-1`}>
                Ver mural
              </Link>
              <button type="button" onClick={() => copy(m)} className={`${ghostButton} sm:flex-1`}>
                {copied === m.id ? "Link copiado ✓" : "Copiar link"}
              </button>
              <Link href={`/painel/${m.id}`} className={`${ghostButton} sm:flex-1`}>
                Editar
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {items.length < PLANS[account.plan].murals ? (
        <Link href="/criar" className={`${primaryButton} mt-6`}>
          + Criar outro mural
        </Link>
      ) : (
        <p className="mt-6 rounded-xl border border-[#e1d3ba] bg-white/50 px-4 py-3 text-sm text-[#6b5440]">O plano gratuito inclui {PLANS.free.murals} mural. Mais murais chegam com créditos, em breve.</p>
      )}

      <PlansOverview account={account} />
    </AuthShell>
  );
}
