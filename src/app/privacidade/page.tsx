import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

export const metadata: Metadata = { title: "Política de Privacidade", alternates: { canonical: "/privacidade" }, robots: { index: true, follow: true } };

export default function Privacidade() {
  const tl = useLit();
  const tx = useTranslations("app.privacidade.page");
  return (
    <LegalPage title={tl("Política de Privacidade")} updated="12 de outubro de 2026">
      <p>{tx("x_oPinzPinzDigitalE")}</p>

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
        </ul>
        <p className="mt-2">{tx("x_essesServicosTratamOsDados")}</p>
      </section>

      <section>
        <h2>{tx("x_seusDireitos")}</h2>
        <p>{tx("x_vocePodePedirAcessoCorrecao")}</p>
      </section>

      <section>
        <h2>{tx("x_criancas")}</h2>
        <p>{tx("x_oPinzNaoEDestinado")}</p>
      </section>
    </LegalPage>
  );
}
