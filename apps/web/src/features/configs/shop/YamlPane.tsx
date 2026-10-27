"use client";

import { useEffect, useRef, useState } from "react";
import type { ConfigValues } from "@fondamental/shared";
import { ApiRequestError } from "@/lib/api/client";
import { importConfig, renderConfig, type ConfigTarget } from "@/lib/api/configs";

/** Délai après la dernière frappe avant de relire le fichier. */
const TYPING_DELAY_MS = 500;

/**
 * Le fichier YAML du menu affiché, modifiable à la main. Chaque modification de l'interface réécrit le
 * texte (fichier complet, comme au téléchargement) ; chaque frappe relit le texte et met le menu à jour.
 * Le texte n'est jamais réécrit pendant qu'on le tape, pour ne pas déplacer le curseur.
 */
export function YamlPane({
  target,
  values,
  csrfToken,
  onChange,
}: {
  target: ConfigTarget;
  values: ConfigValues;
  csrfToken: string;
  onChange: (values: ConfigValues) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const typing = useRef(false);
  // Les valeurs qui viennent du texte ne doivent pas le réécrire (commentaires et mise en forme gardés).
  const fromText = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const targetKey = `${target.slug}/${target.version}/${target.file}`;

  useEffect(() => {
    if (fromText.current) {
      fromText.current = false;
      return;
    }
    if (typing.current) return;
    let cancelled = false;
    const t = setTimeout(() => {
      renderConfig(target, values, csrfToken)
        .then((res) => !cancelled && (setText(res.yaml), setError(null), setIgnored([])))
        .catch((e: unknown) => !cancelled && setError(e instanceof ApiRequestError ? e.messages.join(" ") : "Le fichier n’a pas pu être généré."));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // `target` est recréé à chaque rendu : on suit sa clé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, targetKey, csrfToken]);

  function edit(next: string) {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      importConfig(target, next, csrfToken)
        .then((res) => {
          fromText.current = true;
          setError(null);
          setIgnored(res.ignored);
          onChange(res.values);
        })
        .catch((e: unknown) => setError(e instanceof ApiRequestError ? e.messages[0] : "Lecture du fichier impossible."));
    }, TYPING_DELAY_MS);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-[.78rem] text-muted">
        Modifiez les lignes : le menu se met à jour en direct. Les changements faits dans l’interface réécrivent ce texte. Il contient votre clé de
        licence : ne le partagez pas.
      </p>
      {/* Hauteur en style : la règle compacte « .atelier textarea » l'emporte sur les classes. */}
      <textarea
        aria-label={`Fichier ${target.file}`}
        spellCheck={false}
        value={text}
        onChange={(e) => edit(e.target.value)}
        onFocus={() => (typing.current = true)}
        onBlur={() => (typing.current = false)}
        style={{ minHeight: "min(70vh, 760px)" }}
        className="flex-1 resize-y rounded-field border border-line bg-bg p-3 font-mono text-[.8rem] leading-relaxed text-text"
      />
      {error && <p className="rounded-field border border-error/40 px-2.5 py-1.5 text-error">{error}</p>}
      {!error && ignored.length > 0 && (
        <ul className="list-disc rounded-field border border-warning/40 py-1.5 pr-2.5 pl-6 text-warning">
          {ignored.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
