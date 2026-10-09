"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/plans";
import { formatInfo, type Message } from "@/lib/types";
import { MessageView } from "../messages/MessageView";

/** Pin como o dono o vê: com conteúdo, estado de aprovação e se está em blur para os visitantes. */
export type OwnerPin = Message & { status: "pending" | "approved"; hiddenFromVisitors: boolean };

export type ReportReason = "ofensa" | "assedio" | "sexual" | "outro";
export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "ofensa", label: "Ofensa ou baixo calão" },
  { id: "assedio", label: "Assédio ou ameaça" },
  { id: "sexual", label: "Conteúdo sexual" },
  { id: "outro", label: "Outro abuso" },
];

type Props = {
  pins: OwnerPin[];
  plan: PlanId;
  /** pin com uma ação em andamento */
  busyId?: string | null;
  onApprove: (id: string, hidden: boolean) => void;
  onReject: (id: string) => void;
  onSetHidden: (id: string, hidden: boolean) => void;
  /** relata o pin (guarda a prova, remove do mural e, se marcado, bloqueia quem enviou) */
  onReport: (id: string, report: { reason: ReportReason; details: string; block: boolean }) => void;
  tone?: "light" | "dark";
};

/**
 * Moderação do dono: aprova ou recusa os pins novos (nada aparece no mural antes disso) e, no PINZ+,
 * escolhe pin por pin o que fica visível e o que fica em blur para quem visita.
 */
export function PinsManager({ pins, plan, busyId = null, onApprove, onReject, onSetHidden, onReport, tone = "light" }: Props) {
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState<ReportReason>("ofensa");
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const dark = tone === "dark";
  const pending = pins.filter((p) => p.status === "pending");
  const approved = pins.filter((p) => p.status === "approved");
  const full = plan === "full";
  const btn = `cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${dark ? "border-white/20 text-white hover:bg-white/10" : "border-[#d9c9ad] text-[#4a3826] hover:bg-[#efe4cf]"}`;
  const primary = "cursor-pointer rounded-lg bg-[#1f232b] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#2f3540] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  const muted = dark ? "text-white/65" : "text-[#6b5440]";

  const Row = ({ p, children }: { p: OwnerPin; children: React.ReactNode }) => (
    <li className={`flex gap-3 rounded-xl border p-3 ${dark ? "border-white/15 bg-white/5" : "border-[#e1d3ba] bg-white/70"}`}>
      {/* o pin em miniatura (só para reconhecer; sem interação) */}
      <div className="w-[7.6rem] shrink-0 overflow-hidden pt-2 text-[7px]" aria-hidden>
        <div inert className="pointer-events-none origin-top-left" style={{ width: "14em" }}>
          <MessageView message={{ ...p, pending: false, ownerHidden: false }} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {formatInfo[p.type].label} <span className={`font-normal ${muted}`}>· espaço {(p.slot ?? 0) + 1}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {children}
          <button
            type="button"
            className={`${btn} !border-[#c0463a]/50 !text-[#a23b2a] ${dark ? "!text-[#ff9b8f]" : ""}`}
            disabled={busyId === p.id}
            aria-expanded={reporting === p.id}
            onClick={() => {
              setReporting(reporting === p.id ? null : p.id);
              setReason("ofensa");
              setDetails("");
              setBlock(true);
            }}
          >
            🚩 Denunciar
          </button>
        </div>
        {reporting === p.id && (
          <form
            className={`mt-3 space-y-2 rounded-xl border p-3 ${dark ? "border-[#ff9b8f]/40 bg-black/20" : "border-[#e0b0a8] bg-[#fff4f1]"}`}
            onSubmit={(e) => {
              e.preventDefault();
              onReport(p.id, { reason, details: details.trim(), block });
              setReporting(null);
            }}
          >
            <p className="text-sm font-semibold">Denunciar</p>
            <label className="block text-sm">
              Motivo
              <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} className="mt-1 w-full rounded-lg border border-[#d9c9ad] bg-white px-2 py-2 text-sm text-[#2f2218]">
                {REPORT_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              O que aconteceu? (opcional)
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-[#d9c9ad] bg-white px-2 py-2 text-sm text-[#2f2218]" />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="mt-1 size-4" />
              <span>Bloquear quem enviou (não poderá mais colar pins neste mural)</span>
            </label>
            <div className="flex gap-2">
              <button type="submit" className="cursor-pointer rounded-lg bg-[#a23b2a] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#8c3022]">
                Denunciar
              </button>
              <button type="button" className={btn} onClick={() => setReporting(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </li>
  );

  if (pins.length === 0) return <p className={`text-sm ${muted}`}>Nenhum pin ainda. Quando alguém colar um, ele aparece aqui para você aprovar.</p>;

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <section aria-label="Pins aguardando aprovação">
          <h3 className="text-sm font-bold">
            Aguardando sua aprovação <span className="rounded-md bg-[#d98a2b] px-2 py-0.5 text-xs text-white">{pending.length}</span>
          </h3>
          <p className={`mt-1 text-xs ${muted}`}>Nada aparece no mural antes de você aprovar. Confira se não há informação sigilosa ou ofensiva.</p>
          <ul className="mt-3 space-y-2">
            {pending.map((p) => (
              <Row key={p.id} p={p}>
                <button type="button" className={primary} disabled={busyId === p.id} onClick={() => onApprove(p.id, false)}>
                  Aprovar
                </button>
                <button type="button" className={btn} disabled={busyId === p.id || !full} title={full ? "Aprova e deixa em blur para quem visita" : "Disponível no PINZ+"} onClick={() => onApprove(p.id, true)}>
                  {full ? "Aprovar em blur" : "🔒 Aprovar em blur (PINZ+)"}
                </button>
                <button type="button" className={btn} disabled={busyId === p.id} onClick={() => onReject(p.id)}>
                  Recusar
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {approved.length > 0 && (
        <section aria-label="Pins no mural">
          <h3 className="text-sm font-bold">No mural ({approved.length})</h3>
          <p className={`mt-1 text-xs ${muted}`}>{full ? "Escolha quais ficam visíveis e quais ficam em blur para quem visita. Os em blur continuam ocupando o espaço, e o conteúdo não é enviado." : "No PINZ+ você escolhe quais pins ficam em blur para os visitantes."}</p>
          <ul className="mt-3 space-y-2">
            {approved.map((p) => (
              <Row key={p.id} p={p}>
                {full ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!p.hiddenFromVisitors}
                    disabled={busyId === p.id}
                    onClick={() => onSetHidden(p.id, !p.hiddenFromVisitors)}
                    className={btn}
                  >
                    {p.hiddenFromVisitors ? "🔒 Em blur — mostrar" : "👁 Visível — deixar em blur"}
                  </button>
                ) : (
                  <span className={`self-center text-xs ${muted}`}>👁 Visível para os visitantes</span>
                )}
                <button type="button" className={btn} disabled={busyId === p.id} onClick={() => onReject(p.id)}>
                  Remover
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
