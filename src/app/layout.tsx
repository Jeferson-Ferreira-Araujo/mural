import type { Metadata, Viewport } from "next";
import { Caveat, DM_Sans, Fraunces, Indie_Flower, Kalam, Patrick_Hand, Reenie_Beanie } from "next/font/google";
import { SITE_HOST } from "@/lib/mural";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });
const kalam = Kalam({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-kalam" });
const patrick = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick" });
const indie = Indie_Flower({ subsets: ["latin"], weight: "400", variable: "--font-indie" });
const reenie = Reenie_Beanie({ subsets: ["latin"], weight: "400", variable: "--font-reenie" });

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE_HOST}`),
  title: { default: "Pinz", template: "%s | Pinz" },
  description: "Crie o seu mural no Pinz e receba recados anônimos de quem realmente te conhece.",
  openGraph: { siteName: "Pinz", type: "website", locale: "pt_BR", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Pinz" }] },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  robots: { index: false, follow: false },
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
      className={`${dmSans.variable} ${fraunces.variable} ${caveat.variable} ${kalam.variable} ${patrick.variable} ${indie.variable} ${reenie.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
