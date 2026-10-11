/** @type {import('next').NextConfig} */

// cabeçalhos de segurança em todas as páginas
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" }, // ninguém coloca o Pinz dentro de outro site (clickjacking)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig = {
  output: "standalone", // servidor Node (necessário para /[slug] dinâmico)
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // o service worker nunca fica em cache do navegador: uma versão nova vale na próxima abertura
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/offline.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};
export default nextConfig;
