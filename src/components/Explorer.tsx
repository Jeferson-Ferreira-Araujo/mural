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
import { BOARDS, boardById } from "@/lib/boards";
import type { SendPayload } from "./composer/types";
import { fetchBoard, getSendStatus, listOwnerPins, moderatePin, reportPin, sendBlockedText, sendPin, setPinHidden, updateListPin, SEND_ERROR_TEXT } from "@/lib/pins";
import { getOwnMurals, getOwnNickname, homeRouteFor, loginUrl, useSession, type OwnMural } from "@/lib/auth";
import { Spinner } from "./ui";
import { AccountDrawer } from "./account/AccountDrawer";
import { SearchDialog } from "./account/SearchDialog";
import { FirstTimeTip } from "./account/FirstTimeTip";
import { ModerationProvider } from "./board/ModerationContext";
import { ListEditProvider, type ListData } from "./board/ListEditContext";
import type { ReportReason } from "./board/PinsManager";
import { BadgeProvider } from "./badges/BadgeContext";
import { buyBadge, buyBoard, buyMuralSlot, FREE_BADGES, fetchBadges, fetchInventory, stockFor, type BadgeInventory, type PlacedBadge, type Stock } from "@/lib/badges";
import { StoreModal, type BuyItem } from "./badges/StoreModal";
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
  const [badges, setBadges] = useState<PlacedBadge[]>([]); // pins decorativos do mural aberto
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

  // os murais da pessoa dona do mural aberto (rodapé: setas para trocar)
  const [siblings, setSiblings] = useState<{ slug: string; title: string }[]>([]);
  useEffect(() => {
    if (!nick) {
      setSiblings([]);
      return;
    }
    let cancelled = false;
    void getProfileMurals(getBrowserSupabase(), nick).then((p) => !cancelled && setSiblings(p?.murals ?? []));
    return () => {
      cancelled = true;
    };
  }, [nick, selected?.title]);
  const isOwner = !!myNick && !!selected && selected.nickname === myNick; // vendo o próprio mural

  // murais da própria conta (menu: editar, pins para aprovar, planos...)
  const [own, setOwn] = useState<OwnMural[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [drawer, setDrawer] = useState<{ open: boolean }>({ open: false });
  const [searchOpen, setSearchOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    void getBrowserSupabase().rpc("is_admin").then(({ data }) => setIsAdmin(data === true));
  }, [session]);
  const [inventory, setInventory] = useState<BadgeInventory | null>(null); // créditos e pins que a conta tem
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
  const reloadInventory = useCallback(async () => {
    const inv = await fetchInventory(getBrowserSupabase());
    if (inv) setInventory(inv);
    return inv;
  }, []);
  useEffect(() => {
    if (!session) {
      setInventory(null);
      return;
    }
    void reloadInventory();
  }, [session, reloadInventory]);
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
    const sb = getBrowserSupabase();
    const list = await fetchBoard(sb, { nick, slug }, token);
    if (list) {
      setItems(list);
      void fetchBadges(sb, { nick, slug }, token).then((b) => b && setBadges(b));
    }
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
      setBadges([]);
      return;
    }
    void loadBoard();
    const t = setInterval(() => void loadBoard(), 60_000);
    return () => clearInterval(t);
  }, [unlocked, token, isOwner, loadBoard]);

  // dono: aprova ou recusa um pin pendente direto no destaque
  const afterModeration = useCallback(
    async (ok: boolean, done: string) => {
      if (!ok) {
        notify("Não foi possível concluir agora. Tente de novo.");
        return false;
      }
      notify(done);
      await loadBoard();
      if (firstOwnId) void listOwnerPins(getBrowserSupabase(), firstOwnId).then((l) => l && setPendingCount(l.filter((p) => p.status === "pending").length));
      return true;
    },
    [notify, loadBoard, firstOwnId],
  );
  const moderation = useMemo(
    () => ({
      plan: (own.find((m) => m.slug === slug)?.plan ?? "free") as "free" | "full",
      moderate: async (id: string, approve: boolean, secret = false) =>
        afterModeration(await moderatePin(getBrowserSupabase(), id, approve, secret), approve ? (secret ? "Pin aprovado como segredo." : "Pin aprovado! Já aparece para todos.") : "Pin recusado."),
      setSecret: async (id: string, secret: boolean) => afterModeration(await setPinHidden(getBrowserSupabase(), id, secret), secret ? "Pin em segredo." : "Pin visível para todos."),
      report: async (id: string, r: { reason: ReportReason; details: string; block: boolean }) => afterModeration(await reportPin(getBrowserSupabase(), id, r.reason, r.details, r.block), "Pin relatado e removido."),
    }),
    [afterModeration, own, slug],
  );
  // estoque de pins decorativos (FREE: 1 por pin + extras compradas; PLUS: ilimitado). Enquanto a loja carrega, só os 25 iniciais.
  const ownPlan = own.find((m) => m.slug === slug)?.plan ?? own[0]?.plan ?? "free";
  const placedCount = useMemo(() => {
    const c: Record<number, number> = {};
    badges.forEach((b) => (c[b.key] = (c[b.key] ?? 0) + 1));
    return c;
  }, [badges]);
  const badgeStock = useCallback(
    (key: number): Stock => {
      if (!inventory) return FREE_BADGES.includes(key) ? { owned: true, left: null, total: null } : { owned: false, left: 0, total: 0 };
      return stockFor(inventory.catalog.find((c) => c.key === key), ownPlan, placedCount[key] ?? 0);
    },
    [inventory, ownPlan, placedCount],
  );
  const buy = useCallback(
    async (item: BuyItem) => {
      const sb = getBrowserSupabase();
      const res = item.kind === "badge" ? await buyBadge(sb, item.key, "unlock") : item.kind === "unit" ? await buyBadge(sb, item.key, "unit") : item.kind === "board" ? await buyBoard(sb, item.id) : await buyMuralSlot(sb);
      if (res.ok) {
        notify(item.kind === "unit" ? "+1 unidade adicionada." : item.kind === "badge" ? "Botton liberado! Já está na sua barra." : item.kind === "board" ? "Tema liberado! Aplique em Editar mural." : "Mural extra liberado! Crie o novo mural.");
        await reloadInventory();
      } else notify(res.reason === "no_credits" ? "Créditos insuficientes." : res.reason === "plus_required" ? "Mural extra é do PINZ PLUS." : "Não foi possível concluir a compra agora.");
    },
    [notify, reloadInventory],
  );
  const saveList = useCallback(
    async (l: ListData) => {
      const ok = await updateListPin(getBrowserSupabase(), l.id, l.title, l.items);
      if (ok) await loadBoard();
      return ok;
    },
    [loadBoard],
  );
  const shownItems = isOwner ? items.map((it) => ("pending" in it && it.pending && !("hidden" in it) ? { ...it, ownerReview: true } : it)) : items;

  async function onSendPin(p: SendPayload): Promise<string | void> {
    if (!nick || !slug || (!token && !isOwner)) return SEND_ERROR_TEXT.not_unlocked;
    const res = await sendPin(getBrowserSupabase(), { nick, slug }, isOwner ? null : token, p, session?.user.id);
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
      // abre o primeiro mural; os outros ficam no rodapé (setas)
      await openMural(profile.nickname, profile.murals[0].slug);
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
        // a resposta vale para todos os murais da pessoa: guarda o desbloqueio dos outros também
        for (const [sl, tk] of Object.entries(res.tokens ?? {})) if (sl !== slug) saveGrant({ nick, slug: sl }, tk);
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
              onSwap={logged ? () => setSearchOpen(true) : clear}
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
  // a cada carregamento da tela inicial, o mural de exemplo aparece em um quadro diferente (sorteado no navegador, depois da hidratação)
  const [decorBoard, setDecorBoard] = useState<string>(BOARDS[0].id);
  useEffect(() => {
    setDecor(randomMural(Date.now()));
    setDecorBoard(BOARDS[Math.floor(Math.random() * BOARDS.length)].id);
  }, []);
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

  // quem está logado não tem tela inicial: vai direto para o próprio mural (a busca fica no cabeçalho)
  const goHome = logged && !initialRef && !selected && !choices && !loading;
  useEffect(() => {
    if (!goHome) return;
    void homeRouteFor(getBrowserSupabase()).then((to) => window.location.replace(to));
  }, [goHome]);
  if (goHome) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#2a1a0e]">
        <Spinner />
      </main>
    );
  }

  return (
    <div data-explorer className="contents">
      {playIntro && <IntroAnimation />}
      <ModerationProvider value={isOwner ? moderation : null}>
        <ListEditProvider onSave={saveList}>
        <BadgeProvider muralId={own.find((m) => m.slug === slug)?.id} editable={isOwner && !!own.find((m) => m.slug === slug)} badges={badges} setBadges={setBadges} notify={notify} stock={badgeStock} onOpenStore={() => setStoreOpen(true)}>
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
          board={boardById(selected ? selected.board : decorBoard).id}
          // sem "Compartilhar": quem está vendo o mural de outra pessoa não é o dono (o dono copia o link no menu)
          share={null}
          muralInfo={selected ? { title: selected.title, owner: selected.nickname, avatar: selected.avatar } : undefined}
          onChangeMural={clear}
          panel={panel}
          onNotify={notify}
          account={logged ? { onSearch: () => setSearchOpen(true), onHome: () => void homeRouteFor(getBrowserSupabase()).then((to) => (to === window.location.pathname ? undefined : window.location.assign(to))), onMenu: () => setDrawer({ open: true }), badge: pendingCount } : undefined}
          muralSwitch={nick && slug && siblings.length > 1 ? { items: siblings, current: slug, onSelect: (sl) => void openMural(nick, sl) } : undefined}
        guestNext={!logged && !sessionLoading && nick && slug ? `/${nick}/${slug}` : undefined}
          composer={
            isOwner
              ? {
                  mode: "demo", // o dono também publica no próprio mural: o pin já entra aprovado
                  onSend: onSendPin,
                  sentNote: "Pin colado no seu mural! 📌",
                  onTried: () => undefined,
                  triedAlready: false,
                  signAs: myNick,
                }
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
                  canOpen: async () => (nick && slug ? sendBlockedText(await getSendStatus(getBrowserSupabase(), { nick, slug }, token)) : null),
                signAs: myNick,
                  // sem conta: o pin só pode ser anônimo; para assinar, entra/cria conta e volta para este mural
                  inviteHref: !logged ? "/entrar" : undefined,
                  loginHref: !logged && nick && slug ? loginUrl(`/${nick}/${slug}`) : undefined,
                }
              : { mode: "soon" }
          }
        />
        </BadgeProvider>
        </ListEditProvider>
      </ModerationProvider>
      {logged && myNick && (
        <>
          <AccountDrawer
            open={drawer.open}
            onClose={() => setDrawer((d) => ({ ...d, open: false }))}
            nick={myNick}
            email={session?.user.email ?? ""}
            murals={own}
            currentSlug={isOwner ? slug : undefined}
            pendingCount={pendingCount}
            credits={inventory?.credits ?? 0}
            isAdmin={isAdmin}
            onOpenStore={() => {
              setDrawer({ open: false });
              setStoreOpen(true);
            }}
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
          <StoreModal open={storeOpen} onClose={() => setStoreOpen(false)} inventory={inventory} onBuy={buy} />
          <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={(n) => void pickPerson(n)} />
        </>
      )}
      <FirstTimeTip uid={session?.user.id} createdAt={session?.user.created_at} ready={isOwner && unlocked} />
      <Toast message={toast} />
    </div>
  );
}
