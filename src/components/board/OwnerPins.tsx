"use client";

import { useCallback, useEffect, useState } from "react";
import { listOwnerPins, moderatePin, reportPin, setPinHidden } from "@/lib/pins";
import type { PlanId } from "@/lib/plans";
import { getBrowserSupabase } from "@/lib/supabase";
import { PinsManager, type OwnerPin } from "./PinsManager";

/** Pins de um mural do dono (do banco): aprovar/recusar e escolher o que fica em blur (FULL). */
export function OwnerPins({ muralId, plan, onCount }: { muralId: string; plan: PlanId; /** avisa quantos aguardam aprovação */ onCount?: (pending: number) => void }) {
  const [pins, setPins] = useState<OwnerPin[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listOwnerPins(getBrowserSupabase(), muralId);
    if (list) {
      setPins(list);
      onCount?.(list.filter((p) => p.status === "pending").length);
    } else setError("Não foi possível carregar os pins agora.");
  }, [muralId, onCount]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(id: string, action: () => Promise<boolean>) {
    setBusy(id);
    setError(null);
    const ok = await action();
    if (!ok) setError("Não foi possível concluir. Tente de novo.");
    await load();
    setBusy(null);
  }

  if (!pins) return <p className="text-sm text-[#6b5440]">{error ?? "Carregando pins…"}</p>;
  const sb = getBrowserSupabase();

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-[#a23b2a]">
          {error}
        </p>
      )}
      <PinsManager
        pins={pins}
        plan={plan}
        busyId={busy}
        onApprove={(id, hidden) => run(id, () => moderatePin(sb, id, true, hidden))}
        onReject={(id) => run(id, () => moderatePin(sb, id, false))}
        onSetHidden={(id, hidden) => run(id, () => setPinHidden(sb, id, hidden))}
        onReport={(id, r) => run(id, () => reportPin(sb, id, r.reason, r.details, r.block))}
      />
    </div>
  );
}
