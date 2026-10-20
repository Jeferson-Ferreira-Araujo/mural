"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanId } from "@/lib/plans";
import { listArchivedPins, listOwnerPins, moderatePin, reportPin, restoreArchivedPin, setMuralPinTtl, setPinHidden, type ArchivedPin } from "@/lib/pins";
import { formatInfo } from "@/lib/types";
import { getBrowserSupabase } from "@/lib/supabase";
import { REPORT_REASONS, type OwnerPin, type ReportReason } from "../board/PinsManager";
import { MessageView } from "../messages/MessageView";
import { Carousel } from "./Carousel";
import { Modal } from "./Modal";
import { CardSkeleton } from "../Skeleton";
import { useTranslations } from "next-intl";

const btn = "cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-45";
const primary = "cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-2.5 text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-45";

export function ReportBox({ onSend, onCancel, inModal = false }: { onSend: (r: { reason: ReportReason; details: string; block: boolean }) => void; onCancel: () => void; /** dentro de uma janela própria: sem moldura nem título */ inModal?: boolean }) {
  const tx = useTranslations("components.account.PinsModal");
  const [reason, setReason] = useState<ReportReason>("ofensa");
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  return (
    <form
      className={inModal ? "space-y-3 text-left text-[#2f2218]" : "mt-3 space-y-2 rounded-xl border border-[#e0b0a8] bg-[#fff4f1] p-3 text-left text-[#2f2218]"}
      onSubmit={(e) => {
        e.preventDefault();
        onSend({ reason, details: details.trim(), block });
      }}
    >
      {!inModal && <p className="text-sm font-semibold">{tx("denunciar")}</p>}
      <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} aria-label={tx("motivo")} className="w-full rounded-lg border border-[#d9c9ad] bg-white px-2 py-2 text-sm">
        {REPORT_REASONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} rows={inModal ? 4 : 2} placeholder={tx("oQueAconteceuOpcional")} className="w-full rounded-lg border border-[#d9c9ad] bg-white px-2 py-2 text-sm" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="mt-1 size-4" />
        <span>{tx("bloquearQuemEnviou")}</span>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="cursor-pointer rounded-lg bg-[#a23b2a] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#8c3022]">
          {tx("denunciar")}</button>
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg border border-[#d9c9ad] px-3 py-1.5 text-sm font-semibold">
          {tx("cancelar")}</button>
      </div>
    </form>
  );
}

/**
 * Meus pins, em duas abas: Aprovações (os pins que esperam aprovação, em carrossel, com aprovar, excluir e denunciar) e Pins
 * (os que passaram do prazo de validade do mural e saíram dele: dá para colocar de volta).
 */
export function PinsModal({ open, onClose, muralId, plan, onPending, onRestored, startSection = "approvals", ttlDays = null, onTtlSaved }: { /** validade atual dos pins de outras pessoas neste mural (null = sem prazo) */ ttlDays?: 7 | 15 | 30 | null; /** a validade mudou aqui: atualiza os dados do mural */ onTtlSaved?: () => void; /** aba com que abre */ startSection?: "approvals" | "archived"; open: boolean; onClose: () => void; muralId: string; plan: PlanId; onPending: (n: number) => void; /** um pin guardado voltou ao mural */ onRestored?: () => void }) {
  const tx = useTranslations("components.account.PinsModal");
  const [section, setSection] = useState<"approvals" | "archived">("approvals");
  const [archived, setArchived] = useState<ArchivedPin[] | null>(null);
  const [archNote, setArchNote] = useState<{ ok: boolean; text: string } | null>(null);
  // primeira aprovação neste mural: antes de aprovar, explica a validade dos pins de outras pessoas e deixa escolher (7 dias, 30 dias ou nunca apagar)
  const askedKey = `pinz:ttl-asked:${muralId}`;
  const [ask, setAsk] = useState<{ id: string; secret: boolean } | null>(null);
  const [choice, setChoice] = useState<7 | 30 | null>(null); // padrão: não apagar
  const needAsk = () => {
    if (ttlDays) return false;
    try {
      return !localStorage.getItem(askedKey);
    } catch {
      return false;
    }
  };
  async function approve(id: string, secret: boolean) {
    if (needAsk()) return setAsk({ id, secret });
    await run(id, () => moderatePin(getBrowserSupabase(), id, true, secret));
  }
  async function confirmAsk() {
    if (!ask) return;
    const a = ask;
    setBusy(a.id);
    const ok = await setMuralPinTtl(getBrowserSupabase(), muralId, choice);
    setBusy(null);
    if (!ok) return setError("Não foi possível salvar a validade agora. Tente de novo.");
    try {
      localStorage.setItem(askedKey, "1");
    } catch {}
    setAsk(null);
    onTtlSaved?.();
    await run(a.id, () => moderatePin(getBrowserSupabase(), a.id, true, a.secret));
  }
  const [pins, setPins] = useState<OwnerPin[] | null>(null);
  const tab = "pending" as const; // esta tela mostra só o que espera aprovação
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
      setSection(startSection);
      setArchNote(null);
      void load();
      void listArchivedPins(getBrowserSupabase(), muralId).then((l) => setArchived(l ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, load, muralId]);

  async function restore(id: string) {
    setBusy(id);
    setArchNote(null);
    const res = await restoreArchivedPin(getBrowserSupabase(), id);
    const title = archived?.find((p) => p.id === id)?.mural_title ?? "";
    if (res.ok) {
      setArchived((l) => (l ?? []).filter((p) => p.id !== id));
      onRestored?.();
      setArchNote({ ok: true, text: res.samePlace ? `Pin colocado de volta no mural “${res.muralTitle}”, no mesmo lugar de antes (espaço ${res.slot + 1}).` : `O espaço ${(res.originalSlot ?? 0) + 1} já estava ocupado. O pin foi colocado no mural “${res.muralTitle}”, no espaço ${res.slot + 1}.` });
    } else
      setArchNote({
        ok: false,
        text:
          res.reason === "no_space"
            ? `O pin não pode ser colocado de volta porque o mural “${title}” está cheio: não há nenhum espaço livre.`
            : res.reason === "plan_limit"
              ? `O pin não pode ser colocado de volta porque o mural “${title}” chegou ao limite de pins do plano.`
              : "Não foi possível colocar de volta agora. Tente de novo.",
      });
    setBusy(null);
  }

  const pending = (pins ?? []).filter((p) => p.status === "pending");
  async function run(id: string, action: () => Promise<boolean>) {
    setBusy(id);
    setError(null);
    setReporting(null);
    if (!(await action())) setError("Não foi possível concluir. Tente de novo.");
    await load();
    setBusy(null);
  }
  const sb = getBrowserSupabase();
  const list = pending;

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
              {tx("excluir")}</button>
            {full && (
              <button type="button" className={btn} disabled={busy === p.id} title={tx("aprovaEDeixaEmSegredo")} onClick={() => void approve(p.id, true)}>
                {tx("aprovarComoSegredo")}</button>
            )}
            <button type="button" className={primary} disabled={busy === p.id} onClick={() => void approve(p.id, false)}>
              {tx("aprovar")}</button>
          </>
        ) : (
          <>
            {full && (
              <button type="button" role="switch" aria-checked={!p.hiddenFromVisitors} className={btn} disabled={busy === p.id} onClick={() => run(p.id, () => setPinHidden(sb, p.id, !p.hiddenFromVisitors))}>
                {p.hiddenFromVisitors ? "🔒 Segredo — mostrar" : "👁 Visível — deixar em segredo"}
              </button>
            )}
            <button type="button" className={btn} disabled={busy === p.id} onClick={() => run(p.id, () => moderatePin(sb, p.id, false))}>
              {tx("remover")}</button>
          </>
        )}
        <button type="button" className={`${btn} !border-[#c0463a]/50 !text-[#a23b2a]`} disabled={busy === p.id} onClick={() => setReporting(reporting === p.id ? null : p.id)}>
          {tx("denunciar2")}</button>
      </div>
      {reporting === p.id && <ReportBox onCancel={() => setReporting(null)} onSend={(r) => run(p.id, () => reportPin(sb, p.id, r.reason, r.details, r.block))} />}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={tx("meusPins")} wide>
      <div role="tablist" aria-label={tx("meusPins")} className="mb-3 flex gap-1 rounded-xl bg-[#e9dcc3]/70 p-1">
        {(
          [
            ["approvals", "Aprovações", pending.length],
            ["archived", "Arquivados", archived?.length ?? null],
          ] as const
        ).map(([id, label, n]) => (
          <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)} className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-bold transition ${section === id ? "bg-white text-[#2a1c12] shadow-[0_0.1rem_0.4rem_rgba(60,35,10,.2)]" : "text-[#6b5440] hover:text-[#2a1c12]"}`}>
            {label}
            {n ? <span className="ml-1.5 font-semibold text-[#8a7b69]">{n}</span> : null}
          </button>
        ))}
      </div>
      {ask && (
        <div role="dialog" aria-label={tx("tempoDeExibicaoDosPinz")} className="mb-4 rounded-2xl border border-[#ecd9a0] bg-[#fff6dd] p-4 text-[#2f2218]">
          <p className="font-title text-lg font-semibold">{tx("porQuantoTempoOsPins")}</p>
          <p className="mt-1 text-sm text-[#4a3826]">{tx("osPinsQueOutrasPessoas")}</p>
          <div role="radiogroup" aria-label={tx("validade")} className="mt-3 space-y-2">
            {(
              [
                [7, "7 dias"],
                [30, "30 dias"],
                [null, "Não apagar: os pins ficam para sempre"],
              ] as const
            ).map(([v, label]) => (
              <label key={String(v)} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold ${choice === v ? "border-[#d9a21b] bg-white" : "border-[#e1d3ba] bg-white/60"}`}>
                <input type="radio" name="ttl" checked={choice === v} onChange={() => setChoice(v)} className="size-4 accent-[#d98a2b]" />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={`${btn} flex-1`} onClick={() => setAsk(null)}>
              {tx("voltar")}</button>
            <button type="button" className={`${primary} flex-1`} disabled={busy === ask.id} onClick={() => void confirmAsk()}>
              {tx("salvarEAprovar")}</button>
          </div>
        </div>
      )}
      {section === "archived" ? (
        <>
          {archNote && (
            <p role={archNote.ok ? "status" : "alert"} className={`mb-3 rounded-xl border px-3 py-2 text-sm ${archNote.ok ? "border-[#cfe6d3] bg-[#f1faf2] text-[#1f4d2b]" : "border-[#e3b3a8] bg-[#fbeae5] text-[#a23b2a]"}`}>
              {archNote.text}
            </p>
          )}
          {!archived ? (
            <CardSkeleton label={tx("carregandoOsPins")} />
          ) : archived.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6b5440]">{tx("nenhumPinArquivadoQuandoAlgum")}</p>
          ) : (
            <Carousel label={tx("pinsArquivados")}>
              {archived.map((a) => (
                <div key={a.id} className="text-center">
                  <div className="grid min-h-[15rem] place-items-center py-3 text-[min(21px,5vw)]">
                    <MessageView message={{ ...(a.content as object), id: a.id, type: a.type, slot: 0, pending: false, ownerHidden: false, ownerReview: false, signedBy: a.author ?? undefined } as never} />
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {formatInfo[a.type as keyof typeof formatInfo]?.label ?? a.type}
                    {a.author && <span className="font-normal text-[#6b5440]"> · de @{a.author}</span>}
                  </p>
                  <p className="text-xs text-[#6b5440]">
                    Mural “{a.mural_title}”{a.slot != null ? ` · estava no espaço ${a.slot + 1}` : ""} · saiu em {new Date(a.archived_at).toLocaleDateString("pt-BR")}
                  </p>
                  <div className="mt-3 flex justify-center">
                    <button type="button" className={primary} disabled={busy === a.id} onClick={() => void restore(a.id)}>
                      {busy === a.id ? "Colocando…" : "Colocar de volta no mural"}
                    </button>
                  </div>
                </div>
              ))}
            </Carousel>
          )}
        </>
      ) : (
        <>
      {error && (
        <p role="alert" className="mb-3 text-sm text-[#a23b2a]">
          {error}
        </p>
      )}
      {!pins ? (
        <CardSkeleton label={tx("carregandoOsPins")} />
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6b5440]">{tx("nenhumPinAguardandoAprovacaoNo")}</p>
      ) : (
        <>
          {tab === "pending" && (
            <p className="mb-3 text-center text-xs text-[#6b5440]">
              Nada aparece no mural antes de você aprovar. Confira se não há informação sigilosa ou ofensiva.
              <br />
              Tempo de exibição dos pinz: <strong>{ttlDays ? `${ttlDays} dias` : "sem prazo (ficam para sempre)"}</strong>. Quem passa do prazo vai para Arquivados; mude em Editar mural.
            </p>
          )}
          <Carousel label={tab === "pending" ? "Pins para aprovar" : "Pins no mural"}>
            {list.map((p) => (
              <div key={p.id}>{card(p)}</div>
            ))}
          </Carousel>
        </>
      )}
        </>
      )}
    </Modal>
  );
}
