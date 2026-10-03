import Link from "next/link";

/** Convite para criar o próprio mural. `big` = botão de destaque (barra lateral / topo do celular). */
export function CreateMuralLink({ className = "", big = false }: { className?: string; big?: boolean }) {
  const look = big
    ? "justify-center rounded-[0.9em] bg-[#d9a21b] px-[1.2em] py-[0.95em] text-[1.1em] font-bold text-[#2a1c12] shadow-[0_0.5em_1.2em_rgba(120,70,0,.35)] hover:bg-[#e6ae22]"
    : "rounded-full px-4 py-2 text-sm font-semibold";
  return (
    <Link
      href="/entrar"
      className={`inline-flex items-center gap-1.5 whitespace-nowrap transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a1c12] ${look} ${className}`}
    >
      <span aria-hidden className="text-[1.15em] leading-none">+</span> Criar novo mural
    </Link>
  );
}
