import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function Privacidade() {
  return (
    <LegalPage title="Política de Privacidade" updated="6 de outubro de 2026">
      <p>O Pinz (pinz.digital) é um mural de recados. Esta página explica quais dados usamos e para quê.</p>

      <section>
        <h2>Dados que coletamos</h2>
        <ul>
          <li>Conta: e-mail, nome de usuário (apelido) e, se você enviar, a foto de perfil. Se entrar com o Google, recebemos o e-mail e o nome da conta Google.</li>
          <li>Conteúdo: os pins que você publica (textos, listas, fotos, desenhos, áudios, vídeos, músicas e locais), a pergunta e a resposta que protegem seu mural e a senha do mural compartilhado (guardada de forma criptografada).</li>
          <li>Uso: notificações da sua conta, contagem de visualizações do mural e registros técnicos de segurança, como o endereço IP, para evitar abuso.</li>
        </ul>
      </section>

      <section>
        <h2>Para que usamos</h2>
        <ul>
          <li>Criar sua conta, permitir o login e exibir seu mural e seus pins.</li>
          <li>Enviar e-mails da conta, como o código de confirmação.</li>
          <li>Moderar conteúdo, atender denúncias e proteger o serviço contra abuso.</li>
        </ul>
        <p className="mt-2">Não vendemos seus dados.</p>
      </section>

      <section>
        <h2>Quem vê o que</h2>
        <p>Seu mural só abre para quem responde à pergunta que você definiu. Pins marcados como segredo aparecem borrados para visitantes. Quando você deixa um pin no mural de outra pessoa, ele é assinado com o seu nome de usuário.</p>
      </section>

      <section>
        <h2>Serviços que usamos</h2>
        <ul>
          <li>Supabase: banco de dados, login e armazenamento de arquivos.</li>
          <li>Google: login com o Google e mapas e busca de lugares (Google Maps).</li>
          <li>Resend: envio dos e-mails da conta.</li>
          <li>Cloudflare: proteção e entrega do site.</li>
        </ul>
        <p className="mt-2">Esses serviços tratam os dados segundo as próprias políticas e podem processá-los fora do Brasil.</p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>Você pode pedir acesso, correção ou exclusão dos seus dados e da sua conta, e apagar seus pins a qualquer momento pelo próprio mural. Guardamos os dados enquanto a conta existir; denúncias e registros de segurança podem ficar guardados pelo tempo necessário para proteger outras pessoas.</p>
      </section>

      <section>
        <h2>Crianças</h2>
        <p>O Pinz não é destinado a menores de 13 anos.</p>
      </section>
    </LegalPage>
  );
}
