import type { ReactNode } from "react";
import type { MuralStats } from "@/lib/mural";
import type { PlanId } from "@/lib/plans";
import type { BoardItem } from "@/lib/types";

export type Tone = "light" | "dark";

/** O que o Explorer / a demonstração entregam às duas visualizações (desktop e mobile). */
export type ViewProps = {
  /** Mensagens e cápsulas fechadas do quadro, na ordem dos espaços. Bloqueado = só decoração desfocada. */
  items: BoardItem[];
  /** Plano do mural: define quantos dos 15 espaços estão liberados e quais formatos existem. */
  plan: PlanId;
  /** Mostra o contador de espaços e o selo do plano. */
  showMeter: boolean;
  /** Quadro desfocado até a pessoa acertar a pergunta. */
  locked: boolean;
  /** Existe um mural escolhido? (muda o texto do aviso sobre o quadro) */
  hasSelection: boolean;
  unlocked: boolean;
  /** Números do mural escolhido (null = nenhum escolhido). */
  stats: { visited: number; tried: number; correct: number; messages: number } | null;
  /** Para o botão Compartilhar (null = nada para compartilhar). */
  share: { title: string; path: string } | null;
  /** Busca, escolha do mural e pergunta de desbloqueio; cada visualização escolhe o tom. */
  panel: (tone: Tone) => ReactNode;
  /** Texto do divisor acima do painel na barra lateral (padrão: "ou encontre um mural"). */
  panelTitle?: string;
  /** Avisos do proprietário, etc. (opcional). */
  notice?: (tone: Tone) => ReactNode;
  /** Botão "Deixar uma mensagem anônima"; null = escondido (ex.: visão do dono). */
  onCompose: (() => void) | null;
  onNotify: (msg: string) => void;
};
