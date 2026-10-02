import type { Message } from "@/lib/types";

/**
 * Dados MOCKADOS — apenas para avaliar o frontend (Etapa 1).
 * A ordem aqui é a ordem no carrossel mobile e nos "slots" do mural desktop.
 */
export const messages: Message[] = [
  { id: "m1", type: "postit", color: "yellow", text: "Você sempre foi uma das pessoas mais incríveis que conheci. ❤️" },
  {
    id: "m2",
    type: "text",
    variant: "letter",
    text: "Obrigado por sempre acreditar em mim, mesmo quando eu não acreditava. Você faz diferença! ☺",
  },
  { id: "m3", type: "photo", scene: "hills", caption: "Parceiro de sempre! 🐾" },
  {
    id: "m4",
    type: "postit",
    color: "pink",
    text: "♡ Você tem um coração gigante e isso faz o mundo ser mais leve. Nunca mude!",
  },
  { id: "m5", type: "video", caption: "Esse dia foi inesquecível! Obrigado por fazer parte dessa história.", duration: "0:24" },
  {
    id: "m6",
    type: "text",
    variant: "notebook",
    text: "Lembro de tantas resenhas boas… que privilégio ter vivido isso com você.",
  },
  {
    id: "m7",
    type: "music",
    title: "Aquela Música",
    artist: "Charlie Brown Jr.",
    caption: "Essa música me lembra muito a nossa amizade!",
    duration: "3:45",
  },
  {
    id: "m8",
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
  {
    id: "m9",
    type: "audio",
    text: "Nunca tive coragem de falar isso pessoalmente, mas… Obrigado por tudo!",
    duration: "0:32",
  },
  { id: "m10", type: "photo", scene: "group", caption: "Que venham mais momentos assim!" },
  {
    id: "m11",
    type: "postit",
    color: "blue",
    text: "Você me inspira a ser uma versão melhor de mim. Valeu por sempre estar por perto! ♡",
  },
  { id: "m12", type: "draw", caption: "Amizade de verdade!" },
];

export const boardInfo = {
  title: "Mural do Jeferson",
  question: "Qual era meu apelido na escola?",
  // Demonstração: números e validação são apenas simulados no frontend.
  stats: { visited: 127, tried: 83, correct: 31, messages: messages.length },
};
