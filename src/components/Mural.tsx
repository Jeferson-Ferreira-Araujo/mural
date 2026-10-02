"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { boardInfo, messages } from "@/data/mock";
import { DesktopBoard } from "./DesktopBoard";
import { MobileCarousel } from "./MobileCarousel";
import { Toast } from "./Toast";

/**
 * Desktop (lg+): mural físico completo. Mobile/tablet: carrossel, uma mensagem por vez.
 * Os dois são renderizados e alternados por CSS (sem flash de layout no carregamento).
 */
export function Mural() {
  const [unlocked, setUnlocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const shared = { messages, ...boardInfo, unlocked, onUnlock: () => setUnlocked(true), onNotify: notify };

  return (
    <>
      <div className="hidden lg:block">
        <DesktopBoard {...shared} />
      </div>
      <div className="lg:hidden">
        <MobileCarousel {...shared} />
      </div>
      <Toast message={toast} />
    </>
  );
}
