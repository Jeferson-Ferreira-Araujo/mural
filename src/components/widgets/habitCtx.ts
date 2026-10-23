"use client";

import { createContext, useContext } from "react";

/** Liga o cartão de hábito ao mural: o dono pode marcar o dia de hoje (o provedor dos bottons preenche). Fora do mural não há marcação. */
export const HabitCtx = createContext<{ canMark: boolean; check: (id: string) => Promise<boolean> }>({ canMark: false, check: async () => false });
export const useHabit = () => useContext(HabitCtx);
