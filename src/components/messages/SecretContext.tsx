"use client";

import { createContext, useContext } from "react";

/** Detalhe de um pin em segredo que o dono pode ver: o selo no centro do pin mostra ou esconde o conteúdo (só nesta janela). */
export type SecretToggle = { revealed: boolean; toggle: () => void };
const Ctx = createContext<SecretToggle | null>(null);
export const SecretProvider = Ctx.Provider;
export const useSecretToggle = () => useContext(Ctx);
