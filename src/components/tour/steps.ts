export type TourStep = {
  id: string;
  /** seletor do elemento a destacar (data-tour). Sem seletor, o cartão fica no meio da tela. Com seletor que não existe na tela, o passo é pulado. */
  sel?: string;
  title: string;
  text: string;
  /** lista curta de itens (vira etiquetas) */
  chips?: string[];
};

/** Passos do tour: textos curtos para caber em telas pequenas. Cada um fala de uma função do Pinz. */
export const TOUR_STEPS: TourStep[] = [
  { id: "board", sel: '[data-tour="board"]', title: "Este é o seu mural", text: "Um quadro de pins: recados, fotos e displays. As pessoas deixam pins e você decora. Pince ou toque duas vezes para aproximar." },
  { id: "add", sel: '[data-tour="add"]', title: "Colocar um pin", text: "Toque aqui para colocar um pin ou um display. Também dá para segurar num espaço vazio do mural." },
  { id: "badges", sel: '[data-tour="badges"]', title: "Bottons", text: "Enfeites do mural. Arraste da barra para o mural. Para tirar, arraste de volta para a barra." },
  { id: "store", sel: '[data-tour="store"]', title: "Loja", text: "Compre bottons, displays e fundos de mural com créditos. Os créditos se compram na própria Loja." },
  { id: "displays", title: "Displays", text: "Cartões vivos no mural. Toque num display colocado para ver as opções dele.", chips: ["🕒 Relógio", "⛅ Clima", "📅 Calendário", "⏳ Contador", "📖 Livro", "🥇 Top 3", "📊 Enquete", "🙏 Versículo", "💬 Frase do dia"] },
  { id: "share", sel: '[data-tour="share"]', title: "Compartilhe com os amigos", text: "Envie o link do mural para convidar pessoas a ver e deixar pins. Para rever este tour, use Menu › Tour pelo Pinz." },
];
