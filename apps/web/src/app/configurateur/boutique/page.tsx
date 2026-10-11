import type { Metadata } from "next";
import { ShopEditorPage } from "@/features/configs/shop/ShopEditorPage";

export const metadata: Metadata = {
  title: "Éditeur de menus FondamentalShop — Fondamental Plugins",
  description: "Placez les articles de votre boutique dans ses menus, comme en jeu, puis téléchargez les fichiers.",
};

export default function Page() {
  return <ShopEditorPage />;
}
