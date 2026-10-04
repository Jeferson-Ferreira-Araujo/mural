import Link from "next/link";
import { LOGO_RATIO, TACK } from "@/lib/pinzLogo";

/**
 * Logo do Pinz: bloco amarelo com a escrita (public/img/pinz/logo.webp, sem tachinha) + a tachinha por cima.
 * A mesma composição é usada na animação de abertura (IntroAnimation), para a troca ser invisível.
 */
export function Brand({ className = "h-12" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Pinz — página inicial" className="brand-real inline-block w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd]">
      <span className={`relative block ${className}`} style={{ aspectRatio: LOGO_RATIO }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/pinz/logo.webp?v=3" alt="Pinz" draggable={false} className="block size-full select-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/tachinha.webp" alt="" aria-hidden draggable={false} className="pointer-events-none absolute block select-none [filter:drop-shadow(0_0.08em_0.1em_rgba(0,0,0,.45))]" style={{ ...TACK, transform: "scaleX(-1)" }} />
      </span>
    </Link>
  );
}
