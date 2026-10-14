import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Caveat, Indie_Flower, Kalam, Patrick_Hand, Playfair_Display, Plus_Jakarta_Sans, Reenie_Beanie, Silkscreen } from "next/font/google";
import { A11yHost } from "@/components/A11yHost";
import { PwaRegister } from "@/components/PwaRegister";
import { A11Y_INIT_SCRIPT } from "@/lib/a11y";
import { SITE_HOST } from "@/lib/mural";
import "./globals.css";

// uma só fonte para toda a interface (textos, títulos, botões); a letra de mão fica só dentro dos pins
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });
// só dentro dos widgets da loja: serifa elegante (frases, relógio analógico) e letra de pixel (relógio e clima pixel)
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], weight: ["400", "500", "600"], variable: "--font-playfair" });
const silkscreen = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-silk" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });
const kalam = Kalam({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-kalam" });
const patrick = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick" });
const indie = Indie_Flower({ subsets: ["latin"], weight: "400", variable: "--font-indie" });
// fonte de leitura fácil (Acessibilidade): só é baixada quando a pessoa liga essa opção
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", preload: false });
const reenie = Reenie_Beanie({ subsets: ["latin"], weight: "400", variable: "--font-reenie" });

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE_HOST}`),
  title: { default: "Pinz", template: "%s | Pinz" },
  description: "O Pinz é um mural digital para colecionar momentos: receba recados, fotos, músicas e vídeos de quem você ama.",
  openGraph: { siteName: "Pinz", type: "website", locale: "pt_BR", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Pinz" }] },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  robots: { index: false, follow: false },
  applicationName: "Pinz",
  // iOS: ao adicionar à tela de início abre em tela cheia, com o ícone do Pinz
  appleWebApp: { capable: true, title: "Pinz", statusBarStyle: "black-translucent" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b2616",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${jakarta.variable} ${playfair.variable} ${silkscreen.variable} ${caveat.variable} ${kalam.variable} ${patrick.variable} ${indie.variable} ${reenie.variable} ${atkinson.variable}`}
    >
      <body>
        {/* abertura animada: antes de qualquer pintura, esconde o logo e o formulário até a animação decidir se toca (ver IntroAnimation) */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("pinz:intro")!=="1")document.documentElement.dataset.intro="play"}catch(e){}` }} />
        {/* acessibilidade: o tamanho do texto, a fonte e o contraste escolhidos já valem na primeira pintura */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_INIT_SCRIPT }} />
        {children}
        <A11yHost />
        <PwaRegister />
      </body>
    </html>
  );
}
