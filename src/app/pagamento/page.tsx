"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell, primaryButton } from "@/components/ui";

const TEXT: Record<string, { title: string; body: string }> = {
  ok: { title: "Pagamento recebido!", body: "Seus créditos entram na conta em instantes. Se não aparecerem logo, atualize a página em um minuto." },
  pendente: { title: "Pagamento em análise", body: "Assim que o Mercado Pago confirmar (no Pix é imediato), seus créditos entram sozinhos na conta." },
  falhou: { title: "Pagamento não concluído", body: "Nada foi cobrado. Você pode tentar de novo quando quiser." },
  plus: { title: "Assinatura enviada!", body: "Assim que o Mercado Pago confirmar a assinatura, o seu mural vira PLUS automaticamente. Pode levar alguns instantes." },
};

function Content() {
  const q = useSearchParams();
  const key = q.get("produto") === "plus" ? "plus" : (q.get("status") ?? "pendente");
  const t = TEXT[key] ?? TEXT.pendente;
  return (
    <AuthShell>
      <div role="status">
        <h1 className="font-title text-2xl font-semibold">{t.title}</h1>
        <p className="mt-3 text-[#4a3826]">{t.body}</p>
        <Link href="/" className={`${primaryButton} mt-6`}>
          Voltar ao meu mural
        </Link>
      </div>
    </AuthShell>
  );
}

export default function Pagamento() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
