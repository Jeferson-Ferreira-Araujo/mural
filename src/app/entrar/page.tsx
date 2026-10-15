import { Explorer } from "@/components/Explorer";

/**
 * Entrar / Criar conta: a mesma tela inicial de login (mural de exemplo e formulário), já na aba pedida.
 * `?modo=entrar` abre em "Entrar"; sem isso abre em "Criar conta". `?next=/nome/mural` leva a pessoa de volta ao mural que ela queria ver.
 */
export default async function Entrar({ searchParams }: { searchParams: Promise<{ modo?: string; next?: string }> }) {
  const { modo, next } = await searchParams;
  return <Explorer authMode={modo === "entrar" ? "login" : "signup"} nextPath={typeof next === "string" ? next : undefined} />;
}
