import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Caveat, Indie_Flower, Kalam, Patrick_Hand, Playfair_Display, Plus_Jakarta_Sans, Reenie_Beanie, Silkscreen } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { A11yHost } from "@/components/A11yHost";
import { LOCALE_TAGS, type Locale } from "@/i18n/config";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteTracker } from "@/components/SiteTracker";
import { ConsentBanner } from "@/components/ConsentBanner";
import { A11Y_INIT_SCRIPT } from "@/lib/a11y";
import { SITE_HOST } from "@/lib/mural";
import "./globals.css";

// uma só fonte para toda a interface (textos, títulos, botões); a letra de mão fica só dentro dos pins
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext", "vietnamese"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });
// só dentro dos widgets da loja: serifa elegante (frases, relógio analógico) e letra de pixel (relógio e clima pixel)
const playfair = Playfair_Display({ subsets: ["latin", "cyrillic"], style: ["normal", "italic"], weight: ["400", "500", "600"], variable: "--font-playfair" });
const silkscreen = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-silk" });
const caveat = Caveat({ subsets: ["latin", "cyrillic"], variable: "--font-caveat" });
const kalam = Kalam({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-kalam" });
const patrick = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick" });
const indie = Indie_Flower({ subsets: ["latin"], weight: "400", variable: "--font-indie" });
// fonte de leitura fácil (Acessibilidade): só é baixada quando a pessoa liga essa opção
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", preload: false });
const reenie = Reenie_Beanie({ subsets: ["latin"], weight: "400", variable: "--font-reenie" });

const OG_LOCALE: Record<string, string> = { pt: "pt_BR", en: "en_US", es: "es_ES" };

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta");
  return {
  metadataBase: new URL(`https://${SITE_HOST}`),
  title: { default: "Pinz", template: "%s | Pinz" },
  description: t("siteDescription"),
  openGraph: { siteName: "Pinz", type: "website", locale: OG_LOCALE[locale] ?? "pt_BR", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Pinz" }] },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  robots: { index: false, follow: false },
  applicationName: "Pinz",
  // iOS: ao adicionar à tela de início abre em tela cheia, com o ícone do Pinz
  appleWebApp: { capable: true, title: "Pinz", statusBarStyle: "black-translucent" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b2616",
};

import { preconnect } from "react-dom";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const all = (await getMessages()) as Record<string, unknown>;
  // só vai para o navegador o que os componentes de cliente usam: as páginas legais e os metadados são montados no servidor
  const { meta: _meta, app: appAll, ...rest } = all;
  void _meta;
  const { privacidade: _p, termos: _t, exclusao_de_dados: _e, ...app } = (appAll ?? {}) as Record<string, unknown>;
  void _p;
  void _t;
  void _e;
  const messages = { ...rest, app };
  // abre a conexão com o servidor de dados (login, pins, imagens enviadas) já no começo: a primeira busca sai mais rápido
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) preconnect(process.env.NEXT_PUBLIC_SUPABASE_URL, { crossOrigin: "anonymous" });
  return (
    <html
      lang={LOCALE_TAGS[locale]}
      suppressHydrationWarning
      className={`${jakarta.variable} ${playfair.variable} ${silkscreen.variable} ${caveat.variable} ${kalam.variable} ${patrick.variable} ${indie.variable} ${reenie.variable} ${atkinson.variable}`}
    >
      <body>
        {/* abertura animada: antes de qualquer pintura, esconde o logo e o formulário até a animação decidir se toca (ver IntroAnimation) */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("pinz:intro")!=="1")document.documentElement.dataset.intro="play"}catch(e){}` }} />
        {/* acessibilidade: o tamanho do texto, a fonte e o contraste escolhidos já valem na primeira pintura */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_INIT_SCRIPT }} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <A11yHost />
          <SiteTracker />
          <ConsentBanner />
        </NextIntlClientProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
