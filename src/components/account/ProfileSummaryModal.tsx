"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createSharedMural, SHARED_ERROR_TEXT } from "@/lib/shared";
import { getProfileSummary, reportProfile, type ProfileReportReason, type ProfileSummary } from "@/lib/social";
import { getBrowserSupabase } from "@/lib/supabase";
import { BOARDS, DEFAULT_BOARD } from "@/lib/boards";
import { fetchInventory, type BoardOffer } from "@/lib/badges";
import { Avatar } from "../Avatar";
import QRCode from "qrcode";
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

const icon = { viewBox: "0 0 24 24", className: "size-6", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Cartão de número do perfil: cor suave, ícone, valor e legenda. */
const Stat = ({ value, label, tone, children }: { value: string; label: string; tone: "pink" | "blue" | "green"; children: ReactNode }) => {
  const t = { pink: "bg-[#fbe4e2] text-[#d9546a]", blue: "bg-[#e0ecf8] text-[#2f78c9]", green: "bg-[#e3f1de] text-[#3f8f4a]" }[tone];
  return (
    <div className={`flex flex-1 flex-col items-center rounded-2xl border border-white/60 px-2 py-3.5 text-center shadow-[0_1px_0_rgba(255,255,255,.8)_inset] ${t.split(" ")[0]}`}>
      <span className={t.split(" ")[1]} aria-hidden>
        {children}
      </span>
      <strong className="font-title mt-1 block text-3xl leading-none text-[#2f2218]">{value}</strong>
      <span className="mt-1.5 block text-[13px] leading-tight text-[#6b5440]">{label}</span>
    </div>
  );
};

/** Linha de ação (compartilhar, copiar link, QR Code…): ícone, título e descrição. */
const Action = ({ title, hint, onClick, tone, children }: { title: string; hint: string; onClick: () => void; tone: "purple" | "blue" | "pink"; children: ReactNode }) => {
  const t = { purple: "bg-[#e9e3f7] text-[#7a5bc8]", blue: "bg-[#dcebf9] text-[#2f78c9]", pink: "bg-[#fbe0e6] text-[#d9546a]" }[tone];
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-[#ece1c9] bg-[#fffaf0]/90 px-3.5 py-3 text-left shadow-[0_2px_6px_rgba(90,60,20,.08)] transition hover:bg-white active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]">
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${t}`} aria-hidden>
        {children}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-tight font-bold">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#6b5440]">{hint}</span>
      </span>
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-[#8a7b69]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
};

/**
 * Resumo do perfil (ao tocar na foto/nome de quem é o mural): foto maior, selo PINZ+, seguidores, visualizações,
 * compartilhar o perfil, pedir um mural compartilhado e denunciar. `showStats` = false (mural privado ainda trancado): só foto, nome e selo.
 */
export function ProfileSummaryModal({ open, onClose, nick, logged, viewerPlus, showStats, onNotify }: { open: boolean; onClose: () => void; nick: string; logged: boolean; /** quem está vendo tem o PINZ+ */ viewerPlus: boolean; showStats: boolean; onNotify: (m: string) => void }) {
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [view, setView] = useState<"summary" | "shared" | "report" | "qr">("summary");
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState<ProfileReportReason>("ofensa");
  const [details, setDetails] = useState("");
  const [board, setBoard] = useState<string>(DEFAULT_BOARD);
  const [offers, setOffers] = useState<BoardOffer[]>([]);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setView("summary");
    setErr(null);
    setTitle("");
    setPassword("");
    setDetails("");
    setBoard(DEFAULT_BOARD);
    if (logged) void fetchInventory(getBrowserSupabase()).then((inv) => setOffers(inv?.boards ?? []));
    void getProfileSummary(getBrowserSupabase(), nick).then(setData);
  }, [open, nick, logged]);
  // o padrão e os tipos de mural que quem cria (você) já tem
  const ownedBoards = BOARDS.filter((b) => b.id === DEFAULT_BOARD || offers.find((o) => o.id === b.id)?.owned === true);

  const self = data?.self === true;

  async function sendShared(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await createSharedMural(getBrowserSupabase(), title.trim(), nick, password);
    setBusy(false);
    if (!res.ok) return setErr(SHARED_ERROR_TEXT[res.reason]);
    if (board !== DEFAULT_BOARD) await getBrowserSupabase().rpc("set_mural_board", { p_mural_id: res.id, p_board: board });
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

  const heading = view === "shared" ? "Mural compartilhado" : view === "report" ? "Denunciar perfil" : view === "qr" ? "QR Code" : "Perfil";
  const profileUrl = () => `${window.location.origin}/${data?.nickname ?? nick}`;

  async function shareProfile() {
    const url = profileUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: `Perfil de @${data?.nickname} no Pinz`, text: `Veja o perfil de @${data?.nickname} no Pinz!`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      onNotify("Link copiado!");
    } catch {
      /* compartilhamento cancelado */
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl());
      onNotify("Link do perfil copiado!");
    } catch {
      onNotify("Não foi possível copiar agora.");
    }
  }
  async function openQr() {
    setErr(null);
    try {
      setQr(await QRCode.toDataURL(profileUrl(), { width: 640, margin: 2, color: { dark: "#2f2218", light: "#ffffff" } }));
      setView("qr");
    } catch {
      onNotify("Não foi possível gerar o QR Code agora.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={view === "summary" ? "" : heading} label={heading} headerLeft={view !== "summary" ? <button type="button" onClick={() => (setView("summary"), setErr(null))} className="cursor-pointer text-sm font-semibold text-[#6b5440] underline">Voltar</button> : undefined}>
      {!data ? (
        <p className="py-8 text-center text-sm text-[#6b5440]">Carregando…</p>
      ) : view === "summary" ? (
        <div className="space-y-4">
          {/* título com grifo amarelo, na linha do botão de fechar */}
          <div className="relative -mt-11 mb-1 pr-12">
            <h3 className="font-title relative inline-block text-4xl leading-none font-semibold">
              Perfil
              <svg aria-hidden viewBox="0 0 120 10" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-2 w-[110%]">
                <path d="M2 6 Q 40 1 118 4" fill="none" stroke="#f2b81c" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </h3>
          </div>

          {/* foto grande sobre uma pincelada amarela, com rabiscos de enfeite */}
          <div className="relative mx-auto flex h-[15rem] items-center justify-center">
            <svg aria-hidden viewBox="0 0 400 240" className="absolute inset-0 size-full">
              <path d="M30 150C40 120 80 112 130 108 190 96 280 70 360 86 372 112 330 134 300 148 240 168 150 186 80 192 44 196 24 178 30 150Z" fill="#f8e7a8" opacity=".85" />
            </svg>
            {data.plus && (
              <svg aria-hidden viewBox="0 0 64 64" className="absolute top-3 left-2 size-16 text-[#a77a1f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 46 12 24l12 9 8-14 8 14 12-9-4 22Z" />
                <path d="M14 8l-3-5M5 18 0 15M3 30l-4 1" transform="translate(8 4)" />
              </svg>
            )}
            <svg aria-hidden viewBox="0 0 80 80" className="absolute top-2 right-1 size-20 text-[#a77a1f]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M44 8 72 14 52 36Z" />
              <path d="M44 8 50 27 52 36M44 8 36 24l14 3" />
              <path d="M40 44c-6 2-10-4-6-8s10-2 10 4c0 8-12 12-22 6" strokeDasharray="3 4" />
            </svg>
            <svg aria-hidden viewBox="0 0 24 24" className="absolute right-4 bottom-4 size-7 text-[#a77a1f]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z" />
            </svg>
            <Avatar src={data.avatar} name={data.nickname} plus={data.plus} className={`relative z-10 size-40 ${data.plus ? "!border-[0.35rem]" : "!border-4"}`} />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-title text-[2rem] leading-tight font-semibold [overflow-wrap:anywhere]">@{data.nickname}</p>
            {data.plus && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f6cb4a] to-[#eaa91a] px-3.5 py-1.5 text-lg font-extrabold text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(150,90,0,.35)]">
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5Z" />
                </svg>
                PINZ+
              </span>
            )}
          </div>

          {showStats && (
            <div className="flex gap-2.5">
              {data.followers != null && (
                <Stat tone="pink" value={data.followers.toLocaleString("pt-BR")} label={data.followers === 1 ? "seguidor" : "seguidores"}>
                  <svg {...icon} fill="currentColor" stroke="none">
                    <circle cx="12" cy="8" r="3.2" />
                    <circle cx="5.5" cy="9.5" r="2.4" />
                    <circle cx="18.5" cy="9.5" r="2.4" />
                    <path d="M6.5 20c0-3.6 2.4-5.8 5.5-5.8s5.5 2.2 5.5 5.8ZM1 19c0-2.6 1.7-4.4 4.2-4.4 1 0 1.800.3 2.500.8-1.200 1.200-1.900 2.100-2.100 3.600ZM23 19c0-2.6-1.700-4.400-4.200-4.400-1 0-1.800.3-2.500.8 1.200 1.200 1.900 2.100 2.100 3.600Z" />
                  </svg>
                </Stat>
              )}
              <Stat tone="blue" value={data.views.toLocaleString("pt-BR")} label={data.views === 1 ? "visualização nos murais" : "visualizações nos murais"}>
                <svg {...icon} strokeWidth="2.4">
                  <path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Stat>
              <Stat tone="green" value={data.placed.toLocaleString("pt-BR")} label={data.placed === 1 ? "PINZ colocado" : "PINZ colocados"}>
                <svg {...icon} fill="currentColor" stroke="none">
                  <path d="M14.500 2.500 21.500 9.500c.6.6.2 1.500-.6 1.600l-2.300.2-3.700 3.700.4 3.400c.1.8-.8 1.200-1.400.7L9.600 15.600 4 21.200 2.800 20 8.400 14.400 5.400 11c-.5-.6-.1-1.500.7-1.400l3.400.4 3.700-3.700.2-2.300c.1-.8 1-1.200 1.600-.6Z" />
                </svg>
              </Stat>
            </div>
          )}

          <div className="space-y-2.5 border-t border-[#e6d8bd] pt-4">
            <Action tone="purple" title="Compartilhar perfil" hint="Mostre seu perfil para mais pessoas" onClick={() => void shareProfile()}>
              <svg {...icon}>
                <circle cx="18" cy="5" r="2.6" />
                <circle cx="6" cy="12" r="2.6" />
                <circle cx="18" cy="19" r="2.6" />
                <path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" />
              </svg>
            </Action>
            <Action tone="blue" title="Copiar link" hint="Copie o link do perfil" onClick={() => void copyLink()}>
              <svg {...icon} strokeWidth="2.2">
                <path d="M10 14a4.500 4.500 0 0 0 6.400 0l3-3a4.500 4.500 0 0 0-6.400-6.400l-1 1M14 10a4.500 4.500 0 0 0-6.400 0l-3 3a4.500 4.500 0 0 0 6.400 6.400l1-1" />
              </svg>
            </Action>
            <Action tone="pink" title="QR Code" hint="Compartilhe o perfil com um QR Code" onClick={() => void openQr()}>
              <svg {...icon}>
                <rect x="3.500" y="3.500" width="7" height="7" rx="1.200" />
                <rect x="13.500" y="3.500" width="7" height="7" rx="1.200" />
                <rect x="3.500" y="13.500" width="7" height="7" rx="1.200" />
                <path d="M14 14h2.500v2.500H14zM18.500 14H21M14 19h2.500M18.500 18.500H21V21h-2.500z" />
              </svg>
            </Action>
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
      ) : view === "qr" ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[#4a3826]">Aponte a câmera para abrir o perfil de <strong>@{data.nickname}</strong>.</p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR Code do perfil de @${data.nickname}`} className="size-64 rounded-2xl border border-[#e6d8bd] bg-white p-2" />
          )}
          {qr && (
            <a href={qr} download={`pinz-${data.nickname}-qrcode.png`} className={`${primaryButton} !w-auto px-6`}>
              Salvar imagem
            </a>
          )}
        </div>
      ) : view === "shared" ? (
        <form onSubmit={sendShared} noValidate className="space-y-4">
          <p className="text-sm text-[#4a3826]">
            Um mural só de vocês dois. Você define o nome e a senha e <strong>@{data.nickname}</strong> recebe o convite. Os dois precisam ter o PINZ+.
          </p>
          {!viewerPlus && <p className="rounded-xl border border-[#ecd9a0] bg-[#fff6dd] px-3 py-2 text-sm text-[#6b4a10]">Você ainda não tem o PINZ+. Assine o PINZ+ no menu (Planos) para criar murais compartilhados.</p>}
          <fieldset className="min-w-0">
            <legend className="mb-1 text-sm font-semibold">Tipo do mural</legend>
            <div role="radiogroup" aria-label="Tipo do mural" className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
              {ownedBoards.map((bd) => {
                const on = board === bd.id;
                return (
                  <button
                    key={bd.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setBoard(bd.id)}
                    className={`relative w-[7.5rem] shrink-0 cursor-pointer snap-center rounded-xl border-2 p-1.5 text-center transition ${on ? "border-[#d9a21b] bg-[#fff6dd] shadow-[0_0.2rem_0.7rem_rgba(217,162,27,.35)] ring-2 ring-[#d9a21b]/40" : "border-[#e1d3ba] bg-white hover:bg-[#fff6dd]"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bd.image} alt="" draggable={false} className="aspect-[3/2] w-full rounded-lg object-cover" />
                    {on && (
                      <span aria-hidden className="absolute top-2.5 left-2.5 grid size-5 place-items-center rounded-full bg-[#d9a21b] text-[#2a1c12] shadow">
                        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                    )}
                    <span className="mt-1 block text-xs font-semibold">{bd.name}</span>
                  </button>
                );
              })}
            </div>
            {ownedBoards.length === 1 && <p className="text-xs text-[#6b5440]">Outros tipos de mural você compra na loja.</p>}
          </fieldset>
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
