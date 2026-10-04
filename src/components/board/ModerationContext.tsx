"use client";

import { createContext, useContext } from "react";

/** Só o dono, vendo o próprio mural: aprovar ou recusar um pin pendente direto no destaque. Devolve true se deu certo. */
export type Moderation = { moderate: (id: string, approve: boolean) => Promise<boolean> };

const Ctx = createContext<Moderation | null>(null);
export const ModerationProvider = Ctx.Provider;
export const useModeration = () => useContext(Ctx);
