import { isSealed, type BoardItem, type Message } from "@/lib/types";
import { ClosedCapsule } from "./ClosedCapsule";
import { ListCard } from "./ListCard";
import { MusicCard } from "./MusicCard";
import { PaperNote } from "./PaperNote";
import { PolaroidPhoto } from "./PolaroidPhoto";
import { PostIt } from "./PostIt";
import { VideoPrint } from "./VideoPrint";

function Content({ m }: { m: Message }) {
  switch (m.type) {
    case "postit":
      return <PostIt color={m.color} text={m.text} />;
    case "text":
      return <PaperNote text={m.text} variant={m.variant} />;
    case "list":
      return <ListCard title={m.title} items={m.items} />;
    case "photo":
      return <PolaroidPhoto caption={m.caption} scene={m.scene} src={m.src} />;
    case "music":
      return <MusicCard title={m.title} artist={m.artist} caption={m.caption} duration={m.duration} link={m.link} />;
    case "video":
      return <VideoPrint caption={m.caption} duration={m.duration} src={m.src} color={m.playerColor} />;
  }
}

/**
 * Ponto único de renderização de um item do mural: mensagem aberta ou Cápsula fechada.
 * Tamanho: tudo em `em` — quem usa define o `font-size` para escalar.
 */
export function MessageView({ message: m }: { message: BoardItem }) {
  if (isSealed(m)) return <ClosedCapsule opensAt={m.opensAt} />;
  if (!m.fromCapsule) return <Content m={m} />;
  // mensagem que veio de uma Cápsula já aberta: ganha um pequeno lacre no canto
  return (
    <div className="relative">
      <Content m={m} />
      <span
        title="Aberta de uma Cápsula PINZ"
        className="absolute -top-[0.7em] -right-[0.6em] z-30 grid size-[2em] place-items-center rounded-full text-white shadow-[0_0.15em_0.4em_rgba(60,10,5,.5)]"
        style={{ background: "radial-gradient(circle at 35% 30%, #e8554a, #a31d16 70%)" }}
      >
        <span className="sr-only">Aberta de uma Cápsula PINZ</span>
        <svg aria-hidden viewBox="0 0 24 24" className="size-[1em]" fill="currentColor">
          <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Zm6.5 3.5-4 4-2-2 1.1-1.1 0.9 0.9 2.9-2.9 1.1 1.1Z" />
        </svg>
      </span>
    </div>
  );
}
