/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // site estático: nesta etapa não há backend
  images: { unoptimized: true },
  trailingSlash: true,
};
export default nextConfig;
