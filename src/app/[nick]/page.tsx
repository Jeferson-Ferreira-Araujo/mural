import type { Metadata } from "next";
import { ProfileMurals } from "@/components/ProfileMurals";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ nick: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { nick } = await params;
  return { title: `Murais de ${nick}` };
}

export default async function Profile({ params }: Params) {
  const { nick } = await params;
  return <ProfileMurals nick={nick.toLowerCase()} />;
}
