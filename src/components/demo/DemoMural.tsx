"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { itemsFor } from "@/data/mock";
import { canChangeBoard, DEFAULT_BOARD, type BoardId } from "@/lib/boards";
import { BOARD_CAPACITY, slotsFor, type PlanId } from "@/lib/plans";
import { isSealed, type BoardItem, type Message } from "@/lib/types";
import { OwnerAlert } from "../board/OwnerAlert";
import type { SendPayload } from "../composer/types";
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
 * Demonstração do modelo do Pinz com dados locais: planos FREE/FULL, 5/15 e 15/15,
 * mural lotado, "Eu tentei deixar um PINZ" e Cápsula. Nada é salvo nem enviado.
 */
export function DemoMural() {
  const { message: toast, notify } = useToast();
  const [plan, setPlan] = useState<PlanId>(START_PLAN);
  const [board, setBoard] = useState<Board>(() => itemsFor(START_PLAN, START_COUNT, Date.now(), BOARD_CAPACITY));
  const [view, setView] = useState<DemoView>("visitor");
  const [tries, setTries] = useState(START_TRIES);
  const [triedAlready, setTriedAlready] = useState(false);
  const [capacity, setCapacity] = useState<number>(BOARD_CAPACITY);
  const [credits, setCredits] = useState(false);
  const [boardId, setBoardId] = useState<BoardId>(DEFAULT_BOARD);

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

  function onSend({ message, capsuleAt }: SendPayload) {
    setBoard((b) => {
      if (b.items.length >= available) return b;
      const id = `u${++uid}`;
      if (capsuleAt) {
        // o conteúdo fica "guardado" e o quadro recebe só a cápsula fechada (sem conteúdo)
        return {
          items: [...b.items, { id, sealed: true, opensAt: capsuleAt }],
          vault: { ...b.vault, [id]: { ...message, id, fromCapsule: true } as Message },
        };
      }
      return { ...b, items: [...b.items, { ...message, id } as Message] };
    });
  }

  function reset() {
    setPlan(START_PLAN);
    setCapacity(BOARD_CAPACITY);
    setBoard(itemsFor(START_PLAN, START_COUNT, Date.now(), BOARD_CAPACITY));
    setView("visitor");
    setTries(START_TRIES);
    setTriedAlready(false);
    setCredits(false);
    setBoardId(DEFAULT_BOARD);
    notify("Demonstração reiniciada.");
  }

  const full = board.items.length >= available;
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
        onOpenCapsules={() => openCapsules(true)}
        onReset={reset}
        capacity={capacity}
        onCapacity={(n) => {
          setCapacity(n);
          fill(plan, board.items.length, n);
        }}
        credits={credits}
        onCredits={(v) => {
          setCredits(v);
          if (!v && plan === "free") setBoardId(DEFAULT_BOARD);
        }}
        board={boardId}
        onBoard={setBoardId}
        onBoardLocked={() => notify("Trocar o fundo é do PINZ FULL ou de quem comprou créditos.")}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, board.items.length, view, hasSealed, credits, boardId, capacity],
  );

  const notice = useMemo(
    () => (view === "owner" && full ? (tone: "light" | "dark") => <OwnerAlert tries={tries} tone={tone} /> : undefined),
    [view, full, tries],
  );

  return (
    <>
      <MuralScreen
        items={board.items}
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
                onSend,
                onTried: () => {
                  setTries((t) => t + 1);
                  setTriedAlready(true);
                },
                triedAlready,
              }
        }
      />
      <Toast message={toast} />
    </>
  );
}
