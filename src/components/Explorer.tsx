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
  saveGrant,
  tryUnlock,
  type ProfileMurals,
  type PublicMural,
  type SiteStats,
  type UnlockResult,
} from "@/lib/mural";
import { boardById } from "@/lib/boards";
import type { SendPayload } from "./composer/types";
import { fetchBoard, listOwnerPins, moderatePin, sendPin, SEND_ERROR_TEXT } from "@/lib/pins";
import { getOwnMurals, getOwnNickname, loginUrl, useSession, type OwnMural } from "@/lib/auth";
import { AccountDrawer, type DrawerSection } from "./account/AccountDrawer";
import { SearchDialog } from "./account/SearchDialog";
import { ModerationProvider } from "./board/ModerationContext";
import { getBrowserSupabase } from "@/lib/supabase";
import type { BoardItem } from "@/lib/types";
import { AuthForm } from "./AuthForm";
import { IntroAnimation, introSeen, introSkip } from "./IntroAnimation";
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
export function Explorer({ initialRef }: { initialRef?: { nick: string; slug: string } }) {
  const { session, loading: sessionLoading } = useSession();
  const logged = !!session;
  const [myNick, setMyNick] = useState<string | null>(null); // nickname de quem está logado (assinatura do pin)
  const [selected, setSelected] = useState<PublicMural | null>(null);
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

  useEffect(() => {
    if (!session) {
      setMyNick(null);
      return;
    }
    void getOwnNickname(getBrowserSupabase()).then(setMyNick);
  }, [session]);

  const nick = selected?.nickname;
  const slug = selected?.slug;
  const isOwner = !!myNick && !!selected && selected.nickname === myNick; // vendo o próprio mural

  // murais da própria conta (menu: editar, pins para aprovar, planos...)
  const [own, setOwn] = useState<OwnMural[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [drawer, setDrawer] = useState<{ open: boolean; section?: DrawerSection }>({ open: false });
  const [searchOpen, setSearchOpen] = useState(false);
  const reloadOwn = useCallback(async () => {
    const list = await getOwnMurals(getBrowserSupabase());
    setOwn(list);
    return list;
  }, []);
  useEffect(() => {
    if (!session) {
      setOwn([]);
      return;
    }
    void reloadOwn();
  }, [session, reloadOwn]);
  const firstOwnId = own[0]?.id;
  useEffect(() => {
    if (!firstOwnId) return;
    const load = () => void listOwnerPins(getBrowserSupabase(), firstOwnId).then((l) => l && setPendingCount(l.filter((p) => p.status === "pending").length));
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [firstOwnId]);

  // o dono vendo o próprio mural entra direto (sem pergunta nem token)
  useEffect(() => {
    if (isOwner && !unlocked) setUnlocked(true);
  }, [isOwner, unlocked]);

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

  const autoKey = useRef<string | null>(null); // mural público já entrou sozinho?

  // tranca o mural de novo (desbloqueio vencido, apagado pelo dono ou inválido): precisa responder a pergunta outra vez
  const openMural_ = selected?.open === true;
  const relock = useCallback(
    (why: string) => {
      if (nick && slug) clearGrant({ nick, slug });
      setToken(null);
      setUnlocked(false);
      setItems([]);
      autoKey.current = null;
      if (!openMural_) notify(why); // mural público volta a entrar sozinho, sem aviso
      // a pergunta pode ter mudado: mostra a atual
      if (nick && slug) void getPublicMural(getBrowserSupabase(), { nick, slug }).then((m) => m && setSelected(m));
    },
    [nick, slug, notify, openMural_],
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
    if (!unlocked || (!token && !isOwner)) {
      setItems([]);
      return;
    }
    void loadBoard();
    const t = setInterval(() => void loadBoard(), 60_000);
    return () => clearInterval(t);
  }, [unlocked, token, isOwner, loadBoard]);

  // dono: aprova ou recusa um pin pendente direto no destaque
  const moderate = useCallback(
    async (id: string, approve: boolean) => {
      const ok = await moderatePin(getBrowserSupabase(), id, approve);
      if (!ok) {
        notify("Não foi possível concluir agora. Tente de novo.");
        return false;
      }
      notify(approve ? "Pin aprovado! Já aparece para todos." : "Pin recusado.");
      await loadBoard();
      if (firstOwnId) void listOwnerPins(getBrowserSupabase(), firstOwnId).then((l) => l && setPendingCount(l.filter((p) => p.status === "pending").length));
      return true;
    },
    [notify, loadBoard, firstOwnId],
  );
  const shownItems = isOwner ? items.map((it) => ("pending" in it && it.pending && !("hidden" in it) ? { ...it, ownerReview: true } : it)) : items;

  async function onSendPin(p: SendPayload): Promise<string | void> {
    if (!nick || !slug || !token) return SEND_ERROR_TEXT.not_unlocked;
    const res = await sendPin(getBrowserSupabase(), { nick, slug }, token, p);
    if (res.ok) {
      await loadBoard();
      return;
    }
    if (res.reason === "not_authenticated") return SEND_ERROR_TEXT.not_authenticated;
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
      try {
        window.history.replaceState(null, "", `/${m.nickname}/${m.slug}`);
      } catch {}
    },
    [notify],
  );

  // link direto (/nickname/mural): abre assim que a pessoa estiver logada
  const opened = useRef(false);
  useEffect(() => {
    if (!initialRef || opened.current) return; // por link, qualquer pessoa abre o mural (sem conta)
    opened.current = true;
    void openMural(initialRef.nick, initialRef.slug);
  }, [initialRef, openMural]);

  // saiu da conta: fecha o mural
  useEffect(() => {
    if (sessionLoading || logged || initialRef) return;
    setSelected(null);
    setChoices(null);
    setUnlocked(false);
    setToken(null);
    opened.current = false;
  }, [sessionLoading, logged, initialRef]);

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

  // mural público (sem pergunta): entra direto, sem digitar nada
  useEffect(() => {
    if (!selected?.open || unlocked || !nick || !slug) return;
    const key = `${nick}/${slug}`;
    if (autoKey.current === key) return;
    autoKey.current = key;
    void submitAnswer("");
  }, [selected?.open, unlocked, nick, slug, submitAnswer]);

  const panel = useCallback(
    (tone: Tone) => {
      const dark = tone === "dark";
      return (
        <div className="space-y-[1.2em]">
          {/* a busca só aparece sem mural escolhido ("Trocar" volta para ela) */}
          {!selected && logged && <SearchBox onSelect={pickPerson} tone={tone} />}
          {!logged && !sessionLoading && !initialRef && <AuthForm />}
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
              avatar={selected.avatar}
              onSwap={clear}
              question={selected.question}
              open={selected.open || isOwner}
              unlocked={unlocked}
              onSubmit={submitAnswer}
              inputId={`unlock-${tone}`}
              tone={tone}
            />
          )}
        </div>
      );
    },
    [choices, loading, logged, sessionLoading, initialRef, openMural, pickPerson, selected, submitAnswer, unlocked],
  );

  // sem mural escolhido: um mural de exemplo aleatório, nítido. Mural escolhido e trancado: o exemplo desfocado.
  // Revelado: o mural real, com os pins gravados no banco e o plano do próprio mural.
  // (a ordem aleatória só roda no navegador, depois de montar, para o servidor e o cliente concordarem)
  const [decor, setDecor] = useState<BoardItem[]>(() => buildPool(0).items);
  useEffect(() => setDecor(randomMural(Date.now())), []);
  const revealed = unlocked && !!selected;

  // abertura animada: só na tela inicial, para quem ainda não entrou, uma vez por visita
  const [playIntro, setPlayIntro] = useState(false);
  const introChecked = useRef(false);
  useEffect(() => {
    if (introChecked.current || sessionLoading) return;
    introChecked.current = true;
    if (!logged && !introSeen()) setPlayIntro(true);
    else introSkip();
  }, [sessionLoading, logged]);

  return (
    <div data-explorer className="contents">
      {playIntro && <IntroAnimation />}
      <ModerationProvider value={isOwner ? { moderate } : null}>
        <MuralScreen
          items={revealed ? shownItems : decor}
          plan={revealed ? (selected?.plan ?? "free") : "full"}
          showMeter={revealed}
          locked={!!selected && !unlocked}
          hasSelection={!!selected}
          landing={!selected && !choices}
          unlocked={unlocked}
          stats={selected?.stats ?? null}
          siteStats={siteStats}
          board={boardById(selected?.board).id}
          // sem "Compartilhar": quem está vendo o mural de outra pessoa não é o dono (o dono copia o link no menu)
          share={null}
          muralInfo={selected ? { title: selected.title, owner: selected.nickname, avatar: selected.avatar } : undefined}
          onChangeMural={clear}
          welcome={selected?.welcome}
          panel={panel}
          onNotify={notify}
          account={logged ? { onSearch: () => setSearchOpen(true), onMenu: () => setDrawer({ open: true, section: pendingCount > 0 ? "pins" : undefined }), badge: pendingCount } : undefined}
          guestNext={!logged && !sessionLoading && nick && slug ? `/${nick}/${slug}` : undefined}
          composer={
            isOwner
              ? { mode: "hidden" }
              : revealed
              ? {
                  mode: "demo", // mesmo compositor da demonstração, agora gravando no banco
                  onSend: onSendPin,
                  sentNote: "Pin enviado! Ele aparece para todos quando o dono aprovar. ⏳",
                  onTried: () => {
                    setTried(true);
                    if (nick && slug) void getBrowserSupabase().rpc("record_pin_attempt", { p_nick: nick, p_slug: slug, p_visitor_id: getVisitorId() }).then(() => undefined);
                  },
                  triedAlready: tried,
                  signAs: myNick,
                  // sem conta: o pin só pode ser anônimo; para assinar, entra/cria conta e volta para este mural
                  inviteHref: !logged ? "/entrar" : undefined,
                  loginHref: !logged && nick && slug ? loginUrl(`/${nick}/${slug}`) : undefined,
                }
              : { mode: "soon" }
          }
        />
      </ModerationProvider>
      {logged && myNick && (
        <>
          <AccountDrawer
            open={drawer.open}
            onClose={() => setDrawer((d) => ({ ...d, open: false }))}
            nick={myNick}
            murals={own}
            currentSlug={isOwner ? slug : undefined}
            initial={drawer.section}
            onPending={setPendingCount}
            onNotify={notify}
            onChanged={() => {
              void reloadOwn();
              if (nick && slug) void getPublicMural(getBrowserSupabase(), { nick, slug }).then((m) => m && setSelected(m));
            }}
            onDeleted={() => window.location.assign("/criar")}
            onSignOut={() => {
              void getBrowserSupabase().auth.signOut().then(() => window.location.assign("/"));
            }}
          />
          <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={(n) => void pickPerson(n)} />
        </>
      )}
      <Toast message={toast} />
    </div>
  );
}
