import Link from "next/link";
import { AuthShell, primaryButton } from "@/components/ui";

export default function NotFound() {
  return (
    <AuthShell>
      <h1 className="font-title text-2xl font-semibold">Mural não encontrado</h1>
      <p className="mt-3 text-[#4a3826]">Esse endereço não existe (ainda). Que tal criar o seu?</p>
      <Link href="/entrar" className={`${primaryButton} mt-6`}>
        Criar novo mural
      </Link>
    </AuthShell>
  );
}
