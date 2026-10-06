import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Explorer } from "@/components/Explorer";

export const metadata: Metadata = { title: "Pinz — murais de recados" };

/** Página inicial: busca uma pessoa pelo nickname e desbloqueia o mural respondendo a pergunta. */
export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string; error?: string }> }) {
  // Se o Supabase devolver o login (Google/link) na raiz em vez de /auth/callback, encaminha para concluir a sessão
  const { code, error } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  if (error) redirect("/auth/callback?error=1");
  return <Explorer />;
}
