import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PrivacidadeContent } from "./Content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("privacyTitle"), alternates: { canonical: "/privacidade" }, robots: { index: true, follow: true } };
}

export default function Privacidade() {
  return <PrivacidadeContent />;
}
