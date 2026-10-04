"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanId } from "@/lib/plans";
import { listOwnerPins, moderatePin, reportPin, setPinHidden } from "@/lib/pins";
import { formatInfo } from "@/lib/types";
import { getBrowserSupabase } from "@/lib/supabase";
import { REPORT_REASONS, type OwnerPin, type ReportReason } from "../board/PinsManager";
import { MessageView } from "../messages/MessageView";
import { Carousel } from "./Carousel";
import { Modal } from "./Modal";

const btn = "cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-45";
const primary = "cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-2.5 text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-45";

function ReportBox({ onSend, onCancel }: { onSend: (r: { reason: ReportReason; details: string; block: boolean }) => void; onCancel: () => void }) {
  const [reason, setReason] = useState<ReportReason>("ofensa");
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  return (
    <form
      className="mt-3 space-y-2 rounded-xl border border-[#e0b0a8] bg-[#fff4f1] p-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        onSend({ reason, details: details.trim(), block });
      }}
    >
      <p className="text-sm font-semibold">Relatar abuso ou assédio</p>
      <p className="text-xs text-[#6b5440]">O pin é guardado como prova, sai do mural e o espaço fica livre.</p>
      <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} aria-label="Motivo" className="w-full rounded-lg border border-[#d9c9ad] bg-white px-2 py-2 text-sm">
        {REPORT_REASONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} rows={2} placeholder="O que aconteceu? (opcional)" className="w-full rounded-lg border border-[#d9c9ad] bg-white px-2 py-2 text-sm" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="mt-1 size-4" />
        <span>Bloquear quem enviou</span>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="cursor-pointer rounded-lg bg-[#a23b2a] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#8c3022]">
          Relatar e remover
        </button>
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg border border-[#d9c9ad] px-3 py-1.5 text-sm font-semibold">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Pins do mural em carrossel: "Para aprovar" (um por vez, com aprovar/recusar) e "No mural" (segredo no FULL, remover). */
export function PinsModal({ open, onClose, muralId, plan, onPending }: { open: boolean; onClose: () => void; muralId: string; plan: PlanId; onPending: (n: number) => void }) {
  const [pins, setPins] = useState<OwnerPin[] | null>(null);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const full = plan === "full";

  const load = useCallback(async () => {
    const list = await listOwnerPins(getBrowserSupabase(), muralId);
    if (!list) return setError("Não foi possível carregar os pins agora.");
    setPins(list);
    onPending(list.filter((p) => p.status === "pending").length);
  }, [muralId, onPending]);

  useEffect(() => {
    if (open) {
      setError(null);
      setReporting(null);
      setTab("pending");
      void load();
    }
  }, [open, load]);

  const pending = (pins ?? []).filter((p) => p.status === "pending");
  const approved = (pins ?? []).filter((p) => p.status === "approved");
  // sem nada para aprovar: mostra os que já estão no mural
  useEffect(() => {
    if (pins && tab === "pending" && pending.length === 0 && approved.length > 0) setTab("approved");
  }, [pins, tab, pending.length, approved.length]);

  async function run(id: string, action: () => Promise<boolean>) {
    setBusy(id);
    setError(null);
    setReporting(null);
    if (!(await action())) setError("Não foi possível concluir. Tente de novo.");
    await load();
    setBusy(null);
  }
  const sb = getBrowserSupabase();
  const list = tab === "pending" ? pending : approved;

  const card = (p: OwnerPin) => (
    <div className="text-center">
      <div className="grid min-h-[15rem] place-items-center py-3 text-[min(21px,5vw)]">
        <MessageView message={{ ...p, pending: false, ownerHidden: false, ownerReview: false }} />
      </div>
      <p className="mt-2 text-sm font-semibold">
        {formatInfo[p.type].label} <span className="font-normal text-[#6b5440]">· espaço {(p.slot ?? 0) + 1}</span>
        {p.signedBy && <span className="font-normal text-[#6b5440]"> · assinado por {p.signedBy}</span>}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {tab === "pending" ? (
          <>
            <button type="button" className={btn} disabled={busy === p.id} onClick={() => run(p.id, () => moderatePin(sb, p.id, false))}>
              Recusar
            </button>
            {full && (
              <button type="button" className={btn} disabled={busy === p.id} title="Aprova e deixa em segredo (os visitantes veem o pin borrado)" onClick={() => run(p.id, () => moderatePin(sb, p.id, true, true))}>
                Aprovar como segredo
              </button>
            )}
            <button type="button" className={primary} disabled={busy === p.id} onClick={() => run(p.id, () => moderatePin(sb, p.id, true, false))}>
              Aprovar
            </button>
          </>
        ) : (
          <>
            {full && (
              <button type="button" role="switch" aria-checked={!p.hiddenFromVisitors} className={btn} disabled={busy === p.id} onClick={() => run(p.id, () => setPinHidden(sb, p.id, !p.hiddenFromVisitors))}>
                {p.hiddenFromVisitors ? "🔒 Segredo — mostrar" : "👁 Visível — deixar em segredo"}
              </button>
            )}
            <button type="button" className={btn} disabled={busy === p.id} onClick={() => run(p.id, () => moderatePin(sb, p.id, false))}>
              Remover
            </button>
          </>
        )}
        <button type="button" className={`${btn} !border-[#c0463a]/50 !text-[#a23b2a]`} disabled={busy === p.id} onClick={() => setReporting(reporting === p.id ? null : p.id)}>
          🚩 Relatar abuso
        </button>
      </div>
      {reporting === p.id && <ReportBox onCancel={() => setReporting(null)} onSend={(r) => run(p.id, () => reportPin(sb, p.id, r.reason, r.details, r.block))} />}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Pins do mural" wide>
      <div role="tablist" aria-label="Pins" className="mb-4 grid grid-cols-2 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {(
          [
            ["pending", `Para aprovar (${pending.length})`],
            ["approved", `No mural (${approved.length})`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-[#a23b2a]">
          {error}
        </p>
      )}
      {!pins ? (
        <p className="text-sm text-[#6b5440]">Carregando pins…</p>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6b5440]">{tab === "pending" ? "Nenhum pin aguardando. Quando alguém colar um, ele aparece aqui." : "Ainda não há pins aprovados no mural."}</p>
      ) : (
        <>
          {tab === "pending" && <p className="mb-3 text-center text-xs text-[#6b5440]">Nada aparece no mural antes de você aprovar. Confira se não há informação sigilosa ou ofensiva.</p>}
          <Carousel label={tab === "pending" ? "Pins para aprovar" : "Pins no mural"}>
            {list.map((p) => (
              <div key={p.id}>{card(p)}</div>
            ))}
          </Carousel>
        </>
      )}
    </Modal>
  );
}
