"use client";

import { backupMural } from "@/lib/muralBackup";
import { EventTools } from "./EventTools";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { OwnMural } from "@/lib/auth";
import { PinTtlField, type PinTtl } from "./PinTtlField";
import { PrivacyField, privacyError, type Privacy } from "./PrivacyField";
import { getBrowserSupabase } from "@/lib/supabase";
import { fetchInventory, type BoardOffer } from "@/lib/badges";
import { BOARDS, boardPreview } from "@/lib/boards";
import { PAY_EVENT } from "@/lib/payments";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/** Modo evento (QR code, cartaz e aprovação automática) desligado por enquanto: o código fica pronto; para ligar, troque para true. */
const EVENT_MODE_ENABLED = false;

/** Editar o mural: tipo (fundo), nome e excluir. Público/privado e a pergunta de segurança são do PERFIL (Perfil → Privacidade). */
export function MuralSettings({ mural, onSaved, onDeleted, canDelete = true }: { mural: OwnMural; onSaved: () => void; onDeleted: () => void; /** o primeiro mural da conta nunca pode ser excluído */ canDelete?: boolean }) {
  const tl = useLit();
  const tx = useTranslations("components.account.MuralSettings");
  const [title, setTitle] = useState(mural.title);
  const [backup, setBackup] = useState<{ busy: boolean; done: number; total: number; error: string | null }>({ busy: false, done: 0, total: 0, error: null });
  async function runBackup() {
    setBackup({ busy: true, done: 0, total: 0, error: null });
    const r = await backupMural(mural.id, (done, total) => setBackup((b) => ({ ...b, done, total })));
    if (!r.ok) return setBackup({ busy: false, done: 0, total: 0, error: r.reason === "mfa" ? tl("Confirme a verificação em duas etapas para continuar.") : tl("Não foi possível gerar o backup agora.") });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(r.blob);
    a.download = r.name;
    a.click();
    URL.revokeObjectURL(a.href);
    setBackup({ busy: false, done: 0, total: 0, error: r.missing ? `${r.missing} ${tl("arquivos não puderam ser baixados; o endereço deles está no mural.json.")}` : null });
  }
  const plus = mural.plan === "full";
  const [welcome, setWelcome] = useState(mural.welcome_message ?? ""); // mensagem que a pessoa vê ao entrar no mural (só PINZ+)
  const [ttl, setTtl] = useState<PinTtl>(mural.pin_ttl_days ?? null);
  // pergunta de segurança deste mural (cada mural tem a sua)
  const [privacy, setPrivacy] = useState<Privacy>({ priv: !!mural.question, question: mural.question ?? "", answer: "" });
  const [privOrig, setPrivOrig] = useState<Privacy | null>(null);
  useEffect(() => {
    let alive = true;
    void getBrowserSupabase()
      .rpc("get_mural_privacy", { p_mural_id: mural.id })
      .then(({ data }) => {
        if (!alive || !data) return;
        const p = data as { private: boolean; question: string; answer: string };
        const v = { priv: p.private, question: p.question, answer: p.answer };
        setPrivacy(v);
        setPrivOrig(v);
      });
    return () => {
      alive = false;
    };
  }, [mural.id]);
  const [welcomeOn, setWelcomeOn] = useState(!!mural.welcome_message?.trim()); // caixa marcada = o campo de texto aparece; desmarcada = sem mensagem (apaga a que existia)
  const strip = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0); // qual fundo está à vista (para os pontinhos)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [offers, setOffers] = useState<BoardOffer[]>([]);
  const [board, setBoard] = useState("");
  const [currentBoard, setCurrentBoard] = useState("");

  useEffect(() => {
    setTitle(mural.title);
    setWelcome(mural.welcome_message ?? "");
    setWelcomeOn(!!mural.welcome_message?.trim());
    setTtl(mural.pin_ttl_days ?? null);
  }, [mural.id, mural.title, mural.welcome_message, mural.pin_ttl_days]);

  useEffect(() => {
    const sb = getBrowserSupabase();
    void fetchInventory(sb).then((inv) => setOffers(inv?.boards ?? []));
    void sb
      .from("murals")
      .select("board")
      .eq("id", mural.id)
      .maybeSingle()
      .then(({ data }) => {
        const b = (data as { board: string } | null)?.board ?? "cortica";
        setBoard(b);
        setCurrentBoard(b);
      });
  }, [mural.id]);

  // só os tipos que a pessoa já tem (mais o que o mural usa agora, por garantia)
  const selectable = BOARDS.filter((b) => b.id === "cortica" || b.id === currentBoard || offers.find((o) => o.id === b.id)?.owned === true);

  // ao abrir (e quando o tipo do mural chega do servidor), o slide já mostra o tipo em uso
  useEffect(() => {
    const el = strip.current;
    const i = selectable.findIndex((b) => b.id === currentBoard);
    if (el && i >= 0) {
      el.scrollTo({ left: i * el.clientWidth });
      setSlide(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBoard, selectable.length]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!title.trim()) {
      setMsg({ ok: false, text: tx("m_preenchaONomeDoMural") });
      return;
    }
    setBusy(true);
    const sb = getBrowserSupabase();
    const { error } = await sb.rpc("update_mural", { p_id: mural.id, p_title: title.trim() });
    if (error) {
      setBusy(false);
      setMsg({ ok: false, text: tx("m_naoFoiPossivelSalvarConfira") });
      return;
    }
    if (board && board !== currentBoard) {
      const { error: eb } = await sb.rpc("set_mural_board", { p_mural_id: mural.id, p_board: board });
      if (eb) {
        setBusy(false);
        setMsg({ ok: false, text: tx("m_salveiONomeMasNao") });
        return;
      }
      setCurrentBoard(board);
    }
    // pergunta de segurança do mural: só envia se mudou (quem já tinha entrado precisa responder de novo)
    if (privOrig && (privacy.priv !== privOrig.priv || privacy.question.trim() !== privOrig.question.trim() || privacy.answer.trim() !== privOrig.answer.trim())) {
      const perr = privacyError(privacy, privOrig.priv && !!privOrig.answer);
      if (perr) {
        setBusy(false);
        setMsg({ ok: false, text: perr });
        return;
      }
      const { error: ep } = await sb.rpc("set_mural_privacy", { p_mural_id: mural.id, p_private: privacy.priv, p_question: privacy.priv ? privacy.question.trim() : "", p_answer: privacy.priv && privacy.answer.trim() ? privacy.answer.trim() : null });
      if (ep) {
        setBusy(false);
        setMsg({ ok: false, text: tx("m_naoFoiPossivelSalvarA") });
        return;
      }
    }
    if (ttl !== (mural.pin_ttl_days ?? null)) {
      const { error: et } = await sb.rpc("set_mural_pin_ttl", { p_mural_id: mural.id, p_days: ttl });
      if (et) {
        setBusy(false);
        setMsg({ ok: false, text: tx("m_salveiORestoMasNao") });
        return;
      }
    }
    // mensagem de boas-vindas (PINZ+): vazia apaga
    const wanted = welcomeOn ? welcome : "";
    if (plus && wanted.trim() !== (mural.welcome_message ?? "").trim()) {
      const { error: ew } = await sb.rpc("set_welcome_message", { p_mural_id: mural.id, p_text: wanted });
      if (ew) {
        setBusy(false);
        setMsg({ ok: false, text: tx("m_salveiORestoMasNao2") });
        return;
      }
    }
    setBusy(false);
    onSaved();
  }

  async function reset() {
    setBusy(true);
    const { error } = await getBrowserSupabase().rpc("reset_mural", { p_id: mural.id });
    setBusy(false);
    setConfirmReset(false);
    if (error) {
      setMsg({ ok: false, text: tx("m_naoFoiPossivelResetarO") });
      return;
    }
    setMsg({ ok: true, text: tx("m_muralResetadoTodosOsRecados") });
    window.dispatchEvent(new Event("pinz:reload-board"));
    onSaved();
  }

  async function remove() {
    setBusy(true);
    const { error } = await getBrowserSupabase().rpc("delete_mural", { p_id: mural.id });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: tx("m_naoFoiPossivelExcluirTente") });
      return;
    }
    onDeleted();
  }

  return (
    <div>
      <form onSubmit={save} className="space-y-4" noValidate>
        <fieldset className="mx-auto w-full max-w-[26rem] min-w-0">
          <legend className="mb-2 text-sm font-semibold">{tx("tipoDoMural")}</legend>
          <div className="relative">
            <div
              ref={strip}
              role="radiogroup"
              aria-label={tx("tipoDoMural")}
              onScroll={(e) => {
                // o tipo que está à vista no carrossel é o escolhido (sem botão de selecionar)
                const i = Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth || 1));
                setSlide(i);
                const bd = selectable[i];
                if (bd) setBoard(bd.id);
              }}
              className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl shadow-[0_0.5rem_1.4rem_rgba(60,35,10,.25)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {selectable.map((bd) => {
                const on = board === bd.id;
                return (
                  <div key={bd.id} role="radio" aria-checked={on} aria-label={tl(bd.name)} className="relative block w-full shrink-0 snap-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={boardPreview(bd)} alt="" draggable={false} className="aspect-[12/5] w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pt-10 pb-3">
                      <span className="min-w-0 truncate text-base font-bold text-white">{tl(bd.name)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectable.length > 1 &&
              ([-1, 1] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => strip.current?.scrollBy({ left: d * (strip.current?.clientWidth ?? 230), behavior: "smooth" })}
                  aria-label={d < 0 ? tl("Tipo anterior") : tx("m_proximoTipo")}
                  className={`absolute top-1/2 z-10 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/85 text-[#2a1c12] shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.35)] backdrop-blur transition hover:bg-white active:scale-90 ${d < 0 ? "left-2" : "right-2"}`}
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={d < 0 ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
                  </svg>
                </button>
              ))}
          </div>
          {selectable.length > 1 && (
            <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden>
              {selectable.map((bd, i) => (
                <span key={bd.id} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-[#d9a21b]" : "w-1.5 bg-[#cdbb97]"}`} />
              ))}
            </div>
          )}
        </fieldset>

        <Field label={tx("nomeDoMural")}>{(fid) => <input id={fid} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={inputClass} />}</Field>

        <PrivacyField value={privacy} onChange={setPrivacy} />

        <PinTtlField value={ttl} onChange={setTtl} />

        <div>
          <label className={`flex items-center gap-2.5 text-sm font-semibold ${plus ? "cursor-pointer" : "opacity-80"}`}>
            <input
              type="checkbox"
              checked={plus && welcomeOn}
              onChange={(e) => {
                if (!plus) return window.dispatchEvent(new CustomEvent(PAY_EVENT, { detail: { product: "plus" } }));
                setWelcomeOn(e.target.checked);
              }}
              className="size-5 cursor-pointer accent-[#d98a2b]"
            />
            <span>{tx("mensagemDeBoasVindas")}</span>
            {!plus && <span className="rounded-md bg-gradient-to-r from-[#f2c230] to-[#e39a1c] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-[#3a2300] uppercase">{tx("pinz")}</span>}
          </label>
          {plus && welcomeOn && (
            <div className="mt-2">
              <textarea
                id="mural-welcome"
                aria-label={tx("mensagemDeBoasVindas")}
                value={welcome}
                onChange={(e) => setWelcome(e.target.value.slice(0, 280))}
                rows={4}
                maxLength={280}
                placeholder={tx("umRecadoQueAparecePara")}
                className={`${inputClass} resize-none`}
              />
              <div className="mt-1 flex items-center justify-between text-xs text-[#8a7b69]">
                <span>{tx("apareceComoUmaJanelaQuando")}</span>
                <span className="tabular-nums">{welcome.length}/280</span>
              </div>
            </div>
          )}
        </div>

        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? tl("Salvando…") : tl("Salvar")}
        </button>
      </form>

      {/* resetar: apaga todos os recados do mural (os bottons e displays ficam) */}
      <div className="mt-6 border-t border-[#e1d3ba] pt-4">
        {confirmReset ? (
          <div role="alert" className="rounded-xl border border-[#e3b3a8] bg-[#fbeae5] p-4">
            <p className="text-sm font-semibold text-[#6b2a1c]">{tx("resetarEsteMural")}</p>
            <p className="mt-1 text-sm text-[#6b2a1c]">{tx("todosOsRecadosPinsSerao")}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={reset} disabled={busy} className="cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a3123] disabled:opacity-60">
                {busy ? tl("Resetando…") : tl("Sim, resetar")}
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} disabled={busy} className={`${ghostButton} !px-4 !py-2 text-sm`}>
                {tx("cancelar")}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="w-full cursor-pointer rounded-xl border border-[#e3b3a8] bg-white/60 px-4 py-3 text-sm font-semibold text-[#a23b2a] transition hover:bg-[#fbeae5]">
            {tx("resetarMural")}</button>
        )}
      </div>

      {EVENT_MODE_ENABLED && <EventTools muralId={mural.id} slug={mural.slug} title={mural.title} />}
      {/* backup: um ZIP com tudo deste mural */}
      <div className="mt-4 rounded-xl border border-[#e1d3ba] bg-white/70 px-4 py-3">
        <p className="text-sm font-semibold">{tl("Backup do mural")}</p>
        <p className="text-xs text-[#6b5440]">{tl("Baixe uma cópia de todos os pins, displays e arquivos deste mural (ZIP).")}</p>
        <button type="button" disabled={backup.busy} onClick={() => void runBackup()} className="mt-2 cursor-pointer rounded-lg border border-[#d9c9ad] bg-white px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:opacity-60">
          {backup.busy ? (backup.total ? `${tl("Baixando arquivos…")} ${backup.done}/${backup.total}` : tl("Preparando o backup…")) : tl("Baixar backup")}
        </button>
        {backup.error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-[#a23b2a]">
            {backup.error}
          </p>
        )}
      </div>

      {/* o primeiro mural nunca pode ser excluído: nesse caso a área nem aparece */}
      <div className={`mt-4 ${canDelete ? "" : "hidden"}`}>
        {!canDelete ? null : confirmDelete ? (
          <div role="alert" className="rounded-xl border border-[#e3b3a8] bg-[#fbeae5] p-4">
            <p className="text-sm text-[#6b2a1c]">{tx("excluirEsteMuralApagaTambem")}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={remove} disabled={busy} className="cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a3123] disabled:opacity-60">
                {tx("simExcluir")}</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={`${ghostButton} !px-4 !py-2 text-sm`}>
                {tx("cancelar")}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="w-full cursor-pointer rounded-xl border border-[#e3b3a8] bg-white/60 px-4 py-3 text-sm font-semibold text-[#a23b2a] transition hover:bg-[#fbeae5]">
            {tx("excluirEsteMural")}</button>
        )}
      </div>
    </div>
  );
}
