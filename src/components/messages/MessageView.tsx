import type { Message } from "@/lib/types";
import { AudioSlip } from "./AudioSlip";
import { DrawingCard } from "./DrawingCard";
import { ListCard } from "./ListCard";
import { MusicCard } from "./MusicCard";
import { PaperNote } from "./PaperNote";
import { PolaroidPhoto } from "./PolaroidPhoto";
import { PostIt } from "./PostIt";
import { VideoPrint } from "./VideoPrint";

/**
 * Ponto único de renderização de uma mensagem.
 * Novos tipos (ex.: localização) entram aqui como novos cases.
 * Tamanho: tudo em `em` — quem usa define o `font-size` para escalar.
 */
export function MessageView({ message: m }: { message: Message }) {
  switch (m.type) {
    case "postit":
      return <PostIt color={m.color} text={m.text} />;
    case "text":
      return <PaperNote text={m.text} variant={m.variant} />;
    case "photo":
      return <PolaroidPhoto caption={m.caption} scene={m.scene} />;
    case "video":
      return <VideoPrint caption={m.caption} duration={m.duration} />;
    case "audio":
      return <AudioSlip text={m.text} duration={m.duration} />;
    case "music":
      return <MusicCard title={m.title} artist={m.artist} caption={m.caption} duration={m.duration} />;
    case "list":
      return <ListCard title={m.title} items={m.items} />;
    case "draw":
      return <DrawingCard caption={m.caption} />;
  }
}
