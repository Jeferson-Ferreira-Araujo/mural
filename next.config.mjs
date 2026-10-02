/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // servidor Node (necessário para /[slug] dinâmico)
  images: { unoptimized: true },
};
export default nextConfig;
