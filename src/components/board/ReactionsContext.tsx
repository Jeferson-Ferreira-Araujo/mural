"use client";

import { createContext, useContext } from "react";

/** Só quem cuida do mural (dono ou participante) reage aos pins, no destaque. `onChanged` recarrega o quadro para o emoji aparecer no pin. */
export type ReactionsAccess = { onChanged: () => void };

const Ctx = createContext<ReactionsAccess | null>(null);
export const ReactionsProvider = Ctx.Provider;
export const useReactionsAccess = () => useContext(Ctx);
