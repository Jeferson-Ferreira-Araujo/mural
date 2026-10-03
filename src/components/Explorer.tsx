"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildPool, randomMural } from "@/data/mock";
import {
  checkGrantClient,
  clearGrant,
  getProfileMurals,
  getSiteStats,
  getPublicMural,
  getVisitorId,
  loadGrant,
  muralPath,
  saveGrant,
  tryUnlock,
  type ProfileMurals,
  type PublicMural,
  type SiteStats,
  type UnlockResult,
} from "@/lib/mural";
import { boardById } from "@/lib/boards";
import type { SendPayload } from "./composer/types";
import { fetchBoard, sendPin, SEND_ERROR_TEXT } from "@/lib/pins";
import { getBrowserSupabase } from "@/lib/supabase";
import type { BoardItem } from "@/lib/types";
import { MuralScreen } from "./MuralScreen";
import { useToast } from "./useToast";
import { SearchBox } from "./SearchBox";
import { Toast } from "./Toast";
import { UnlockPanel } from "./UnlockPanel";
import type { Tone } from "./viewProps";


/**
 * Tela principal: busca uma pessoa pelo nickname, mostra a pergunta do mural e, ao acertar,
 * revela o quadro (que fica desfocado até lá). Também abre direto em um mural (`/nickname/mural`).
 */
export function Explorer({ initial }: { initial?: PublicMural }) {
  const [selected, setSelected] = useState<PublicMural | null>(initial ?? null);
  const [choices, setChoices] = useState<ProfileMurals | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [token, setToken] = useState<string | null>(null); // token de desbloqueio (dá acesso ao quadro e ao envio)
  const [items, setItems] = useState<BoardItem[]>([]); // pins reais do mural aberto
  const [tried, setTried] = useState(false);
  const { message: toast, notify } = useToast();
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  useEffect(() => {
    void getSiteStats(getBrowserSupabase()).then(setSiteStats);
  }, []);

  const nick = selected?.nickname;
  const slug = selected?.slug;

  // mural escolhido: registra a visita e restaura um desbloqueio anterior (validado no servidor)
  useEffect(() => {
    if (!nick || !slug) return;
    const ref = { nick, slug };
    const sb = getBrowserSupabase();
    sb.rpc("record_visit", { p_nick: nick, p_slug: slug, p_visitor_id: getVisitorId() }).then(() => undefined);
    const token = loadGrant(ref);
    if (token) {
      void checkGrantClient(sb, ref, token).then((ok) => {
        if (!ok) return;
        setToken(token);
        setUnlocked(true);
      });
    }
  }, [nick, slug]);

  // tranca o mural de novo (desbloqueio vencido, apagado pelo dono ou inválido): precisa responder a pergunta outra vez
  const relock = useCallback(
    (why: string) => {
      if (nick && slug) clearGrant({ nick, slug });
      setToken(null);
      setUnlocked(false);
      setItems([]);
      notify(why);
      // a pergunta pode ter mudado: mostra a atual
      if (nick && slug) void getPublicMural(getBrowserSupabase(), { nick, slug }).then((m) => m && setSelected(m));
    },
    [nick, slug, notify],
  );

  // mural desbloqueado: carrega os pins e atualiza de tempos em tempos (cápsulas que abrem, pins novos)
  const loadBoard = useCallback(async () => {
    if (!nick || !slug) return;
    const list = await fetchBoard(getBrowserSupabase(), { nick, slug }, token);
    if (list) setItems(list);
    else relock("Por segurança, o mural foi trancado de novo. Responda a pergunta para continuar.");
  }, [nick, slug, token, relock]);

  // de tempos em tempos (e ao voltar para a aba) confere se o desbloqueio continua valendo
  useEffect(() => {
    if (!unlocked || !token || !nick || !slug) return;
    const check = async () => {
      const ok = await checkGrantClient(getBrowserSupabase(), { nick, slug }, token);
      if (!ok) relock("Por segurança, o mural foi trancado de novo. Responda a pergunta para continuar.");
    };
    const t = setInterval(() => void check(), 30_000);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [unlocked, token, nick, slug, relock]);
  useEffect(() => {
    if (!unlocked || !token) {
      setItems([]);
      return;
    }
    void loadBoard();
    const t = setInterval(() => void loadBoard(), 60_000);
    return () => clearInterval(t);
  }, [unlocked, token, loadBoard]);

  async function onSendPin(p: SendPayload): Promise<string | void> {
    if (!nick || !slug || !token) return SEND_ERROR_TEXT.not_unlocked;
    const res = await sendPin(getBrowserSupabase(), { nick, slug }, token, getVisitorId(), p);
    if (res.ok) {
      await loadBoard();
      return;
    }
    if (res.reason === "not_unlocked") {
      const msg = "Por segurança, o mural foi trancado de novo. Responda a pergunta para continuar.";
      relock(msg);
      return msg;
    }
    if (res.reason === "slot_taken" || res.reason === "plan_limit") await loadBoard();
    return SEND_ERROR_TEXT[res.reason];
  }

  const openMural = useCallback(
    async (n: string, s: string) => {
      setLoading(true);
      const m = await getPublicMural(getBrowserSupabase(), { nick: n, slug: s });
      setLoading(false);
      if (!m) {
        notify("Não foi possível abrir esse mural.");
        return;
      }
      setUnlocked(false);
      setToken(null);
      setTried(false);
      setChoices(null);
      setSelected(m);
    },
    [notify],
  );

  const pickPerson = useCallback(
    async (n: string) => {
      setLoading(true);
      const profile = await getProfileMurals(getBrowserSupabase(), n);
      setLoading(false);
      if (!profile || profile.murals.length === 0) {
        notify("Essa pessoa ainda não tem murais.");
        return;
      }
      if (profile.murals.length === 1) {
        await openMural(profile.nickname, profile.murals[0].slug);
        return;
      }
      setSelected(null);
      setUnlocked(false);
      setChoices(profile);
    },
    [notify, openMural],
  );

  function clear() {
    setSelected(null);
    setChoices(null);
    setUnlocked(false);
  }

  const submitAnswer = useCallback(
    async (answer: string): Promise<UnlockResult> => {
      if (!nick || !slug) return { ok: false, reason: "error" };
      const ref = { nick, slug };
      const res = await tryUnlock(getBrowserSupabase(), ref, answer, getVisitorId());
      if (res.ok) {
        if (res.token) {
          saveGrant(ref, res.token);
          setToken(res.token);
        }
        setUnlocked(true);
      }
      return res;
    },
    [nick, slug],
  );

  const panel = useCallback(
    (tone: Tone) => {
      const dark = tone === "dark";
      return (
        <div className="space-y-[1.2em]">
          {/* a busca só aparece sem mural escolhido ("Trocar" volta para ela) */}
          {!selected && <SearchBox onSelect={pickPerson} tone={tone} />}
          {loading && (
            <p role="status" className={`text-[0.9em] ${dark ? "text-white/70" : "text-[#6b5440]"}`}>
              Buscando…
            </p>
          )}

          {choices && (
            <section aria-label={`Murais de ${choices.nickname}`} className={`rounded-[1.1em] border p-[1.1em] ${dark ? "border-white/15 bg-[#1c1510]/70 text-[#f6efe2]" : "border-[#d9c9ad] bg-[#fbf6ea]/90 text-[#2f2218]"}`}>
              <p className="text-[0.9em] font-semibold">
                <strong className="break-all">{choices.nickname}</strong> tem {choices.murals.length} murais. Qual você quer abrir?
              </p>
              <ul className="mt-[0.7em] space-y-[0.5em]">
                {choices.murals.map((m) => (
                  <li key={m.slug}>
                    <button
                      type="button"
                      onClick={() => openMural(choices.nickname, m.slug)}
                      className={`w-full cursor-pointer rounded-[0.7em] border px-[0.9em] py-[0.7em] text-left font-semibold transition-colors ${dark ? "border-white/15 bg-white/10 hover:bg-white/20" : "border-[#e1d3ba] bg-white/70 hover:bg-white"}`}
                    >
                      {m.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selected && (
            <UnlockPanel
              key={`${selected.nickname}/${selected.slug}`}
              title={selected.title}
              owner={selected.nickname}
              onSwap={clear}
              question={selected.question}
              unlocked={unlocked}
              onSubmit={submitAnswer}
              inputId={`unlock-${tone}`}
              tone={tone}
            />
          )}
        </div>
      );
    },
    [choices, loading, openMural, pickPerson, selected, submitAnswer, unlocked],
  );

  // sem mural escolhido: um mural de exemplo aleatório, nítido. Mural escolhido e trancado: o exemplo desfocado.
  // Revelado: o mural real, com os pins gravados no banco e o plano do próprio mural.
  // (a ordem aleatória só roda no navegador, depois de montar, para o servidor e o cliente concordarem)
  const [decor, setDecor] = useState<BoardItem[]>(() => buildPool(0).items);
  useEffect(() => setDecor(randomMural(Date.now())), []);
  const revealed = unlocked && !!selected;

  return (
    <>
      <MuralScreen
        items={revealed ? items : decor}
        plan={revealed ? (selected?.plan ?? "free") : "full"}
        showMeter={revealed}
        locked={!!selected && !unlocked}
        hasSelection={!!selected}
        landing={!selected && !choices}
        unlocked={unlocked}
        stats={selected?.stats ?? null}
        siteStats={siteStats}
        board={boardById(selected?.board).id}
        share={selected ? { title: selected.title, path: muralPath({ nick: selected.nickname, slug: selected.slug }) } : null}
        panel={panel}
        onNotify={notify}
        composer={
          revealed
            ? {
                mode: "demo", // mesmo compositor da demonstração, agora gravando no banco
                onSend: onSendPin,
                sentNote: "Pin enviado! Ele aparece para todos quando o dono aprovar. ⏳",
                onTried: () => {
                  setTried(true);
                  if (nick && slug) void getBrowserSupabase().rpc("record_pin_attempt", { p_nick: nick, p_slug: slug, p_visitor_id: getVisitorId() }).then(() => undefined);
                },
                triedAlready: tried,
              }
            : { mode: "soon" }
        }
      />
      <Toast message={toast} />
    </>
  );
}
