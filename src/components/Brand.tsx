import Link from "next/link";

/** Logo oficial do Pinz (public/img/pinz-logo.webp, recortado rente ao desenho; original em imagens/pinz-logo.png). */
export function Brand({ className = "h-12" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Pinz — página inicial" className="inline-block w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/pinz-logo.webp?v=2" alt="Pinz" draggable={false} className={`block w-auto select-none ${className}`} />
    </Link>
  );
}
