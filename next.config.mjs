import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */

// Política de conteúdo (CSP): o navegador só carrega script, conexão e janela de fora dos endereços abaixo. Começa em modo "só avisa" (Report-Only):
// violações aparecem no console do navegador sem bloquear nada; depois de conferir as telas, troque a chave para "Content-Security-Policy" para valer de verdade.
const SUPABASE = "https://npylmcjxcosoytuhjrxu.supabase.co";
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://sdk.mercadopago.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  `media-src 'self' blob: ${SUPABASE}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE} wss://npylmcjxcosoytuhjrxu.supabase.co https://api.stripe.com https://*.stripe.com https://*.mercadopago.com https://*.mercadolibre.com https://cloudflareinsights.com`,
  "frame-src https://js.stripe.com https://*.stripe.com https://*.mercadopago.com https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

// sites de teste de tela autorizados a abrir o Pinz em um quadro (TEMPORÁRIO; vazio = ninguém)
const TEMP_FRAME_TESTERS = ["https://responsivetesttool.com", "https://*.responsivetesttool.com"];

// cabeçalhos de segurança em todas as páginas
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // ninguém coloca o Pinz dentro de outro site (clickjacking)... com UMA exceção TEMPORÁRIA para o dono testar tamanhos de tela em ferramentas online.
  // Para voltar ao normal: deixe TEMP_FRAME_TESTERS vazio (ele troca o X-Frame-Options por frame-ancestors só com esses sites).
  ...(TEMP_FRAME_TESTERS.length ? [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' ${TEMP_FRAME_TESTERS.join(" ")}` }] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig = {
  output: "standalone", // servidor Node (necessário para /[slug] dinâmico)
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // imagens do site (fundos, bottons, logos, ícones): o navegador guarda por 1 dia e, depois, mostra a guardada enquanto busca a nova (até 7 dias)
      { source: "/img/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }] },
      { source: "/og.jpg", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      // o service worker nunca fica em cache do navegador: uma versão nova vale na próxima abertura
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/offline.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};
export default withNextIntl(nextConfig);
