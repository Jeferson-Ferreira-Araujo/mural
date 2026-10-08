"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { reactTo, REACTIONS, type ReactionKey } from "@/lib/reactions";

/** Reações do dono do mural, no destaque do pin: uma por pin; tocar na mesma tira, tocar em outra troca. O emoji fica no canto do pin para todos. */
export function ReactionBar({ messageId, current, onChanged }: { messageId: string; current?: string; onChanged: () => void }) {
  const [mine, setMine] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setMine(current ?? null);
  }, [messageId, current]);

  async function pick(key: ReactionKey) {
    if (busy) return;
    setBusy(true);
    const next = mine === key ? null : key;
    const res = await reactTo(getBrowserSupabase(), messageId, null, next);
    setBusy(false);
    if (!res) return setFailed(true);
    setMine(res.mine);
    onChanged();
  }

  if (failed) return <p className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">Não foi possível reagir agora.</p>;
  return (
    <div role="group" aria-label="Reagir a este pin" className="flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1.5 shadow-[0_0.2rem_0.7rem_rgba(0,0,0,.4)] backdrop-blur">
      {REACTIONS.map((r) => {
        const on = mine === r.key;
        return (
          <button
            key={r.key}
            type="button"
            disabled={busy}
            aria-pressed={on}
            aria-label={r.label}
            title={r.label}
            onClick={() => void pick(r.key)}
            className={`cursor-pointer rounded-full px-2 py-1 text-xl leading-none transition active:scale-90 disabled:cursor-default ${on ? "bg-[#f4c542]/90 ring-2 ring-[#f4c542]" : "hover:bg-white/15"}`}
          >
            <span aria-hidden>{r.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
