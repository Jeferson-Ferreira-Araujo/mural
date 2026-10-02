import type { ReactNode } from "react";
import type { MuralStats } from "@/lib/mural";
import type { Message } from "@/lib/types";

export type Tone = "light" | "dark";

/** O que o Explorer entrega às duas visualizações (desktop e mobile). */
export type ViewProps = {
  /** Mensagens do quadro. Enquanto estiver bloqueado, são só decoração desfocada. */
  messages: Message[];
  /** Quadro desfocado até a pessoa acertar a pergunta. */
  locked: boolean;
  /** Existe um mural escolhido? (muda o texto do aviso sobre o quadro) */
  hasSelection: boolean;
  unlocked: boolean;
  /** Números do mural escolhido (null = nenhum escolhido). */
  stats: MuralStats | null;
  /** Para o botão Compartilhar (null = nada para compartilhar). */
  share: { title: string; path: string } | null;
  /** Busca, escolha do mural e pergunta de desbloqueio; cada visualização escolhe o tom. */
  panel: (tone: Tone) => ReactNode;
  onNotify: (msg: string) => void;
};
