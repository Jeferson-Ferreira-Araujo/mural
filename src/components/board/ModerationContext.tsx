"use client";

import { createContext, useContext } from "react";
import type { PlanId } from "@/lib/plans";
import type { ReportReason } from "./PinsManager";

/**
 * Só o dono, vendo o próprio mural: moderar um pin direto no destaque (aprovar, recusar, deixar em segredo, relatar abuso).
 * Cada ação devolve true se deu certo.
 */
export type Moderation = {
  plan: PlanId;
  moderate: (id: string, approve: boolean, secret?: boolean) => Promise<boolean>;
  setSecret: (id: string, secret: boolean) => Promise<boolean>;
  /** muda o pin de espaço (arrastando); se o espaço estiver ocupado, os dois trocam de lugar */
  move: (id: string, slot: number) => Promise<boolean>;
  /** deixa o pin solto em qualquer lugar do quadro: x,y em % (centro do pin) e os espaços que ele cobre */
  /** aviso curto na tela */
  notify: (msg: string) => void;
  moveFree: (id: string, x: number, y: number, cov: number[]) => Promise<boolean>;
  report: (id: string, r: { reason: ReportReason; details: string; block: boolean }) => Promise<boolean>;
};

const Ctx = createContext<Moderation | null>(null);
export const ModerationProvider = Ctx.Provider;
export const useModeration = () => useContext(Ctx);
