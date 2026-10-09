"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSharedMural, SHARED_ERROR_TEXT } from "@/lib/shared";
import { getProfileSummary, reportProfile, type ProfileReportReason, type ProfileSummary } from "@/lib/social";
import { getBrowserSupabase } from "@/lib/supabase";
import { Avatar } from "../Avatar";
import { ShareButton } from "../ShareButton";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";

const REASONS: { id: ProfileReportReason; label: string }[] = [
  { id: "ofensa", label: "Ofensa ou discurso de ódio" },
  { id: "assedio", label: "Assédio ou ameaça" },
  { id: "sexual", label: "Conteúdo sexual" },
  { id: "falso", label: "Perfil falso ou se passando por outra pessoa" },
  { id: "spam", label: "Spam ou golpe" },
  { id: "outro", label: "Outro motivo" },
];

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="flex-1 rounded-2xl border border-[#e1d3ba] bg-white/70 px-3 py-3 text-center">
    <strong className="font-title block text-2xl leading-none">{value}</strong>
    <span className="mt-1 block text-xs text-[#6b5440]">{label}</span>
  </div>
);

/**
 * Resumo do perfil (ao tocar na foto/nome de quem é o mural): foto maior, selo PINZ+, seguidores, visualizações,
 * compartilhar o perfil, pedir um mural compartilhado e denunciar. `showStats` = false (mural privado ainda trancado): só foto, nome e selo.
 */
export function ProfileSummaryModal({ open, onClose, nick, logged, viewerPlus, showStats, onNotify }: { open: boolean; onClose: () => void; nick: string; logged: boolean; /** quem está vendo tem o PINZ+ */ viewerPlus: boolean; showStats: boolean; onNotify: (m: string) => void }) {
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [view, setView] = useState<"summary" | "shared" | "report">("summary");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState<ProfileReportReason>("ofensa");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!open) return;
    setData(null);
    setView("summary");
    setErr(null);
    setTitle("");
    setPassword("");
    setDetails("");
    void getProfileSummary(getBrowserSupabase(), nick).then(setData);
  }, [open, nick]);

  const self = data?.self === true;

  async function sendShared(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await createSharedMural(getBrowserSupabase(), title.trim(), nick, password);
    setBusy(false);
    if (!res.ok) return setErr(SHARED_ERROR_TEXT[res.reason]);
    onNotify(`Convite enviado para @${nick}! O mural abre quando a pessoa aceitar.`);
    onClose();
  }

  async function sendReport(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const ok = await reportProfile(getBrowserSupabase(), nick, reason, details.trim());
    setBusy(false);
    if (!ok) return setErr("Não foi possível enviar a denúncia agora. Tente de novo.");
    onNotify("Denúncia enviada. Obrigado por avisar: nossa equipe vai analisar.");
    onClose();
  }

  const heading = view === "shared" ? "Mural compartilhado" : view === "report" ? "Denunciar perfil" : "Perfil";

  return (
    <Modal open={open} onClose={onClose} title={heading} label={heading} headerLeft={view !== "summary" ? <button type="button" onClick={() => (setView("summary"), setErr(null))} className="cursor-pointer text-sm font-semibold text-[#6b5440] underline">Voltar</button> : undefined}>
      {!data ? (
        <p className="py-8 text-center text-sm text-[#6b5440]">Carregando…</p>
      ) : view === "summary" ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar src={data.avatar} name={data.nickname} plus={data.plus} className="size-28" />
            <p className="font-title text-2xl font-semibold [overflow-wrap:anywhere]">@{data.nickname}</p>
            {data.plus && <span className="rounded-lg bg-gradient-to-r from-[#f2c230] to-[#e39a1c] px-3 py-1 text-xs font-bold tracking-wide text-[#3a2300] shadow-[0_0.15rem_0.5rem_rgba(150,90,0,.4)]">★ PINZ+</span>}
          </div>

          {showStats && (
            <div className="flex gap-2.5">
              {data.followers != null && <Stat value={data.followers.toLocaleString("pt-BR")} label={data.followers === 1 ? "seguidor" : "seguidores"} />}
              <Stat value={data.views.toLocaleString("pt-BR")} label={data.views === 1 ? "visualização nos murais" : "visualizações nos murais"} />
            </div>
          )}

          <div className="space-y-2">
            <ShareButton title={`Perfil de @${data.nickname} no Pinz`} text={`Veja o perfil de @${data.nickname} no Pinz!`} path={`/${data.nickname}`} onNotify={onNotify} className={`${ghostButton} w-full`} label="Compartilhar perfil" />
            {logged && !self && (
              <button type="button" onClick={() => (setErr(null), setView("shared"))} className={`${ghostButton} w-full`}>
                Solicitar mural compartilhado
              </button>
            )}
            {logged && !self && (
              <button type="button" onClick={() => (setErr(null), setView("report"))} className="w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-[#a23b2a] transition hover:bg-[#fbeae5]">
                Denunciar perfil
              </button>
            )}
          </div>
        </div>
      ) : view === "shared" ? (
        <form onSubmit={sendShared} noValidate className="space-y-4">
          <p className="text-sm text-[#4a3826]">
            Um mural só de vocês dois. Você define o nome e a senha e <strong>@{data.nickname}</strong> recebe o convite. Os dois precisam ter o PINZ+.
          </p>
          {!viewerPlus && <p className="rounded-xl border border-[#ecd9a0] bg-[#fff6dd] px-3 py-2 text-sm text-[#6b4a10]">Você ainda não tem o PINZ+. Assine o PINZ+ no menu (Planos) para criar murais compartilhados.</p>}
          <Field label="Nome do mural">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex: Nossa viagem" className={inputClass} />}</Field>
          <Field label="Senha do mural" hint={<span className="text-xs text-[#8a7b69]">Combine com a outra pessoa (mínimo 6 caracteres)</span>}>
            {(id) => <input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />}
          </Field>
          {err && (
            <p role="alert" className="text-sm text-[#a23b2a]">
              {err}
            </p>
          )}
          <button type="submit" disabled={busy || !viewerPlus || !title.trim() || password.length < 6} className={primaryButton}>
            {busy ? "Enviando…" : "Enviar convite"}
          </button>
        </form>
      ) : (
        <form onSubmit={sendReport} noValidate className="space-y-4">
          <p className="text-sm text-[#4a3826]">
            A denúncia é anônima: <strong>@{data.nickname}</strong> não sabe quem denunciou. Nossa equipe analisa e decide o que fazer.
          </p>
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-sm font-semibold">Qual é o problema?</legend>
            {REASONS.map((r) => (
              <label key={r.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${reason === r.id ? "border-[#d9a21b] bg-[#fff6dd]" : "border-[#e1d3ba] bg-white/70"}`}>
                <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-[#d9a21b]" />
                {r.label}
              </label>
            ))}
          </fieldset>
          <Field label="Detalhes (opcional)">{(id) => <textarea id={id} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} rows={3} className={inputClass} />}</Field>
          {err && (
            <p role="alert" className="text-sm text-[#a23b2a]">
              {err}
            </p>
          )}
          <button type="submit" disabled={busy} className="w-full cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#8c3022] disabled:opacity-60">
            {busy ? "Enviando…" : "Enviar denúncia"}
          </button>
        </form>
      )}
    </Modal>
  );
}
