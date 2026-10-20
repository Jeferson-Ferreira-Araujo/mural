"use client";

import { useCallback, useEffect, useState } from "react";
import { claimReward, getRewards, type RewardId, type RewardTask } from "@/lib/rewards";
import { Modal } from "./Modal";
import { ListSkeleton } from "../Skeleton";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

function Coin({ className = "size-5" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/img/moeda.webp" alt="" aria-hidden draggable={false} className={`shrink-0 select-none object-contain ${className}`} />;
}

/** Tarefas que dão créditos: cada uma vale uma vez por conta e o crédito entra na hora em que ela é feita. */
export function RewardsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tl = useLit();
  const tx = useTranslations("components.account.RewardsModal");
  const [tasks, setTasks] = useState<RewardTask[] | null>(null);

  const load = useCallback(async () => {
    let list = await getRewards();
    if (!list) return setTasks([]);
    // quem já tinha feito alguma antes de o sistema existir recebe agora
    const ready = list.filter((t) => t.ready);
    if (ready.length) {
      for (const t of ready) await claimReward(t.id as RewardId);
      list = (await getRewards()) ?? list;
    }
    setTasks(list);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTasks(null);
    void load();
  }, [open, load]);

  return (
    <Modal open={open} onClose={onClose} title={tx("ganheCreditos")}>
      {tasks === null ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <p className="text-[15px] leading-snug text-[#4a3826]">{tx("facaAsTarefasEGanhe")}</p>
          <ul className="mt-3 space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${t.done ? "border-[#bfe0c7] bg-[#eef8f0]" : "border-[#e1d3ba] bg-white/70"}`}>
                <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-full text-base font-bold ${t.done ? "bg-[#3aa655] text-white" : "border-2 border-[#d9c9ad] text-transparent"}`}>
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] leading-tight font-bold ${t.done ? "text-[#2f6a3c]" : ""}`}>{tl(t.title)}</span>
                  <span className="block text-xs text-[#6b5440]">{t.done ? tl("Ganho") : tl(t.hint)}</span>
                </span>
                <span className={`flex shrink-0 items-center gap-1 text-sm font-bold ${t.done ? "text-[#2f6a3c]" : ""}`} aria-label={tx("m_credito", { v0: t.credits, v1: t.credits > 1 ? "s" : "" })}>
                  <Coin className="size-5" />+{t.credits}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
