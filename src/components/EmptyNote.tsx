import { Pin, Tape } from "./messages/fasteners";

/** Estado de mural sem mensagens: um bilhete preso na cortiça. Tamanho via font-size do pai (em). */
export function EmptyNote({ unlocked }: { unlocked: boolean }) {
  return (
    <article
      className="paper-grain shadow-paper pinned relative mx-auto w-[19em] bg-[#f5f0e2] px-[1.6em] pt-[2.4em] pb-[1.8em] text-center"
      style={{ ["--rot" as string]: "-2deg", borderRadius: "0.2em" }}
    >
      <Tape className="top-[-0.6em] left-1/2 -translate-x-1/2" rotate={-3} />
      <Pin tone="red" className="top-[0.6em] right-[1.4em]" />
      <p className="font-hand text-[1.9em] leading-[1.1] text-[#243a7a]">Ainda não tem nenhum recado por aqui…</p>
      <p className="font-hand mt-[0.4em] text-[1.4em] leading-[1.1] text-[#243a7a]/80">
        {unlocked ? "Que tal ser a primeira pessoa a deixar o seu?" : "Responda a pergunta e seja a primeira pessoa a deixar o seu!"}
      </p>
    </article>
  );
}
