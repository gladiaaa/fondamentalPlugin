# `components/ui`

Composants génériques et réutilisables, sans logique métier : boutons, champs, interrupteurs, badges, alertes, onglets, tableaux, bloc de code, FAQ, skeletons, états vides, bandeau cookies — la page « États et composants » de `docs/front/maquette/maquettes-boutique.html`.

Un composant = un fichier du même nom (PascalCase). Comportement accessible via les primitives Radix déjà installées (`@radix-ui/react-tabs`, `-switch`, `-accordion`, `-dialog`, `-tooltip`), stylées avec les classes Tailwind issues des jetons (`bg-surface`, `text-muted`, `rounded-card`…) — jamais de CSS propre au composant.
