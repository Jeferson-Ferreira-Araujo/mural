"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner, AuthShell } from "@/components/ui";
import { takePayReturn } from "@/lib/payments";
import { useTranslations } from "next-intl";

/** Volta do Mercado Pago: não mostra tela própria; leva a pessoa de volta de onde ela saiu, com o resultado num modal. */
function Back() {
  const tx = useTranslations("app.pagamento.page");
  const router = useRouter();
  const q = useSearchParams();
  useEffect(() => {
    const result = q.get("produto") === "plus" ? "plus" : (q.get("status") ?? "pendente");
    const key = ["ok", "pendente", "falhou", "plus"].includes(result) ? result : "pendente";
    const pid = q.get("payment_id") ?? q.get("collection_id"); // o número do pagamento: a tela confere a situação real ao voltar
    router.replace(`${takePayReturn() ?? "/"}?pg=${key}${pid && /^d{4,20}$/.test(pid) ? `&pid=${pid}` : ""}`);
  }, [q, router]);
  return (
    <AuthShell>
      <Spinner label={tx("voltandoParaOPinz")} />
    </AuthShell>
  );
}

export default function Pagamento() {
  return (
    <Suspense>
      <Back />
    </Suspense>
  );
}
