import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("deletionTitle"), alternates: { canonical: "/exclusao-de-dados" }, robots: { index: true, follow: true } };
}

export default function ExclusaoDeDados() {
  const tl = useLit();
  const tx = useTranslations("app.exclusao_de_dados.page");
  return (
    <LegalPage title={tl("Exclusão de dados")} updated="2026-10-08">
      <p>{tx("x_vocePodePedirAExclusao")}</p>

      <section>
        <h2>{tx("x_comoPedir")}</h2>
        <ul>
          <li>
            {tx.rich("x_envieUmEMailPara", { v0: SUPPORT_EMAIL, s0: (c) => <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}?subject=Exclus%C3%A3o%20de%20dados`}>{c}</a> })}</li>
          <li>{tx("x_escrevaDoMesmoEMail")}</li>
          <li>{tx("x_confirmaremosOPedidoPorResposta")}</li>
        </ul>
      </section>

      <section>
        <h2>{tx("x_oQueEExcluido")}</h2>
        <ul>
          <li>{tx("x_suaContaOEMail")}</li>
          <li>{tx("x_seusMuraisETodosOs")}</li>
          <li>{tx("x_notificacoesBottonsECreditosDa")}</li>
        </ul>
        <p className="mt-2">{tx("x_registrosDePagamentosPodemSer")}</p>
      </section>
    </LegalPage>
  );
}
