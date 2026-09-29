import type { Metadata } from "next";
import { ConfiguratorPage } from "@/features/configs/ConfiguratorPage";

export const metadata: Metadata = {
  title: "Configurateur — Fondamental Plugins",
  description: "Réglez les fichiers de vos plugins Fondamental depuis le site, avec votre clé de licence déjà remplie.",
};

export default function Page() {
  return <ConfiguratorPage />;
}
