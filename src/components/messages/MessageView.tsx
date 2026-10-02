import { isHidden, isSealed, type BoardItem, type Message } from "@/lib/types";
import { HiddenPin } from "./HiddenPin";
import { ClosedCapsule } from "./ClosedCapsule";
import { ListCard } from "./ListCard";
import { MusicCard } from "./MusicCard";
import { PaperNote } from "./PaperNote";
import { PlaceCard } from "./PlaceCard";
import { PolaroidPhoto } from "./PolaroidPhoto";
import { PostIt } from "./PostIt";
import { VideoPrint } from "./VideoPrint";
import { VoiceNote } from "./VoiceNote";

function Content({ m }: { m: Message }) {
  switch (m.type) {
    case "postit":
      return <PostIt color={m.color} text={m.text} font={m.font} pin={m.pin} />;
    case "text":
      return <PaperNote text={m.text} variant={m.variant} font={m.font} tape={m.tape} />;
    case "list":
      return <ListCard title={m.title} items={m.items} font={m.font} tape={m.tape} />;
    case "photo":
      return <PolaroidPhoto caption={m.caption} scene={m.scene} src={m.src} font={m.font} pin={m.pin} tape={m.tape} />;
    case "music":
      return <MusicCard title={m.title} artist={m.artist} caption={m.caption} duration={m.duration} link={m.link} color={m.playerColor} />;
    case "video":
      return <VideoPrint caption={m.caption} duration={m.duration} src={m.src} color={m.playerColor} />;
    case "voice":
      return <VoiceNote caption={m.caption} duration={m.duration} src={m.src} color={m.playerColor} />;
    case "place":
      return <PlaceCard name={m.name} address={m.address} lat={m.lat} lon={m.lon} caption={m.caption} color={m.playerColor} blank={(m as { blank?: boolean }).blank} />;
  }
}

/** Marcas que só o autor (aguardando aprovação) ou o dono (em blur para visitantes) veem sobre o pin. */
function Marked({ m }: { m: Message }) {
  const label = m.pending ? "Aguardando aprovação do dono" : "Em blur para os visitantes";
  return (
    <div className="relative">
      <Content m={m} />
      <span className="absolute -bottom-[0.9em] left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#2a1c12]/90 px-[0.9em] py-[0.3em] text-[0.7em] leading-none font-semibold whitespace-nowrap text-[#fff3d6] shadow-[0_0.2em_0.5em_rgba(0,0,0,.4)]">
        {m.pending ? "⏳ " : "🔒 "}
        {label}
      </span>
    </div>
  );
}

/**
 * Ponto único de renderização de um item do mural: mensagem aberta, Cápsula fechada ou espaço em blur.
 * Tamanho: tudo em `em` — quem usa define o `font-size` para escalar.
 */
export function MessageView({ message: m }: { message: BoardItem }) {
  if (isSealed(m)) return <ClosedCapsule opensAt={m.opensAt} />;
  if (isHidden(m)) return <HiddenPin item={m} />;
  if (m.pending || m.ownerHidden) return <Marked m={m} />;
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
