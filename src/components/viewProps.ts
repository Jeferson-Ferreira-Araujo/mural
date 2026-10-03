import type { ReactNode } from "react";
import type { MuralStats, SiteStats } from "@/lib/mural";
import type { BoardId } from "@/lib/boards";
import type { PlanId } from "@/lib/plans";
import type { BoardItem } from "@/lib/types";

export type Tone = "light" | "dark";

/** O que o Explorer / a demonstração entregam às duas visualizações (desktop e mobile). */
export type ViewProps = {
  /** Mensagens e cápsulas fechadas do quadro, na ordem dos espaços. Bloqueado = só decoração desfocada. */
  items: BoardItem[];
  /** Plano do mural: define quantos dos 28 espaços estão liberados e quais formatos existem. */
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
  /** Números do site inteiro, mostrados no rodapé da barra quando nenhum mural está escolhido. */
  siteStats?: SiteStats | null;
  /** O compositor de pins está aberto (o mural em tela cheia do celular volta quando ele fecha). */
  composing?: boolean;
  /** Celular: recebe o elemento do mural em tela cheia (ou null ao fechar), para o compositor abrir dentro dele. */
  onViewerStage?: (el: HTMLElement | null) => void;
  /** Celular: abrir o mural em tela cheia assim que for desbloqueado. */
  autoOpenBoard?: boolean;
  /** Quem é o dono do mural aberto (mostrado nas laterais do mural em tela cheia). */
  muralInfo?: { title: string; owner: string; avatar?: string | null };
  /** Quantos espaços o quadro tem (padrão 15; 30 = teste do quadro denso). */
  capacity?: number;
  /** Fundo do mural (padrão: cortiça). */
  board?: BoardId;
  /** Para o botão Compartilhar (null = nada para compartilhar). */
  share: { title: string; path: string } | null;
  /** Busca, escolha do mural e pergunta de desbloqueio; cada visualização escolhe o tom. */
  panel: (tone: Tone) => ReactNode;
  /** Celular: nenhuma pessoa/mural escolhido ainda → tela inicial com logo grande e busca no meio. */
  landing?: boolean;
  /** Texto do divisor acima do painel na barra lateral (sem título, não mostra o divisor). */
  panelTitle?: string;
  /** Avisos do proprietário, etc. (opcional). */
  notice?: (tone: Tone) => ReactNode;
  /** Botão "Deixar uma mensagem anônima"; null = escondido (ex.: visão do dono). */
  onCompose: ((slot?: number) => void) | null;
  onNotify: (msg: string) => void;
};
