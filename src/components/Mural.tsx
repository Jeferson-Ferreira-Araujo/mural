"use client";

import { useState } from "react";
import { boardInfo, messages } from "@/data/mock";
import { DesktopBoard } from "./DesktopBoard";
import { MobileCarousel } from "./MobileCarousel";

/**
 * Desktop (lg+): mural físico completo. Mobile/tablet: carrossel, uma mensagem por vez.
 * Os dois são renderizados e alternados por CSS (sem flash de layout no carregamento).
 */
export function Mural() {
  const [unlocked, setUnlocked] = useState(false);
  const shared = { messages, ...boardInfo, unlocked, onUnlock: () => setUnlocked(true) };

  return (
    <>
      <div className="hidden lg:block">
        <DesktopBoard {...shared} />
      </div>
      <div className="lg:hidden">
        <MobileCarousel {...shared} />
      </div>
    </>
  );
}
