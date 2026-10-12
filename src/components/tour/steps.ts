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
  { id: "board", sel: '[data-tour="board"]', title: "Este é o seu mural", text: "Um quadro de pins: recados, fotos e displays. As pessoas deixam pins e você decora." },
  { id: "add", sel: '[data-tour="add"]', title: "Colocar um pin", text: "Toque aqui para colocar um pin ou um display. Também dá para segurar num espaço vazio do mural." },
  { id: "move", title: "Mover e abrir", text: "Arraste os seus pins para mudar de lugar. Toque num pin para ver o conteúdo inteiro." },
  { id: "zoom", sel: '[data-tour="zoom"]', title: "Zoom e movimento", text: "Pince com dois dedos ou toque duas vezes para aproximar. Arraste para mover. Este botão mostra o mural inteiro." },
  { id: "badges", sel: '[data-tour="badges"]', title: "Bottons", text: "Enfeites do mural. Arraste da barra para o mural. Para tirar, arraste de volta para a barra." },
  { id: "store", sel: '[data-tour="store"]', title: "Loja", text: "Compre bottons, displays e fundos de mural com créditos. Os créditos se compram na própria Loja." },
  { id: "displays", title: "Displays", text: "Cartões vivos no mural. Toque num display colocado para ver as opções dele.", chips: ["🕒 Relógio", "⛅ Clima", "📅 Calendário", "⏳ Contador", "📖 Livro", "🥇 Top 3", "📊 Enquete", "🙏 Versículo", "💬 Frase do dia"] },
  { id: "approve", sel: '[data-tour="menu"]', title: "Aprovações", text: "Pins de visitantes só aparecem depois que você aprova. Veja em Menu › Aprovações." },
  { id: "murals", sel: '[data-tour="murals"]', title: "Seus murais", text: "Veja e troque de mural aqui. Com mais de um, arraste o mural para o lado para passar de um para o outro." },
  { id: "share", sel: '[data-tour="share"]', title: "Compartilhar", text: "Envie o link do mural para convidar pessoas a ver e deixar pins." },
  { id: "search", sel: '[data-tour="search"]', title: "Pesquisar", text: "Encontre outras pessoas, visite os murais delas e siga quem você gosta." },
  { id: "bell", sel: '[data-tour="bell"]', title: "Notificações", text: "Avisos de pins novos, reações e novos seguidores." },
  { id: "menu", sel: '[data-tour="menu"]', title: "Menu da conta", text: "Perfil: foto, mural público ou privado (com pergunta de segurança) e senha.", chips: ["Meus murais", "Aprovações", "Seguindo", "Planos", "Perfil"] },
  { id: "end", title: "Pronto!", text: "Divirta-se! Para rever este tour, use Menu › Tour pelo Pinz." },
];
