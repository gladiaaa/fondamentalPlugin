import { redirect } from "next/navigation";

/** Ancienne adresse du générateur (#30) : il a maintenant sa propre page. */
export default function ConfigPage() {
  redirect("/configurateur");
}
