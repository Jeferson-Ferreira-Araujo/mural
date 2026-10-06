import { Pin, Tape } from "./messages/fasteners";

/** Mensagem padrão do mural vazio (o dono do plano PLUS pode trocá-la). */
export const DEFAULT_WELCOME = "Nenhuma mensagem neste mural. Seja o primeiro a deixar!";

/** Estado de mural sem mensagens: um bilhete preso na cortiça. Tamanho via font-size do pai (em). */
export function EmptyNote({ unlocked, message }: { unlocked: boolean; /** texto personalizado do dono (PLUS) */ message?: string | null }) {
  const text = unlocked ? message?.trim() || DEFAULT_WELCOME : "Responda a pergunta para deixar uma mensagem!";
  return (
    <div style={{ fontSize: "1.7em" }} className="px-[0.3em]">
    <article
      className="paper-grain shadow-paper pinned relative mx-auto w-[19em] max-w-full bg-[#f5f0e2] px-[1.6em] pt-[2.4em] pb-[1.8em] text-center"
      style={{ ["--rot" as string]: "-2deg", borderRadius: "0.2em" }}
    >
      <Tape className="top-[-0.6em] left-1/2 -translate-x-1/2" rotate={-3} />
      <Pin tone="red" className="top-[0.6em] right-[1.4em]" />
      <p className="font-hand text-[1.9em] leading-[1.1] text-[#243a7a] [overflow-wrap:anywhere]">{text}</p>
    </article>
    </div>
  );
}
