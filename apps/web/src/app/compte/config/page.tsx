import { ConfigGenerator } from "@/features/configs/ConfigGenerator";

/** Générateur de configuration (#30) : réservé aux détenteurs d'une licence du plugin. */
export default function ConfigPage() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid gap-1.5">
        <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Espace client</p>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Générateur de configuration</h1>
        <p className="text-[.92rem] text-muted">
          Réglez vos fichiers depuis le site : votre clé de licence est déjà remplie, les commentaires du plugin sont gardés.
        </p>
      </div>
      <ConfigGenerator />
    </div>
  );
}
