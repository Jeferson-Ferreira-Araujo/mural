"use client";

import { homeRouteFor } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";

/** Nome (chave) → o que o Explorer faz ao chegar no mural: abre a janela ou a função correspondente. */
export const ADMIN_TEST_KEY = "pinz:admin-test";

const TESTS: { id: string; title: string; hint: string }[] = [
  { id: "onboarding", title: "Boas-vindas da conta nova", hint: "Foto de perfil, data de nascimento e convite para o tour." },
  { id: "tour", title: "Tour guiado", hint: "O passo a passo interativo, do primeiro pin até a loja." },
  { id: "birthday-plus", title: "Aniversário: PINZ+ do mês", hint: "A janela de parabéns de quem tem conta gratuita (ganhou o PINZ+ até o fim do mês)." },
  { id: "birthday-badges", title: "Aniversário: bottons de presente", hint: "A janela de parabéns de quem já é PINZ+ (ganhou todos os bottons de aniversário)." },
  { id: "gift", title: "Presente de 1 mês de PINZ+", hint: "A janela de quando alguém te presenteia com o PINZ+." },
  { id: "welcome-mural", title: "Mensagem de boas-vindas do mural", hint: "A janela que o visitante vê ao entrar no mural (texto de exemplo)." },
  { id: "pan-hint", title: "Dica de arrastar para os lados", hint: "No celular: o mural percorre as duas pontas e mostra “Arraste para os lados” (vale uma vez por dia; aqui ela é liberada de novo)." },
];

/** Atalhos para testar o que só aparece em situações raras (conta nova, aniversário, presente…). Cada botão leva ao seu mural e dispara o teste lá. */
export function TestsPanel({ onToast }: { onToast: (m: string) => void }) {
  async function run(id: string) {
    try {
      if (id === "pan-hint") localStorage.removeItem("pinz:pan-hint");
      sessionStorage.setItem(ADMIN_TEST_KEY, id);
    } catch {
      return onToast("O navegador bloqueou o armazenamento: não foi possível iniciar o teste.");
    }
    const to = await homeRouteFor(getBrowserSupabase());
    window.location.assign(to === "/criar" ? "/" : to);
  }
  return (
    <section className="mt-4" aria-label="Testes">
      <p className="mb-3 text-sm text-[#6b5440]">Cada botão abre o seu mural e mostra a tela escolhida, sem alterar nada na sua conta (a dica de arrastar é a única que precisa do celular).</p>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {TESTS.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-[#e1d3ba] bg-white/60 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{t.title}</p>
              <p className="text-sm text-[#6b5440]">{t.hint}</p>
            </div>
            <button type="button" onClick={() => void run(t.id)} className="shrink-0 cursor-pointer rounded-lg bg-[#1f232b] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#2c313b] active:scale-95">
              Testar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
