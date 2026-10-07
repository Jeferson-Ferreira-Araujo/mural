import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function Termos() {
  return (
    <LegalPage title="Termos de Uso" updated="6 de outubro de 2026">
      <p>Ao criar uma conta ou usar o Pinz (pinz.digital), você concorda com estes termos.</p>

      <section>
        <h2>O serviço</h2>
        <p>O Pinz permite criar um mural pessoal, ou compartilhado entre duas pessoas, e deixar pins (recados, fotos, músicas e outros formatos) nos murais. Alguns recursos fazem parte do plano PLUS.</p>
      </section>

      <section>
        <h2>Sua conta</h2>
        <ul>
          <li>Você é responsável pelo acesso à sua conta e pelo que publica com ela.</li>
          <li>O nome de usuário é escolhido uma vez e não pode imitar marcas, empresas ou outras pessoas.</li>
        </ul>
      </section>

      <section>
        <h2>Conteúdo e conduta</h2>
        <p>Não é permitido publicar conteúdo ilegal, que assedie, ameace ou exponha outras pessoas, que viole direitos de terceiros ou que contenha nudez ou violência. Você declara ter o direito de publicar o que envia e nos autoriza a armazená-lo e exibi-lo no mural conforme sua escolha.</p>
        <p className="mt-2">Pins podem ser denunciados. Podemos remover conteúdo e suspender contas que violem estes termos.</p>
      </section>

      <section>
        <h2>Pagamentos</h2>
        <ul>
          <li>O PINZ PLUS é uma assinatura mensal (R$ 9,90) cobrada pelo Mercado Pago, e os créditos são vendidos em pacotes avulsos. Os valores aparecem antes da compra.</li>
          <li>Você pode cancelar a assinatura quando quiser, pelo próprio Pinz, sem multa. O PLUS continua até o fim do período já pago e não há novas cobranças.</li>
          <li>Você pode desistir de uma compra em até 7 dias, como prevê o Código de Defesa do Consumidor, e pedir o reembolso pelo contato do Pinz. Créditos já gastos na loja são descontados.</li>
          <li>Se a assinatura deixar de ser paga, a conta volta ao plano gratuito: seus pins continuam, mas os recursos do PLUS ficam indisponíveis.</li>
          <li>Os créditos não são dinheiro, não podem ser transferidos nem sacados.</li>
        </ul>
      </section>

      <section>
        <h2>Disponibilidade</h2>
        <p>Fazemos o possível para manter o serviço no ar, mas ele é oferecido como está, sem garantia de funcionamento ininterrupto. Podemos alterar ou encerrar recursos, e estes termos, avisando no site.</p>
      </section>

      <section>
        <h2>Privacidade</h2>
        <p>O uso dos seus dados está descrito na <a className="font-semibold underline" href="/privacidade">Política de Privacidade</a>.</p>
      </section>
    </LegalPage>
  );
}
