import Link from "next/link";
import { AuthShell, primaryButton } from "@/components/ui";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const tx = useTranslations("app.not_found");
  return (
    <AuthShell>
      <h1 className="font-title text-2xl font-semibold">{tx("muralNaoEncontrado")}</h1>
      <p className="mt-3 text-[#4a3826]">{tx("esseEnderecoNaoExisteAinda")}</p>
      <Link href="/entrar" className={`${primaryButton} mt-6`}>
        {tx("criarNovoMural")}</Link>
    </AuthShell>
  );
}
