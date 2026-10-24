import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";
import { getTranslations } from "next-intl/server";
import { ConsentLink } from "@/components/ConsentBanner";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("privacyTitle"), alternates: { canonical: "/privacidade" }, robots: { index: true, follow: true } };
}

export default function Privacidade() {
  const tl = useLit();
  const tx = useTranslations("app.privacidade.page");
  return (
    <LegalPage title={tl("Política de Privacidade")} updated="2026-10-23">
      <p>{tx("x_oPinzPinzDigitalE")}</p>

      <section>
        <h2>{tl("Quem é o responsável")}</h2>
        <p>{tl("O Pinz (pinz.digital) é o controlador dos seus dados pessoais. Para qualquer assunto de privacidade, inclusive falar com o encarregado de dados (DPO), use o e-mail de contato no fim desta página.")}</p>
      </section>

      <section>
        <h2>{tx("x_dadosQueColetamos")}</h2>
        <ul>
          <li>{tx("x_contaEMailNomeDe")}</li>
          <li>{tx("x_dataDeNascimentoOpcionalSe")}</li>
          <li>{tx("x_conteudoOsPinsQueVoce")}</li>
          <li>{tx("x_visitasESeguidoresQuandoVoce")}</li>
          <li>{tx("x_enquetesAoVotarNumaEnquete")}</li>
          <li>{tx("x_localizacaoSoQuandoVocePermite")}</li>
          <li>{tx("x_usoNotificacoesDaSuaConta")}</li>
        </ul>
      </section>

      <section>
        <h2>{tx("x_paraQueUsamos")}</h2>
        <ul>
          <li>{tx("x_criarSuaContaPermitirO")}</li>
          <li>{tx("x_enviarEMailsDaConta")}</li>
          <li>{tx("x_moderarConteudoAtenderDenunciasE")}</li>
        </ul>
        <p className="mt-2">{tx("x_naoVendemosSeusDados")}</p>
      </section>

      <section>
        <h2>{tl("Em que nos baseamos (LGPD, art. 7º)")}</h2>
        <ul>
          <li>{tl("Execução do contrato: criar a sua conta, mostrar o seu mural e os seus pins e processar pagamentos.")}</li>
          <li>{tl("Legítimo interesse: segurança do serviço, prevenção de abuso e fraude e moderação de conteúdo.")}</li>
          <li>{tl("Consentimento: medições de uso (opcional), localização do display de Clima, “mostrar quem está no mural agora” e data de nascimento. Você pode retirar o consentimento quando quiser.")}</li>
          <li>{tl("Obrigação legal: guardar registros exigidos por lei, como registros de acesso e dados fiscais de pagamentos.")}</li>
        </ul>
      </section>

      <section>
        <h2>{tl("Cookies e armazenamento no aparelho")}</h2>
        <ul>
          <li>{tl("Essenciais (sempre ativos): o login da sua conta, o idioma escolhido, as preferências de acessibilidade e a sua escolha de privacidade. Sem eles o site não funciona.")}</li>
          <li>{tl("Medições de uso (só se você aceitar): usamos ferramentas próprias, sem cookies de terceiros. A visita recebe um número aleatório que vale só enquanto a aba está aberta. Não guardamos o seu IP nessas medições e não vendemos nem repassamos esses dados a anunciantes.")}</li>
          <li>{tl("O que medimos: páginas visitadas, início da visita, tipo de aparelho, idioma, fuso horário, site de origem e uso das ferramentas (como abrir a loja). Se você estiver logado, a medição fica ligada à sua conta. Guardamos por até 24 meses.")}</li>
          <li>{tl("O sinal “Não rastrear” do navegador é respeitado.")}</li>
        </ul>
        <p className="mt-2">
          <ConsentLink />
        </p>
      </section>

      <section>
        <h2>{tl("Quem está no mural agora")}</h2>
        <p>{tl("É opcional e vem desligado. Se você ligar, vê quem está no seu mural em tempo real e aparece, com o seu @ e a sua foto, para quem tem a opção ligada quando você visita o mural dessa pessoa. Quem visita sem conta aparece apenas como “visitante”. Desligando, você some na hora.")}</p>
      </section>

      <section>
        <h2>{tx("x_localizacao")}</h2>
        <p>{tx("x_oDisplayDeClimaMostra")}</p>
        <ul className="mt-2">
          <li>{tx("x_suaPosicaoFicaGuardadaApenas")}</li>
          <li>{tx("x_paraBuscarOTempoO")}</li>
        </ul>
      </section>

      <section>
        <h2>{tx("x_quemVeOQue")}</h2>
        <p>{tx("x_seuMuralSoAbrePara")}</p>
      </section>

      <section>
        <h2>{tx("x_servicosQueUsamos")}</h2>
        <ul>
          <li>{tx("x_supabaseBancoDeDadosLogin")}</li>
          <li>{tx("x_googleLoginComOGoogle")}</li>
          <li>{tx("x_metNorwayApiMetNo")}</li>
          <li>{tx("x_openstreetmapNominatimNomeDaCidade")}</li>
          <li>{tx("x_resendEnvioDosEMails")}</li>
          <li>{tx("x_cloudflareProtecaoEEntregaDo")}</li>
          <li>{tx("x_mercadoPagoPagamentosDaAssinatura")}</li>
          <li>{tx("x_stripePagamentosEmDolar")}</li>
        </ul>
        <p className="mt-2">{tx("x_essesServicosTratamOsDados")}</p>
      </section>

      <section>
        <h2>{tx("x_seusDireitos")}</h2>
        <p>{tx("x_vocePodePedirAcessoCorrecao")}</p>
        <p className="mt-2">{tl("Pela LGPD (art. 18) você pode: confirmar que tratamos os seus dados, acessá-los, corrigi-los, pedir anonimização, bloqueio ou eliminação do que for desnecessário, pedir a portabilidade, saber com quem compartilhamos, saber que pode recusar o consentimento e retirá-lo.")}</p>
        <p className="mt-2">{tl("Em Editar perfil você baixa todos os seus dados e exclui a sua conta. Para qualquer outro pedido, escreva para o contato abaixo: respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).")}</p>
      </section>

      <section>
        <h2>{tl("Quanto tempo guardamos")}</h2>
        <p>{tl("Guardamos os seus dados enquanto a sua conta existir. Ao excluir a conta, apagamos os seus dados pessoais, exceto o que a lei exigir guardar (registros de acesso e dados fiscais de pagamentos). As medições de uso são apagadas depois de 24 meses.")}</p>
      </section>

      <section>
        <h2>{tl("Segurança")}</h2>
        <p>{tl("Usamos conexão criptografada, controle de acesso por conta e regras de segurança no banco de dados. Se houver um incidente que possa trazer risco relevante, avisaremos você e a ANPD.")}</p>
      </section>

      <section>
        <h2>{tx("x_criancas")}</h2>
        <p>{tx("x_oPinzNaoEDestinado")}</p>
        <p className="mt-2">{tl("Se você tem entre 13 e 17 anos, use o Pinz com o conhecimento de um responsável.")}</p>
      </section>

      <section>
        <h2>{tl("Mudanças nesta política")}</h2>
        <p>{tl("Podemos atualizar esta política. Quando a mudança for relevante, avisamos no site. A data da última atualização fica no topo da página.")}</p>
      </section>
    </LegalPage>
  );
}
