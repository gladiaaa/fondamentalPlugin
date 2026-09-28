import type { Metadata } from "next";
import { LegalArticle } from "@/features/legal/LegalArticle";
import { LEGAL_PAGES } from "@/features/legal/pages";

export const metadata: Metadata = { title: "Mentions légales — Fondamental Plugins" };

export default function MentionsLegalesPage() {
  return <LegalArticle page={LEGAL_PAGES.find((p) => p.slug === "mentions-legales")!} />;
}
