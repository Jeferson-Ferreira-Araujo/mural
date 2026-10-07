"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner, AuthShell } from "@/components/ui";
import { takePayReturn } from "@/lib/payments";

/** Volta do Mercado Pago: não mostra tela própria; leva a pessoa de volta de onde ela saiu, com o resultado num modal. */
function Back() {
  const router = useRouter();
  const q = useSearchParams();
  useEffect(() => {
    const result = q.get("produto") === "plus" ? "plus" : (q.get("status") ?? "pendente");
    const key = ["ok", "pendente", "falhou", "plus"].includes(result) ? result : "pendente";
    router.replace(`${takePayReturn() ?? "/"}?pg=${key}`);
  }, [q, router]);
  return (
    <AuthShell>
      <Spinner label="Voltando para o Pinz…" />
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
