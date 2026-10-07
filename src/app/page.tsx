import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Explorer } from "@/components/Explorer";
import { CONTACT_EMAIL } from "@/lib/contact";
import { SITE_HOST } from "@/lib/mural";

const SITE = `https://${SITE_HOST}`;
const TITLE = "Pinz - Seu mural de momentos compartilhados";
const DESCRIPTION = "Crie o seu mural no Pinz e receba recados, fotos, músicas e vídeos de quem realmente te conhece. Só entra quem responde à sua pergunta.";

// Única página pública indexável (com Termos e Privacidade): quem procura "Pinz" no Google encontra o site; os murais continuam fora.
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", siteName: "Pinz", type: "website", locale: "pt_BR", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Pinz" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.jpg"] },
};

// dados estruturados leves: ajudam o Google a mostrar o nome e o logo do Pinz nos resultados
const jsonLd = [
  { "@context": "https://schema.org", "@type": "WebSite", name: "Pinz", url: SITE, inLanguage: "pt-BR", description: DESCRIPTION },
  { "@context": "https://schema.org", "@type": "Organization", name: "Pinz", url: SITE, logo: `${SITE}/img/pinz-logo.webp`, email: CONTACT_EMAIL },
];

/** Página inicial: busca uma pessoa pelo nickname e desbloqueia o mural respondendo a pergunta. */
export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string; error?: string }> }) {
  // Se o Supabase devolver o login (Google/link) na raiz em vez de /auth/callback, encaminha para concluir a sessão
  const { code, error } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  if (error) redirect("/auth/callback?error=1");
  return (
    <>
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}
      <Explorer />
    </>
  );
}
