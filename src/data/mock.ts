import { canUseCapsule, formatsFor, type PlanId } from "@/lib/plans";
import { isSealed, type BoardItem, type Message } from "@/lib/types";

/**
 * Dados MOCKADOS — apenas para demonstração do frontend (sem banco, sem envio real).
 * A ordem do pool é a ordem dos espaços no mural: os 5 primeiros só usam formatos FREE,
 * então um PINZ FREE (5 espaços) e um PINZ FULL (15 espaços) ficam coerentes.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Conteúdo guardado "no servidor" de uma cápsula de exemplo (nunca vai para o quadro antes da hora). */
const SEED_VAULT: Record<string, Message> = {
  cap1: {
    id: "cap1",
    type: "text",
    variant: "letter",
    fromCapsule: true,
    text: "Se você está lendo isso, já passou o tempo. Obrigado por tudo, de coração. Foi uma ideia boa guardar esse recado.",
  },
};

export function buildPool(nowMs: number): { items: BoardItem[]; vault: Record<string, Message> } {
  const items: BoardItem[] = [
    { id: "m1", type: "postit", color: "yellow", text: "Você sempre foi uma das pessoas mais incríveis que conheci. ❤️" },
    {
      id: "m2",
      type: "text",
      variant: "letter",
      text: "Obrigado por sempre acreditar em mim, mesmo quando eu não acreditava. Você faz diferença! ☺",
    },
    {
      id: "m3",
      type: "list",
      title: "Sempre:",
      items: [
        { text: "Boa companhia", done: true },
        { text: "Conversas sem fim", done: true },
        { text: "Ideias malucas", done: true },
        { text: "Apoio nos momentos difíceis", done: true },
        { text: "Alguém presente", done: true },
      ],
    },
    { id: "m4", type: "photo", scene: "hills", caption: "Parceiro de sempre! 🐾" },
    { id: "m5", type: "postit", color: "pink", text: "♡ Você tem um coração gigante e isso faz o mundo ser mais leve. Nunca mude!" },
    // --- a partir daqui, formatos FULL ---
    {
      id: "m6",
      type: "music",
      title: "Aquela Música",
      artist: "Charlie Brown Jr.",
      caption: "Essa música me lembra muito a nossa amizade!",
      duration: "3:45",
    },
    { id: "m7", type: "video", caption: "Esse dia foi inesquecível! Obrigado por fazer parte dessa história.", duration: "0:24" },
    { id: "cap1", sealed: true, opensAt: new Date(nowMs + 18 * DAY + 4 * HOUR + 37 * MIN + 20_000).toISOString() },
    // --- de volta aos formatos FREE ---
    { id: "m8", type: "text", variant: "notebook", text: "Lembro de tantas resenhas boas… que privilégio ter vivido isso com você." },
    { id: "m9", type: "postit", color: "blue", text: "Você me inspira a ser uma versão melhor de mim. Valeu por sempre estar por perto! ♡" },
    { id: "m10", type: "photo", scene: "group", caption: "Que venham mais momentos assim!" },
    {
      id: "m11",
      type: "list",
      title: "Pra gente fazer:",
      items: [
        { text: "Churrasco de domingo", done: false },
        { text: "Rever o pessoal da escola", done: false },
        { text: "Aquela viagem", done: false },
        { text: "Jogar bola de novo", done: false },
      ],
    },
    { id: "m12", type: "postit", color: "green", text: "Valeu por tudo, parceiro. Conta comigo sempre!" },
    { id: "m13", type: "text", variant: "letter", text: "Saudade da sua risada. Aparece mais! Um abraço enorme." },
    { id: "m14", type: "postit", color: "orange", text: "Saudade da sua risada!" },
  ];
  return { items, vault: { ...SEED_VAULT } };
}

/** Os primeiros `count` itens do pool que o plano permite (formatos e cápsula). */
export function itemsFor(plan: PlanId, count: number, nowMs: number): { items: BoardItem[]; vault: Record<string, Message> } {
  const { items, vault } = buildPool(nowMs);
  const allowed = items.filter((i) => (isSealed(i) ? canUseCapsule(plan) : formatsFor(plan).includes(i.type)));
  return { items: allowed.slice(0, count), vault };
}
