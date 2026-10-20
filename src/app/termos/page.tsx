import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

export const metadata: Metadata = { title: "Termos de Uso", alternates: { canonical: "/termos" }, robots: { index: true, follow: true } };

export default function Termos() {
  const tl = useLit();
  const tx = useTranslations("app.termos.page");
  return (
    <LegalPage title={tl("Termos de Uso")} updated="6 de outubro de 2026">
      <p>{tx("x_aoCriarUmaContaOu")}</p>

      <section>
        <h2>{tx("x_oServico")}</h2>
        <p>{tx("x_oPinzPermiteCriarUm")}</p>
      </section>

      <section>
        <h2>{tx("x_suaConta")}</h2>
        <ul>
          <li>{tx("x_voceEResponsavelPeloAcesso")}</li>
          <li>{tx("x_oNomeDeUsuarioE")}</li>
        </ul>
      </section>

      <section>
        <h2>{tx("x_conteudoEConduta")}</h2>
        <p>{tx("x_naoEPermitidoPublicarConteudo")}</p>
        <p className="mt-2">{tx("x_pinsPodemSerDenunciadosPodemos")}</p>
      </section>

      <section>
        <h2>{tx("x_pagamentos")}</h2>
        <ul>
          <li>{tx("x_oPinzEUmaAssinatura")}</li>
          <li>{tx("x_vocePodeCancelarAAssinatura")}</li>
          <li>{tx("x_vocePodeDesistirDeUma")}</li>
          <li>{tx("x_seAAssinaturaDeixarDe")}</li>
          <li>{tx("x_osCreditosNaoSaoDinheiro")}</li>
        </ul>
      </section>

      <section>
        <h2>{tx("x_disponibilidade")}</h2>
        <p>{tx("x_fazemosOPossivelParaManter")}</p>
      </section>

      <section>
        <h2>{tx("x_privacidade")}</h2>
        <p>{tx.rich("x_oUsoDosSeusDados", { s0: (c) => <a className="font-semibold underline" href="/privacidade">{c}</a> })}</p>
      </section>
    </LegalPage>
  );
}
