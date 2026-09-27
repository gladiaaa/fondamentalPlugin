import { Button } from "./Button";

/**
 * Bandeau cookies (`.ck` de la maquette). Présentation uniquement : la
 * logique de consentement (mémoriser le choix, ne l'afficher que s'il y a
 * des cookies non essentiels — brief §10) revient à l'écran qui l'utilise.
 * « Refuser » a la même importance visuelle qu'« Accepter » (brief §10 et §11).
 */
export function CookieBanner({
  onAccept,
  onReject,
}: {
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="grid w-full gap-3.5 rounded-card border border-line bg-surface p-[18px_20px] shadow-[0_18px_40px_rgba(0,0,0,.4)]"
    >
      <p className="max-w-[70ch] text-[.9rem] text-muted">
        Ce site utilise des cookies non essentiels pour mesurer l&apos;audience. Vous pouvez les
        refuser sans que ça change votre expérience.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="secondary" onClick={onReject}>
          Refuser
        </Button>
        <Button onClick={onAccept}>Accepter</Button>
      </div>
    </div>
  );
}
