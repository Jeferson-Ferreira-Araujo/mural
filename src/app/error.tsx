"use client";

import { useEffect, useState } from "react";
import { ERROR_TEXT, errorCopy, type ErrorCopy } from "@/lib/errorText";
import { reportError } from "@/lib/reportError";

/** Rede de segurança: se uma tela quebrar ao desenhar, a pessoa vê isto (com saída), e o erro vai para o registro. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [t, setT] = useState<ErrorCopy>(ERROR_TEXT.pt);
  useEffect(() => {
    setT(errorCopy());
    reportError("render", error);
  }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6efe0] p-6 text-center text-[#2a1c12]">
      <div className="max-w-sm">
        <h1 className="font-title text-2xl font-semibold">{t.title}</h1>
        <p className="mt-3 text-[#4a3826]">{t.body}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={reset} className="cursor-pointer rounded-xl bg-[#1f232b] px-4 py-3 text-sm font-semibold text-white">
            {t.retry}
          </button>
          <a href="/" className="rounded-xl px-4 py-3 text-sm font-semibold text-[#6b5440] underline">
            {t.home}
          </a>
        </div>
      </div>
    </main>
  );
}
