import { reactionEmoji } from "@/lib/reactions";
import { isHidden, isSealed, type BoardItem, type HiddenItem, type Message } from "@/lib/types";
import { useInDetail, useListEdit, useListToggle } from "../board/ListEditContext";
import { DrawingCard } from "./DrawingCard";
import { HiddenBack, HiddenPin, SecretBadge } from "./HiddenPin";
import { PinFx, SecretFlip } from "./PinFx";
import { useFeatureFlags } from "@/lib/features";
import { ClosedCapsule } from "./ClosedCapsule";
import { ListCard } from "./ListCard";
import { MusicCard } from "./MusicCard";
import { PaperNote } from "./PaperNote";
import { PlaceCard } from "./PlaceCard";
import { PolaroidPhoto } from "./PolaroidPhoto";
import { PostIt } from "./PostIt";
import { VideoPrint } from "./VideoPrint";
import { VoiceNote } from "./VoiceNote";
import { useTranslations } from "next-intl";

function Content({ m }: { m: Message }) {
  const editList = useListEdit();
  const toggleList = useListToggle();
  const inDetail = useInDetail();
  switch (m.type) {
    case "postit":
      return <PostIt color={m.color} text={m.text} font={m.font} pin={m.pin} pos={m.pos} />;
    case "text":
      return <PaperNote text={m.text} variant={m.variant} font={m.font} tape={m.tape} />;
    case "list":
      return <ListCard title={m.title} items={m.items} font={m.font} tape={m.tape} onEdit={m.canEdit && editList && inDetail ? () => editList({ id: m.id, title: m.title, items: m.items }) : undefined} onToggle={(m.canEdit || m.demo) && toggleList && (inDetail || m.demo) ? (i) => toggleList(m.id, i) : undefined} squareOnly={!!m.demo && !inDetail} />;
    case "photo":
      return <PolaroidPhoto caption={m.caption} scene={m.scene} src={m.src} font={m.font} pin={m.pin} tape={m.tape} pos={m.pos} ratio={m.ratio} />;
    case "draw":
      return <DrawingCard caption={m.caption} src={m.src} font={m.font} tape={m.tape} />;
    case "music":
      return <MusicCard title={m.title} artist={m.artist} caption={m.caption} duration={m.duration} link={m.link} color={m.playerColor} />;
    case "video":
      return <VideoPrint caption={m.caption} duration={m.duration} src={m.src} link={m.link} color={m.playerColor} />;
    case "voice":
      return <VoiceNote caption={m.caption} duration={m.duration} src={m.src} color={m.playerColor} />;
    case "place":
      return <PlaceCard name={m.name} address={m.address} lat={m.lat} lon={m.lon} caption={m.caption} color={m.playerColor} blank={(m as { blank?: boolean }).blank} />;
  }
}

/** Assinatura de quem deixou o pin (só aparece se a pessoa escolheu assinar). */
function Signature({ name, reaction }: { name?: string; reaction?: string }) {
  const tx = useTranslations("components.messages.MessageView");
  const inDetail = useInDetail();
  // emoji que o dono do mural deixou: canto inferior esquerdo do pin
  const mark = reaction ? (
    <span role="img" aria-label={tx("reacaoDoDonoDoMural")} title={tx("reacaoDoDonoDoMural")} className="absolute -bottom-[0.9em] -left-[0.5em] z-30 grid size-[2em] place-items-center rounded-full bg-[#fff8e6] text-[1em] leading-none shadow-[0_0.15em_0.4em_rgba(0,0,0,.35)]">
      {reactionEmoji(reaction)}
    </span>
  ) : null;
  if (!name) return mark;
  const cls = "absolute -right-[0.3em] -bottom-[0.8em] z-30 max-w-[90%] truncate rounded-lg bg-[#fff8e6] px-[0.8em] py-[0.3em] text-[0.7em] leading-none font-bold text-[#4a3826] shadow-[0_0.15em_0.4em_rgba(0,0,0,.35)]";
  // no destaque do pin, o nome leva ao primeiro mural da pessoa
  if (inDetail) {
    return (
      <>
        {mark}
        <a href={`/${encodeURIComponent(name)}`} title={tx("m_irAoMuralDe", { v0: name })} className={`${cls} transition hover:bg-white`}>
          @{name}
        </a>
      </>
    );
  }
  return (
    <>
      {mark}
      <span className={cls}>@{name}</span>
    </>
  );
}

/** Marcas que só o autor (aguardando aprovação) ou o dono (em blur para visitantes) veem sobre o pin. */
function Marked({ m }: { m: Message }) {
  const tx = useTranslations("components.messages.MessageView");
  const inDetail = useInDetail();
  const kSecret = inDetail ? "1em" : "2.4em"; // no mural inteiro o cartão é pequeno: o selo cresce para continuar visível
  const kPending = inDetail ? "1em" : "1.4em";
  if (m.pending) {
    // aguardando aprovação: selo redondo com um olho, no centro do pin (mesmo estilo do cadeado do pin em blur)
    return (
      <div className="relative">
        <Content m={m} />
        <span className="pointer-events-none absolute inset-0 z-30 grid place-items-center" style={{ fontSize: kPending }}>
          <span role="img" aria-label={m.ownerReview ? tx("m_aguardandoASuaAprovacao") : tx("m_aguardandoLiberacaoDoDonoDo")} title={m.ownerReview ? tx("m_aguardandoASuaAprovacao") : tx("m_aguardandoLiberacaoDoDonoDo")} className="pointer-events-auto flex flex-col items-center gap-[0.45em]">
            <span className="grid size-[2.6em] place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)]">
              <svg viewBox="0 0 24 24" className="size-[1.4em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="max-w-[9.5em] rounded-lg bg-black/55 px-[0.9em] py-[0.4em] text-center text-[0.85em] leading-tight font-semibold text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.35)]">{m.ownerReview ? tx("m_aguardandoASuaAprovacao") : tx("m_aguardandoLiberacaoDoDonoDo")}</span>
          </span>
        </span>
        <Signature name={m.signedBy} reaction={m.reaction} />
      </div>
    );
  }
  return (
    <div className="relative">
      <Content m={m} />
      <Signature name={m.signedBy} reaction={m.reaction} />
      <span className="pointer-events-none absolute inset-0 z-30 grid place-items-center" style={{ fontSize: kSecret }}>
        <span role="img" aria-label={tx("segredoOsVisitantesVeemEste")} title={tx("segredoOsVisitantesVeemEste")} className="pointer-events-auto flex flex-col items-center gap-[0.45em]">
          <span className="grid size-[2.6em] place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)]">
            <svg viewBox="0 0 24 24" className="size-[1.3em]" fill="currentColor" aria-hidden>
              <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
            </svg>
          </span>
          <span className="rounded-lg bg-black/55 px-[0.9em] py-[0.4em] text-center text-[0.85em] leading-tight font-semibold text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.35)]">{tx("segredo")}</span>
        </span>
      </span>
    </div>
  );
}

/**
 * Ponto único de renderização de um item do mural: mensagem aberta, Cápsula fechada ou espaço em blur.
 * Tamanho: tudo em `em` — quem usa define o `font-size` para escalar.
 */
export function MessageView({ message, revealSecret = false }: { message: BoardItem; revealSecret?: boolean }) {
  const flip = useFeatureFlags().secret_flip === true;
  if (isSealed(message)) return <ClosedCapsule opensAt={message.opensAt} />;
  // fixado: tachinha/fita dourada (PinFx); o resto é o pin de sempre
  return (
    <PinFx pinned={!!message.pinned && !(isHidden(message) && message.pending)} type={message.type}>
      <MessageBody message={message} revealSecret={revealSecret} flip={flip} />
    </PinFx>
  );
}

function MessageBody({ message, revealSecret, flip }: { message: BoardItem; revealSecret: boolean; flip: boolean }) {
  const tx = useTranslations("components.messages.MessageView");
  let m = message;
  if (isSealed(m)) return null;
  // segredo virado: quem visita vê o pin de costas (espelhado), sem conteúdo
  if (isHidden(m)) return flip && !m.pending && !m.backdrop ? <SecretFlip back front={null} backFace={<HiddenBack item={m} />} badge={<SecretBadge />} /> : <HiddenPin item={m} />;
  // visão do dono: pin em segredo mostra o texto e a assinatura, mas borrados, até ele pedir para ver no detalhe do pin
  if (m.ownerHidden && !m.pending) {
    if (!revealSecret) {
      // o mesmo cartão que os visitantes veem (texto de enchimento, foto e mapa genéricos): nenhum dado verdadeiro do pin fica na tela, nem por um instante durante o zoom
      const t = m.type;
      const hid: HiddenItem = { id: m.id, hidden: true, type: t, color: "color" in m ? m.color : undefined, variant: "variant" in m ? m.variant : undefined, playerColor: "playerColor" in m ? m.playerColor : undefined, ratio: "ratio" in m ? m.ratio : undefined, font: m.font, pin: m.pin, tape: m.tape, pos: m.pos };
      if (!flip) return <HiddenPin item={hid} />;
      return <SecretFlip back front={<Plain m={{ ...m, ownerHidden: false }} />} backFace={<HiddenBack item={hid} />} badge={<SecretBadge />} />;
    }
    m = { ...m, ownerHidden: false }; // revelado: o pin aparece limpo
  }
  if (m.pending || m.ownerHidden) return <Marked m={m} />;
  // mesma árvore do pin em segredo: ao ligar ou desligar o segredo o pin vira (com a animação) em vez de trocar de cartão
  return flip ? <SecretFlip back={false} front={<Plain m={m} />} backFace={null} badge={null} /> : <Plain m={m} />;
}

/** O pin à vista: sozinho, ou com assinatura, reação e lacre de Cápsula. */
function Plain({ m }: { m: Message }) {
  const tx = useTranslations("components.messages.MessageView");
  if (!m.fromCapsule && !m.signedBy && !m.reaction) return <Content m={m} />;
  // mensagem assinada e/ou vinda de uma Cápsula já aberta (ganha um pequeno lacre no canto)
  return (
    <div className="relative">
      <Content m={m} />
      <Signature name={m.signedBy} reaction={m.reaction} />
      {m.fromCapsule && (
      <span
        title={tx("abertaDeUmaCapsulaPinz")}
        className="absolute -top-[0.7em] -right-[0.6em] z-30 grid size-[2em] place-items-center rounded-full text-white shadow-[0_0.15em_0.4em_rgba(60,10,5,.5)]"
        style={{ background: "radial-gradient(circle at 35% 30%, #e8554a, #a31d16 70%)" }}
      >
        <span className="sr-only">{tx("abertaDeUmaCapsulaPinz")}</span>
        <svg aria-hidden viewBox="0 0 24 24" className="size-[1em]" fill="currentColor">
          <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Zm6.5 3.5-4 4-2-2 1.1-1.1 0.9 0.9 2.9-2.9 1.1 1.1Z" />
        </svg>
      </span>
      )}
    </div>
  );
}
