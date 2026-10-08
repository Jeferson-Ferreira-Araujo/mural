"use client";

import { createContext, useContext } from "react";

/** Quem está vendo o mural pode reagir aos pins (só com conta, e só no destaque do pin). `token` é o desbloqueio de quem visita. */
export type ReactionsAccess = { token: string | null };

const Ctx = createContext<ReactionsAccess | null>(null);
export const ReactionsProvider = Ctx.Provider;
export const useReactionsAccess = () => useContext(Ctx);
