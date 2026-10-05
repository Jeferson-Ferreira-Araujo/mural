"use client";

import { createContext, useContext } from "react";

/** true enquanto os pins do mural aberto ainda estão chegando: o quadro não mostra "nenhuma mensagem" antes da hora. */
const Ctx = createContext(false);
export const BoardLoadingProvider = Ctx.Provider;
export const useBoardLoading = () => useContext(Ctx);
