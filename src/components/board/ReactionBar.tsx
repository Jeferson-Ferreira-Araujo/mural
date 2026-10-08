"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { fetchReactions, reactTo, REACTIONS, type ReactionKey, type ReactionSummary } from "@/lib/reactions";

/** Reações do pin, no destaque: uma por pessoa; tocar na mesma tira, tocar em outra troca. */
export function ReactionBar({ messageId, token }: { messageId: string; token: string | null }) {
  const [sum, setSum] = useState<ReactionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSum(null);
    setFailed(false);
    void fetchReactions(getBrowserSupabase(), messageId, token).then((s) => {
      if (!alive) return;
      if (s) setSum(s);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [messageId, token]);

  async function pick(key: ReactionKey) {
    if (busy || !sum) return;
    setBusy(true);
    const next = await reactTo(getBrowserSupabase(), messageId, token, sum.mine === key ? null : key);
    setBusy(false);
    if (next) setSum(next);
    else setFailed(true);
  }

  if (failed) return null; // sem acesso a este pin (ou erro): nada de reações
  return (
    <div role="group" aria-label="Reagir a este pin" className="flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1.5 shadow-[0_0.2rem_0.7rem_rgba(0,0,0,.4)] backdrop-blur">
      {REACTIONS.map((r) => {
        const n = sum?.counts[r.key] ?? 0;
        const mine = sum?.mine === r.key;
        return (
          <button
            key={r.key}
            type="button"
            disabled={!sum || busy}
            aria-pressed={mine}
            aria-label={`${r.label}${n ? `, ${n}` : ""}`}
            title={r.label}
            onClick={() => void pick(r.key)}
            className={`flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-lg leading-none transition active:scale-90 disabled:cursor-default ${mine ? "bg-[#f4c542]/90 text-[#2a1c12] ring-2 ring-[#f4c542]" : "text-white hover:bg-white/15"}`}
          >
            <span aria-hidden>{r.emoji}</span>
            {n > 0 && <span className="text-xs font-bold tabular-nums">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
