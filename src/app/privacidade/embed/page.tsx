import type { Metadata } from "next";
import { PrivacidadeContent } from "../Content";

export const metadata: Metadata = { robots: { index: false, follow: false }, alternates: { canonical: "/privacidade" } };

export default function PrivacidadeEmbed() {
  return <PrivacidadeContent bare />;
}
