"use client";

import { useEffect, useState } from "react";
import { ERROR_TEXT, errorCopy, type ErrorCopy } from "@/lib/errorText";
import { reportError } from "@/lib/reportError";

/** Último recurso: o erro aconteceu no próprio layout, então não há provedores nem estilos do site; por isso o estilo é local. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [t, setT] = useState<ErrorCopy>(ERROR_TEXT.pt);
  useEffect(() => {
    setT(errorCopy());
    reportError("layout", error);
  }, [error]);
  return (
    <html lang="pt">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f6efe0", color: "#2a1c12", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>{t.title}</h1>
          <p style={{ marginTop: 12, color: "#4a3826" }}>{t.body}</p>
          <button type="button" onClick={reset} style={{ marginTop: 24, width: "100%", cursor: "pointer", border: 0, borderRadius: 12, background: "#1f232b", color: "#fff", padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>
            {t.retry}
          </button>
          <a href="/" style={{ display: "block", marginTop: 8, padding: "12px 16px", color: "#6b5440", fontSize: 14, fontWeight: 600 }}>
            {t.home}
          </a>
        </div>
      </body>
    </html>
  );
}
