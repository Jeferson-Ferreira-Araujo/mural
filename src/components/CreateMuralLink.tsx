import Link from "next/link";

export function CreateMuralLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/entrar"
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd] ${className}`}
    >
      <span aria-hidden className="text-base leading-none">+</span> Criar meu mural
    </Link>
  );
}
