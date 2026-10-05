"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { itemsFor } from "@/data/mock";
import { canChangeBoard, DEFAULT_BOARD, type BoardId } from "@/lib/boards";
import { BOARD_CAPACITY, slotsFor, type PlanId } from "@/lib/plans";
import { isMessage, isSealed, type BoardItem, type HiddenItem, type Message } from "@/lib/types";
import { OwnerAlert } from "../board/OwnerAlert";
import { PinsManager, type OwnerPin } from "../board/PinsManager";
import type { SendPayload } from "../composer/types";

/** Nickname fictício de quem "está logado" na demonstração (para testar a opção de assinar). */
const DEMO_NICK = "voce";
import { MuralScreen } from "../MuralScreen";
import { Toast } from "../Toast";
import { useToast } from "../useToast";
import { DemoControls, type DemoView } from "./DemoControls";

type Board = { items: BoardItem[]; vault: Record<string, Message> };

const START_PLAN: PlanId = "free";
const START_COUNT = 3;
const START_TRIES = 8;

let uid = 0;

/**
 * Demonstração do modelo do Pinz com dados locais: planos FREE/PLUS, 15/28 e 28/28,
 * mural lotado, "Eu tentei deixar um PINZ" e Cápsula. Nada é salvo nem enviado.
 */
export function DemoMural() {
  const { message: toast, notify } = useToast();
  const [plan, setPlan] = useState<PlanId>(START_PLAN);
  const [board, setBoard] = useState<Board>(() => itemsFor(START_PLAN, START_COUNT, Date.now(), BOARD_CAPACITY));
  const [view, setView] = useState<DemoView>("visitor");
  const [tries, setTries] = useState(START_TRIES);
  const [triedAlready, setTriedAlready] = useState(false);
  const capacity = BOARD_CAPACITY;
  const [credits, setCredits] = useState(false);
  const [boardId, setBoardId] = useState<BoardId>(DEFAULT_BOARD);
  // moderação (simulada): pins novos ficam pendentes até o dono aprovar; no PLUS o dono deixa pins em blur
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const available = slotsFor(plan, capacity);

  const fill = useCallback((p: PlanId, n: number, cap: number = capacity) => setBoard(itemsFor(p, Math.max(0, Math.min(n, slotsFor(p, cap))), Date.now(), cap)), [capacity]);

  /** Abre as cápsulas cuja data já chegou (`force` abre todas). O conteúdo só passa a existir no quadro agora. */
  const openCapsules = useCallback((force: boolean) => {
    setBoard((b) => {
      const now = Date.now();
      let changed = false;
      const items = b.items.map((it) => {
        if (!isSealed(it) || (!force && new Date(it.opensAt).getTime() > now)) return it;
        const content = b.vault[it.id];
        if (!content) return it;
        changed = true;
        return { ...content, id: it.id, fromCapsule: true } as Message;
      });
      return changed ? { ...b, items } : b;
    });
  }, []);

  // de tempos em tempos, abre o que já chegou na hora
  useEffect(() => {
    const t = setInterval(() => openCapsules(false), 20_000);
    return () => clearInterval(t);
  }, [openCapsules]);

  function changePlan(p: PlanId) {
    setPlan(p);
    if (!canChangeBoard(p, credits ? 1 : 0)) setBoardId(DEFAULT_BOARD);
    fill(p, board.items.length);
  }

  function onSend({ message: draft, capsuleAt, slot }: SendPayload) {
    const message = { ...draft, signedBy: DEMO_NICK } as typeof draft;
    setBoard((b) => {
      if (b.items.length >= available || b.items.some((it) => it.slot === slot)) return b;
      const id = `u${++uid}`;
      setPendingIds((s) => new Set(s).add(id));
      if (capsuleAt) {
        // o conteúdo fica "guardado" e o quadro recebe só a cápsula fechada (sem conteúdo)
        return {
          items: [...b.items, { id, slot, sealed: true, opensAt: capsuleAt }],
          vault: { ...b.vault, [id]: { ...message, id, fromCapsule: true } as Message },
        };
      }
      return { ...b, items: [...b.items, { ...message, id, slot } as Message] };
    });
  }

  function reset() {
    setPlan(START_PLAN);
    setBoard(itemsFor(START_PLAN, START_COUNT, Date.now(), BOARD_CAPACITY));
    setView("visitor");
    setTries(START_TRIES);
    setTriedAlready(false);
    setCredits(false);
    setBoardId(DEFAULT_BOARD);
    setPendingIds(new Set());
    setHiddenIds(new Set());
    notify("Demonstração reiniciada.");
  }

  const full = board.items.length >= available;

  // o que cada visão recebe (igual ao servidor): visitante vê os próprios pins pendentes e os ocultos viram blur com o mesmo tipo;
  // o dono vê os pendentes como espaço ocupado (ele decide no gerenciador) e os ocultos marcados.
  const shownItems = useMemo<BoardItem[]>(() => {
    const blur = (m: Message): HiddenItem => ({
      id: m.id,
      slot: m.slot,
      hidden: true,
      type: m.type,
      color: m.type === "postit" ? m.color : undefined,
      variant: m.type === "text" ? m.variant : undefined,
      playerColor: "playerColor" in m ? m.playerColor : undefined,
      font: m.font,
      pin: m.pin,
      tape: m.tape,
    });
    return board.items.map((it) => {
      if (!isMessage(it)) return it;
      const pending = pendingIds.has(it.id);
      const hidden = plan === "full" && hiddenIds.has(it.id);
      if (view === "owner") return pending ? { ...blur(it), pending: true } : hidden ? { ...it, ownerHidden: true } : it;
      if (pending) return { ...it, pending: true }; // na demo, todo pin novo é "meu"
      return hidden ? blur(it) : it;
    });
  }, [board.items, pendingIds, hiddenIds, plan, view]);

  const ownerPins: OwnerPin[] = board.items.filter(isMessage).map((m) => ({ ...m, status: pendingIds.has(m.id) ? "pending" : "approved", hiddenFromVisitors: hiddenIds.has(m.id) }));
  const without = (s: Set<string>, id: string) => {
    const n = new Set(s);
    n.delete(id);
    return n;
  };
  const manager = (tone: "light" | "dark") => (
    <PinsManager
      pins={ownerPins}
      plan={plan}
      tone={tone}
      onApprove={(id, hidden) => {
        setPendingIds((s) => without(s, id));
        if (hidden) setHiddenIds((s) => new Set(s).add(id));
        notify(hidden ? "Pin aprovado e deixado em blur para os visitantes." : "Pin aprovado: agora aparece no mural.");
      }}
      onReject={(id) => {
        setBoard((b) => ({ ...b, items: b.items.filter((it) => it.id !== id) }));
        setPendingIds((s) => without(s, id));
        setHiddenIds((s) => without(s, id));
        notify("Pin removido. O espaço ficou livre.");
      }}
      onSetHidden={(id, hidden) => setHiddenIds((s) => (hidden ? new Set(s).add(id) : without(s, id)))}
      onReport={(id, r) => {
        setBoard((b) => ({ ...b, items: b.items.filter((it) => it.id !== id) }));
        setPendingIds((s) => without(s, id));
        setHiddenIds((s) => without(s, id));
        notify(r.block ? "Relato registrado (simulação). O pin saiu do mural e quem enviou foi bloqueado." : "Relato registrado (simulação). O pin saiu do mural.");
      }}
    />
  );
  const hasSealed = board.items.some(isSealed);

  const panel = useCallback(
    (tone: "light" | "dark") => (
      <DemoControls
        tone={tone}
        plan={plan}
        onPlan={changePlan}
        count={board.items.length}
        onCount={(n) => fill(plan, n)}
        view={view}
        onView={setView}
        hasSealed={hasSealed}
        manager={view === "owner" ? manager : null}
        onOpenCapsules={() => openCapsules(true)}
        onReset={reset}
        capacity={capacity}
        credits={credits}
        onCredits={(v) => {
          setCredits(v);
          if (!v && plan === "free") setBoardId(DEFAULT_BOARD);
        }}
        board={boardId}
        onBoard={setBoardId}
        onBoardLocked={() => notify("Trocar o fundo é do PINZ PLUS ou de quem comprou créditos.")}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, board.items.length, view, hasSealed, credits, boardId, capacity, pendingIds, hiddenIds, board.items],
  );

  const notice = useMemo(
    () => (view === "owner" && full ? (tone: "light" | "dark") => <OwnerAlert tries={tries} tone={tone} planLimit={plan === "free" && capacity > available ? available : 0} /> : undefined),
    [view, full, tries, plan, capacity, available],
  );

  return (
    <>
      <MuralScreen
        items={shownItems}
        plan={plan}
        board={boardId}
        capacity={capacity}
        showMeter
        locked={false}
        hasSelection
        unlocked
        stats={{ visited: 127, tried: 83, correct: 31, messages: board.items.length }}
        share={null}
        panel={panel}
        panelTitle="ou veja como funciona"
        notice={notice}
        onNotify={notify}
        composer={
          view === "owner"
            ? { mode: "hidden" }
            : {
                mode: "demo",
                sentNote: "Pin enviado! Ele aparece para todos quando o dono aprovar. ⏳ (veja em \"Dono do mural\")",
                onSend,
                onTried: () => {
                  setTries((t) => t + 1);
                  setTriedAlready(true);
                },
                triedAlready,
                signAs: DEMO_NICK,
              }
        }
      />
      <Toast message={toast} />
    </>
  );
}
