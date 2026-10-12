import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de Privacidade", alternates: { canonical: "/privacidade" }, robots: { index: true, follow: true } };

export default function Privacidade() {
  return (
    <LegalPage title="Política de Privacidade" updated="11 de outubro de 2026">
      <p>O Pinz (pinz.digital) é um mural de recados. Esta página explica quais dados usamos e para quê.</p>

      <section>
        <h2>Dados que coletamos</h2>
        <ul>
          <li>Conta: e-mail, nome de usuário (apelido) e, se você enviar, a foto de perfil. Se entrar com o Google, recebemos o e-mail e o nome da conta Google.</li>
          <li>Conteúdo: os pins que você publica (textos, listas, fotos, desenhos, áudios, vídeos, músicas e locais), a pergunta e a resposta que protegem seu mural e a senha do mural compartilhado (guardada de forma criptografada).</li>
          <li>Visitas e seguidores: quando você entra com a sua conta e visita o mural de outra pessoa, o @ e a foto de perfil aparecem na lista de visitantes dela (sem data). Quem você segue fica numa lista só sua, e quem segue você aparece apenas como um número.</li>
          <li>Enquetes: ao votar numa enquete, guardamos a opção que você escolheu ligada à sua conta (um voto por pessoa); o dono do mural vê só o total e as porcentagens, nunca quem votou em quê.</li>
          <li>Localização (só quando você permite): se o mural tiver um display de Clima, o navegador ou o celular pergunta se pode usar a sua localização para mostrar o tempo de onde você está. Veja a seção “Localização”.</li>
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
        <h2>Localização</h2>
        <p>O display de Clima mostra o tempo do lugar onde você está, e só se você permitir. A permissão é pedida pelo próprio navegador ou celular, e você pode negá-la ou retirá-la quando quiser nas configurações do aparelho. Se negar, o display mostra o tempo da cidade escolhida pelo dono do mural, e não pedimos de novo: a sua escolha fica guardada neste aparelho até você excluir a conta (ou limpar os dados do navegador).</p>
        <ul className="mt-2">
          <li>Sua posição fica guardada apenas no seu aparelho, por até 30 minutos. Não ligamos a posição à sua conta e não a guardamos no banco de dados.</li>
          <li>Para buscar o tempo, o servidor do Pinz recebe a posição arredondada (cerca de 1 km) e a repassa ao serviço de previsão do tempo; para mostrar o nome da cidade, repassa também ao serviço de mapas. O servidor guarda a resposta por alguns minutos (o tempo) ou por um dia (o nome da cidade), junto da posição arredondada, sem identificar você.</li>
        </ul>
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
          <li>MET Norway (api.met.no): previsão do tempo do display de Clima, a partir da posição arredondada.</li>
          <li>OpenStreetMap (Nominatim): nome da cidade da posição de quem permite a localização.</li>
          <li>Resend: envio dos e-mails da conta.</li>
          <li>Cloudflare: proteção e entrega do site.</li>
          <li>Mercado Pago: pagamentos da assinatura e dos créditos. Os dados do cartão ou do Pix são informados direto no Mercado Pago; o Pinz não os recebe nem os guarda, só o resultado do pagamento.</li>
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
