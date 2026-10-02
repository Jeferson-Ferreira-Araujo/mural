import type { Metadata } from "next";
import { DemoMural } from "@/components/demo/DemoMural";

export const metadata: Metadata = { title: "Demonstração" };

/** Demonstração do modelo do Pinz (planos, 5/15 e 15/15, lotado, cápsula) com dados locais. */
export default function Demo() {
  return <DemoMural />;
}
