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
  /** nome de usuário do dono do mural (vai na imagem de compartilhar) */
  nick?: string;
  /** foto de perfil do dono do mural (vai na imagem de compartilhar, no lugar do logo) */
  avatar?: string | null;
  moderate: (id: string, approve: boolean, secret?: boolean) => Promise<boolean>;
  /** apaga um pin que o dono já aprovou (mesma operação de recusar, com o aviso certo: "Pin apagado.") */
  remove: (id: string) => Promise<boolean>;
  setSecret: (id: string, secret: boolean) => Promise<boolean>;
  /** fixa o pin: ele não vence com o prazo de validade do mural */
  setPinned: (id: string, pinned: boolean) => Promise<boolean>;
  /** muda o pin de espaço (arrastando); se o espaço estiver ocupado, os dois trocam de lugar */
  move: (id: string, slot: number) => Promise<boolean>;
  /** aviso curto na tela */
  notify: (msg: string) => void;
  /** leva o pin para onde o dono soltou: passa a pertencer ao espaço `slot` (deslocado ox, oy em "em" do quadro) e cobre os espaços de `cov` */
  nudge: (id: string, slot: number, ox: number, oy: number, cov: number[]) => Promise<boolean>;
  /** só o dono: tira o pin do mural e o guarda em Meus pins > Arquivados (dá para colocar de volta) */
  archive?: (id: string) => Promise<boolean>;
  report: (id: string, r: { reason: ReportReason; details: string; block: boolean }) => Promise<boolean>;
};

const Ctx = createContext<Moderation | null>(null);
export const ModerationProvider = Ctx.Provider;
export const useModeration = () => useContext(Ctx);
