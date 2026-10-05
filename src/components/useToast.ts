"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Aviso curto (toast): `message` para renderizar e `notify` para disparar. */
export function useToast(ms = 2800) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback(
    (msg: string) => {
      setMessage(msg);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), Math.max(ms, msg.length * 55)); // avisos longos ficam mais tempo na tela
    },
    [ms],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  return { message, notify };
}
