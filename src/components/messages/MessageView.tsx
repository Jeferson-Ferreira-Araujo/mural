import type { Message } from "@/lib/types";
import { AudioSlip } from "./AudioSlip";
import { MusicSleeve } from "./MusicSleeve";
import { PaperNote } from "./PaperNote";
import { PolaroidPhoto } from "./PolaroidPhoto";
import { PostIt } from "./PostIt";
import { VideoPrint } from "./VideoPrint";

/**
 * Ponto único de renderização de uma mensagem.
 * Os próximos tipos (lista, desenho, localização) entram aqui como novos cases.
 * Tamanho: tudo em `em` — quem usa define o `font-size` para escalar.
 */
export function MessageView({ message: m }: { message: Message }) {
  switch (m.type) {
    case "postit":
      return <PostIt color={m.color} text={m.text} />;
    case "text":
      return <PaperNote text={m.text} compact={m.compact} />;
    case "photo":
      return <PolaroidPhoto caption={m.caption} />;
    case "video":
      return <VideoPrint caption={m.caption} duration={m.duration} />;
    case "audio":
      return <AudioSlip caption={m.caption} duration={m.duration} />;
    case "music":
      return <MusicSleeve title={m.title} artist={m.artist} />;
  }
}
