import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = { title: "Exclusão de dados", alternates: { canonical: "/exclusao-de-dados" }, robots: { index: true, follow: true } };

export default function ExclusaoDeDados() {
  return (
    <LegalPage title="Exclusão de dados" updated="8 de outubro de 2026">
      <p>Você pode pedir a exclusão da sua conta e de todos os dados que o Pinz (pinz.digital) guarda sobre você, inclusive os recebidos pelo login com Google, Facebook ou Apple.</p>

      <section>
        <h2>Como pedir</h2>
        <ul>
          <li>
            Envie um e-mail para <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}?subject=Exclus%C3%A3o%20de%20dados`}>{SUPPORT_EMAIL}</a> com o assunto “Exclusão de dados”.
          </li>
          <li>Escreva do mesmo e-mail da sua conta e informe o seu nome de usuário (o @ do seu mural).</li>
          <li>Confirmaremos o pedido por resposta e excluiremos os dados em até 30 dias.</li>
        </ul>
      </section>

      <section>
        <h2>O que é excluído</h2>
        <ul>
          <li>Sua conta, o e-mail, o nome de usuário e a foto de perfil.</li>
          <li>Seus murais e todos os pins que você publicou, e os arquivos enviados (fotos, desenhos, áudios e vídeos).</li>
          <li>Notificações, bottons e créditos da conta.</li>
        </ul>
        <p className="mt-2">Registros de pagamentos podem ser mantidos pelo tempo que a lei exigir. Se você usou o login do Facebook, também pode remover o Pinz em Configurações do Facebook → Aplicativos e sites.</p>
      </section>
    </LegalPage>
  );
}
