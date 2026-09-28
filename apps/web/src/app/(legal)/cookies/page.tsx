import type { Metadata } from "next";
import { LegalArticle } from "@/features/legal/LegalArticle";
import { LEGAL_PAGES } from "@/features/legal/pages";

export const metadata: Metadata = { title: "Cookies — Fondamental Plugins" };

export default function CookiesPage() {
  return <LegalArticle page={LEGAL_PAGES.find((p) => p.slug === "cookies")!} />;
}
