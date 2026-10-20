"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { cardToPng, deliverImage } from "@/lib/exportImage";
import { createSharedMural, SHARED_ERROR_TEXT } from "@/lib/shared";
import { getProfileSummary, reportProfile, type ProfileReportReason, type ProfileSummary } from "@/lib/social";
import { getBrowserSupabase } from "@/lib/supabase";
import { BOARDS, DEFAULT_BOARD } from "@/lib/boards";
import { fetchInventory, type BoardOffer } from "@/lib/badges";
import { Avatar } from "../Avatar";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";
import { CardSkeleton } from "../Skeleton";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

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

/** Linha de ação do perfil: ícone, título e descrição. */
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
export function ProfileSummaryModal({ open, onClose, nick, logged, viewerPlus, showStats, onNotify, startView = "summary", isOwner = false }: { /** quem está vendo é o dono deste perfil (garante o botão Editar perfil) */ isOwner?: boolean; /** tela com que a janela abre ("shared" = direto no convite para o mural compartilhado) */ startView?: "summary" | "shared"; open: boolean; onClose: () => void; nick: string; logged: boolean; /** quem está vendo tem o PINZ+ */ viewerPlus: boolean; showStats: boolean; onNotify: (m: string) => void }) {
  const tl = useLit();
  const tx = useTranslations("components.account.ProfileSummaryModal");
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [view, setView] = useState<"summary" | "shared" | "report">("summary");
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null); // o cartão de visita (imagem) que vai no compartilhamento
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
    setView(startView === "shared" && logged ? "shared" : "summary");
    setErr(null);
    setTitle("");
    setPassword("");
    setDetails("");
    setBoard(DEFAULT_BOARD);
    if (logged) void fetchInventory(getBrowserSupabase()).then((inv) => setOffers(inv?.boards ?? []));
    void getProfileSummary(getBrowserSupabase(), nick).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nick, logged]);
  // o padrão e os tipos de mural que quem cria (você) já tem
  const ownedBoards = BOARDS.filter((b) => b.id === DEFAULT_BOARD || offers.find((o) => o.id === b.id)?.owned === true);

  const self = data?.self === true || isOwner;

  async function sendShared(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await createSharedMural(getBrowserSupabase(), title.trim(), nick, password);
    setBusy(false);
    if (!res.ok) return setErr(tl(SHARED_ERROR_TEXT[res.reason]));
    if (board !== DEFAULT_BOARD) await getBrowserSupabase().rpc("set_mural_board", { p_mural_id: res.id, p_board: board });
    onNotify(tx("m_conviteEnviadoParaOMural", { v0: nick }));
    onClose();
  }

  async function sendReport(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const ok = await reportProfile(getBrowserSupabase(), nick, reason, details.trim());
    setBusy(false);
    if (!ok) return setErr(tx("m_naoFoiPossivelEnviarA"));
    onNotify(tx("m_denunciaEnviadaObrigadoPorAvisar"));
    onClose();
  }

  const heading = view === "shared" ? "Mural compartilhado" : view === "report" ? "Denunciar perfil" : "Perfil";
  const profileUrl = () => `${window.location.origin}/${data?.nickname ?? nick}`;

  async function shareProfile() {
    if (sharing || !data) return;
    const url = profileUrl();
    const text = `Veja o perfil de @${data.nickname} no Pinz: ${url}`;
    setSharing(true);
    try {
      if (cardRef.current) {
        const blob = await cardToPng(cardRef.current);
        const res = await deliverImage(blob, `pinz-${data.nickname}`, text);
        if (res === "downloaded") onNotify(tx("m_imagemSalvaAgoraESo"));
        return;
      }
    } catch {
      /* sem imagem: cai no link */
    } finally {
      setSharing(false);
    }
    try {
      if (navigator.share) await navigator.share({ title: `Perfil de @${data.nickname} no Pinz`, text: `Veja o perfil de @${data.nickname} no Pinz!`, url });
      else {
        await navigator.clipboard.writeText(url);
        onNotify(tl("Link copiado!"));
      }
    } catch {
      /* compartilhamento cancelado */
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={heading} label={heading} headerLeft={view !== "summary" ? <button type="button" onClick={() => (setView("summary"), setErr(null))} className="cursor-pointer text-sm font-semibold text-[#6b5440] underline">{tx("voltar")}</button> : undefined}>
      {!data ? (
        <CardSkeleton label={tx("carregandoOPerfil")} />
      ) : view === "summary" ? (
        <div className="space-y-4">
          {/* foto grande com a moldura dourada do PINZ+ */}
          <div className="flex justify-center pt-1">
            <Avatar src={data.avatar} name={data.nickname} plus={data.plus} className={`size-40 ${data.plus ? "!border-[0.35rem]" : "!border-4"}`} />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-title text-[2rem] leading-tight font-semibold [overflow-wrap:anywhere]">@{data.nickname}</p>
            {data.plus && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f6cb4a] to-[#eaa91a] px-3.5 py-1.5 text-lg font-extrabold text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(150,90,0,.35)]">
                {tx("pinz")}</span>
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
              <Stat tone="blue" value={data.views.toLocaleString("pt-BR")} label={data.views === 1 ? tx("m_visualizacao") : tx("m_visualizacoes")}>
                <svg {...icon} strokeWidth="2.4">
                  <path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Stat>
              <Stat tone="green" value={(data.received ?? 0).toLocaleString("pt-BR")} label={(data.received ?? 0) === 1 ? tx("m_pinColocadoNoMural") : tx("m_pinsColocadosNoMural")}>
                <svg {...icon} fill="currentColor" stroke="none">
                  <path d="M14.500 2.500 21.500 9.500c.6.6.2 1.500-.6 1.600l-2.300.2-3.700 3.700.4 3.400c.1.8-.8 1.200-1.400.7L9.600 15.600 4 21.200 2.800 20 8.400 14.400 5.400 11c-.5-.6-.1-1.500.7-1.400l3.400.4 3.700-3.700.2-2.300c.1-.8 1-1.200 1.600-.6Z" />
                </svg>
              </Stat>
            </div>
          )}

          <div className="space-y-2.5 border-t border-[#e6d8bd] pt-4">
            {logged && !self && (
              <button type="button" onClick={() => (setErr(null), setView("shared"))} className={`${ghostButton} w-full`}>
                {tx("convidarParaOMuralCompartilhado")}</button>
            )}
            <Action tone="purple" title={sharing ? "Preparando a imagem…" : "Compartilhar perfil"} hint={tx("enviaUmCartaoDeVisita")} onClick={() => void shareProfile()}>
              <svg {...icon}>
                <circle cx="18" cy="5" r="2.6" />
                <circle cx="6" cy="12" r="2.6" />
                <circle cx="18" cy="19" r="2.6" />
                <path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" />
              </svg>
            </Action>
            {logged && !self && (
              <button type="button" onClick={() => (setErr(null), setView("report"))} className="w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-[#a23b2a] transition hover:bg-[#fbeae5]">
                {tx("denunciarPerfil")}</button>
            )}
          </div>
        </div>
      ) : view === "shared" ? (
        <form onSubmit={sendShared} noValidate className="space-y-4">
          <p className="text-sm text-[#4a3826]">
            Um mural só de vocês dois. Você define o nome e a senha e <strong>@{data.nickname}</strong> recebe o convite. Os dois precisam ter o PINZ+.
          </p>
          {!viewerPlus && <p className="rounded-xl border border-[#ecd9a0] bg-[#fff6dd] px-3 py-2 text-sm text-[#6b4a10]">{tx("voceAindaNaoTemO")}</p>}
          <fieldset className="min-w-0">
            <legend className="mb-1 text-sm font-semibold">{tx("tipoDoMural")}</legend>
            <div role="radiogroup" aria-label={tx("tipoDoMural")} className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
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
            {ownedBoards.length === 1 && <p className="text-xs text-[#6b5440]">{tx("outrosTiposDeMuralVoce")}</p>}
          </fieldset>
          <Field label={tx("nomeDoMural")}>{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={tx("exNossaViagem")} className={inputClass} />}</Field>
          <Field label={tx("senhaDoMural")} hint={<span className="text-xs text-[#8a7b69]">{tx("combineComAOutraPessoa")}</span>}>
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
            <legend className="mb-1 text-sm font-semibold">{tx("qualEOProblema")}</legend>
            {REASONS.map((r) => (
              <label key={r.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${reason === r.id ? "border-[#d9a21b] bg-[#fff6dd]" : "border-[#e1d3ba] bg-white/70"}`}>
                <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-[#d9a21b]" />
                {r.label}
              </label>
            ))}
          </fieldset>
          <Field label={tx("detalhesOpcional")}>{(id) => <textarea id={id} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} rows={3} className={inputClass} />}</Field>
          {err && (
            <p role="alert" className="text-sm text-[#a23b2a]">
              {err}
            </p>
          )}
          <button type="submit" disabled={busy} className="w-full cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#8c3022] disabled:opacity-60">
            {busy ? "Enviando…" : tx("m_enviarDenuncia")}
          </button>
        </form>
      )}
      {open && data && view === "summary" && (
        <div ref={cardRef} aria-hidden inert className="pointer-events-none" style={{ position: "fixed", left: -100000, top: 0, width: 540, height: 675, background: "#3b2616", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/blur/cortica.webp" alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "relative", width: 440, background: "#fbf3e1", borderRadius: 36, padding: "40px 28px 28px", boxShadow: "0 18px 40px rgba(0,0,0,.45)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#2f2218" }}>
            {data.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatar} alt="" crossOrigin="anonymous" width={190} height={190} style={{ width: 190, height: 190, borderRadius: 999, objectFit: "cover", border: `${data.plus ? 9 : 6}px solid ${data.plus ? "#f2b81c" : "#ffffff"}` }} />
            ) : (
              <div style={{ width: 190, height: 190, borderRadius: 999, background: "#d98a2b", color: "#fff", fontSize: 96, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "6px solid #fff" }}>{data.nickname.slice(0, 1).toUpperCase()}</div>
            )}
            <div style={{ marginTop: 18, fontSize: 44, fontWeight: 700, lineHeight: 1.1, wordBreak: "break-word" }}>{`@${data.nickname}`}</div>
            {data.plus && <div style={{ marginTop: 12, background: "#f2b81c", color: "#2a1c12", fontWeight: 800, fontSize: 22, padding: "6px 18px", borderRadius: 14 }}>{tx("pinz")}</div>}
            {showStats && (
              <div style={{ marginTop: 22, display: "flex", gap: 14, width: "100%" }}>
                {([
                  ...(data.followers != null ? [{ v: data.followers.toLocaleString("pt-BR"), l: data.followers === 1 ? "seguidor" : "seguidores", bg: "#fbe4e2" }] : []),
                  { v: data.views.toLocaleString("pt-BR"), l: "visualizações", bg: "#e0ecf8" },
                  { v: (data.received ?? 0).toLocaleString("pt-BR"), l: "pins colocados no mural", bg: "#e3f1de" },
                ] as { v: string; l: string; bg: string }[])
                  .map(({ v, l, bg }) => (
                    <div key={l} style={{ flex: 1, background: bg, borderRadius: 18, padding: "14px 6px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{v}</div>
                      <div style={{ marginTop: 6, fontSize: 15, color: "#6b5440" }}>{l}</div>
                    </div>
                  ))}
              </div>
            )}
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12, width: "100%", justifyContent: "center", borderTop: "2px dashed #d9c9ad", paddingTop: 18 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/pinz-logo.webp" alt="" draggable={false} style={{ height: 52 }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 15, color: "#4a3826", fontWeight: 600 }}>{tx("crieSeuMuralECompartilhe")}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{tx("pinzDigital")}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
