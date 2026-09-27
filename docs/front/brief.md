# Brief front : boutique Fondamental Plugins

Adapté du brief de conception original du 26/09/2026. Pour le contrat API exact (routes disponibles ou prévues, corps, erreurs), voir [`docs/api-front.md`](../api-front.md), qui fait foi et est tenu à jour à chaque PR sur l'API — **pas ce document**. Ce fichier couvre la partie visuelle, le contenu et le ton.

Ce fichier accompagne trois autres dossiers, tous dans `docs/front/` : [`maquette/maquettes-boutique.html`](maquette/maquettes-boutique.html) (les écrans), [`charte/`](charte/) (logos, icônes, jetons de design) et [`rapport-plugins/`](rapport-plugins/) (analyse du code de chaque plugin).

## 1. Le projet

Fondamental Plugins vend **quatre plugins Minecraft pour serveurs Paper**. Le site est une boutique avec catalogue, achat, espace client, générateur de `config.yml` et wiki.

| Nom boutique | Slug d'URL | Identifiant côté serveur de licences | Paper | Fichiers |
|---|---|---|---|---|
| FondamentalBedwars | `bedwars` | `bedwars` | 1.21.4 | un seul |
| FondamentalTag | `tag` | `tagcustom` (ancien nom, successeur de TagsCustom 1.x) | 1.21.x | deux : Free et Premium |
| FondamentalCrate | `crate` | `crate` | 1.21+ | deux : Free et Premium |
| FondamentalPass | `pass` | `pass` | 1.21.4+ | un seul |

Tous demandent **Java 21**. Aucun ne cible Spigot ni les versions de Minecraft avant la 1.21.

Chaque plugin existe en édition **FREE** et **PREMIUM**. Les différences réelles, vérifiées dans le code, sont dans les tableaux des fiches de la maquette et dans [`rapport-plugins/`](rapport-plugins/).

- **Bedwars :** équipes qui défendent leur lit, matchmaking, classé Elo, 82 cosmétiques. Prérequis obligatoire : FastAsyncWorldEdit. LuckPerms est quasi indispensable (coins, cosmétiques, rangs).
- **Tag :** tags de joueur animés dans le chat, au-dessus de la tête et dans le TAB, boutique et Atelier où le joueur compose son tag.
- **Crate :** crates animées (9 animations), clés physiques ou virtuelles, éditeur en jeu.
- **Pass :** pass de saison et quêtes, progression partagée sur un réseau (MySQL avec verrou de profil).

**Décidé : les fichiers à télécharger.**
- **Bedwars et Pass :** un seul fichier, l'édition dépend uniquement de la clé (`edition: UNIVERSAL`).
- **Tag et Crate :** deux fichiers, Free et Premium. Un fichier Premium sans clé valide démarre en Free. Le fichier Free de Crate ne contient pas certaines animations ni MySQL.

Règle retenue : fichier Free ouvert à tous, fichier Premium **réservé aux titulaires d'une licence** (bouton « Réservé aux acheteurs » pour un visiteur, téléchargement disponible pour un acheteur). **À vérifier côté API avant de construire l'écran de téléchargement** : `docs/api-front.md` documente aujourd'hui `GET /downloads/:fileId` comme public, sans compte — donc rien côté back n'empêche encore un visiteur non acheteur de télécharger un fichier Premium par son id. Voir l'état réel de l'issue #27 avant de considérer ce point comme réglé.

## 2. Comment fonctionne une licence

Utile pour les textes et les états de l'interface.

1. Le client colle sa clé dans le `config.yml` du plugin, sous `license.key` (format documenté pour Bedwars : `FBW-XXXX-XXXX-XXXX`).
2. Au démarrage, puis toutes les 6 heures, le plugin envoie au serveur de licences sa clé, le nom du produit et un identifiant d'installation, propre à chaque serveur Minecraft et stable.
3. Le serveur vérifie que la clé existe, correspond au produit, n'est ni révoquée ni expirée, et que le nombre maximal d'installations n'est pas dépassé.
4. Il répond `valid: true` avec l'édition et une signature. Le plugin passe en PREMIUM, sinon il reste en FREE. Sans clé : Free, aucun appel réseau.
5. En cas de **panne du réseau**, le plugin garde la dernière réponse **72 heures**. Une clé **refusée ou révoquée** repasse en Free **immédiatement**, sans tolérance.
6. Commandes de vérification : `/tag license [check]`, `/fbw license [check]`, `/pass admin license [check]`. Crate n'en a pas : le statut apparaît dans les journaux de démarrage.

Conséquences pour le front :
- Une licence a un statut (**Active** ou **Révoquée**), une date d'achat, un nombre d'installations utilisées sur un maximum.
- Chaque installation a un identifiant, une date de première connexion et une de dernière connexion. L'utilisateur peut la **libérer**.

**Deux sens du mot « premium » sur la fiche du Pass.** L'édition Premium du plugin s'achète sur la boutique (licence du propriétaire du serveur). La piste premium du pass est vendue par le serveur à ses joueurs, avec la permission `fondamentalpass.premium`, et exige l'édition Premium. La fiche du Pass a un encart qui l'explique : à conserver.

## 3. Comment lire la maquette

Ouvre [`maquette/maquettes-boutique.html`](maquette/maquettes-boutique.html) dans un navigateur (connexion internet nécessaire pour les polices).

- La colonne de gauche liste les écrans, groupés comme l'arborescence du site.
- Les boutons du haut changent la largeur (ordinateur ou mobile), la session (visiteur ou connecté), le thème (sombre ou clair) et affichent le bandeau cookies.
- Les puces « Variante » montrent les états (chargement, vide, erreur, etc.) et les quatre plugins de la fiche.
- Sous chaque écran, des notes résument le contenu attendu et les états à prévoir.
- On peut cliquer dans la maquette comme sur un prototype.
- Chaque écran a une adresse : `#ecran.variante~flags`. Exemple : `#fiche.pass~mu` (fiche Pass, mobile, connecté). Flags : `m` mobile, `u` connecté, `l` clair, `c` cookies.

**La maquette est une référence visuelle, pas du code à recopier.** Reproduis-la en composants Next.js, avec la convention de rangement décrite dans `CLAUDE.md` (section « Site »). Reprends les valeurs (couleurs, espacements, rayons), la structure, les textes et les états. Dans le fichier :
- `.scr[data-scr]` est un écran, `.st[data-st]` une variante ;
- `<script id="meta">` contient la liste des écrans et leurs notes ;
- le CSS est dans le `<style>` de tête.

## 4. Pages et ordre de travail

| Écran de la maquette | Route | Dépend de l'API |
|---|---|---|
| Accueil | `/` | non |
| Catalogue | `/plugins` | oui — disponible (#21) |
| Fiche d'un plugin | `/plugins/[slug]` | oui — disponible (#21, #27) |
| Wiki | `/wiki/...` | non (Fumadocs) |
| Support | `/support` | oui (formulaire ; la FAQ porte aussi sur les licences) |
| Changelog (optionnel) | `/changelog` | oui — disponible via les fichiers du plugin (#27) |
| Connexion, inscription | `/connexion`, `/inscription` | oui — disponible |
| Vérifier l'e-mail | `/verifier-email` | oui — disponible |
| Mot de passe oublié, réinitialisation | `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe` | oui — disponible |
| Après le paiement | `/merci` | oui — prévue (#23, #24) |
| Paiement annulé | `/paiement-annule` | non |
| Espace client | `/compte`, `/compte/licences`, `/compte/licences/[id-interne]`, `/compte/config`, `/compte/commandes`, `/compte/parametres` | oui, connexion obligatoire — licences prévues (#25, #45), config prévue (#30) |
| Pages légales | `/cgv`, `/mentions-legales`, `/confidentialite`, `/cookies` | non (#35) |
| 404, 500, maintenance | | non |

Voir l'issue [#58](https://github.com/gladiaaa/fondamentalPlugin/issues/58) pour l'ordre de travail par phase, tenu à jour.

**Pas de page « Tarifs ».** Les prix s'affichent sur la carte et sur la fiche de chaque plugin (`docs/api-front.md` §4 : `price` est `null` tant qu'il n'est pas fixé, afficher « Bientôt disponible » dans ce cas), et les questions sur les licences (installations, changement de serveur, remboursement, panne du serveur de licences) sont dans la FAQ de `/support`.

## 5. Données dont les écrans ont besoin

Le contrat exact est dans `docs/api-front.md` et `apps/api/openapi.json`. Résumé de ce que les écrans doivent afficher :

- **Plugin :** slug, nom, description, prix (ou « Bientôt disponible »), prérequis (obligatoires, recommandés), captures et vidéos, tableau Gratuit/Premium (texte libre, pas dans l'API — voir `rapport-plugins/`).
- **Fichiers à télécharger :** version du plugin (texte libre), édition, versions Minecraft compatibles, date, taille, SHA-256, lien.
- **Changelog :** version, date, entrées (`release.changelog`).
- **Licence :** plugin, clé, statut, date d'achat, commande, installations utilisées et maximum, liste des installations (identifiant, première et dernière connexion). *Prévu, pas encore disponible.*
- **Commande :** date, plugin, montant, statut, lien vers le reçu Stripe. *Prévu.*
- **Compte :** e-mail (et s'il est confirmé), date de création. Comptes liés (Microsoft, Discord, Google) : prévu avec l'OAuth (#18).
- **Générateur :** pour chaque plugin, la liste des options du fichier de config concerné (clé, type, valeur par défaut, contraintes, si l'option est réservée au Premium). *Prévu (#30).* Les listes (tags, crates, quêtes) relèvent d'autres fichiers YAML : hors périmètre du premier générateur.

## 6. Design system

Les jetons sont dans [`charte/jetons/`](charte/jetons/) (`fondamental-jetons.css` et `.json`). **Utilise ces fichiers**, pas des valeurs recopiées à la main.

**Thème.** Sombre par défaut, avec une version claire (bouton optionnel). Le site est en sombre-d'abord : les couleurs sont des variables, redéfinies pour le clair.

| Rôle | Sombre | Clair |
|---|---|---|
| Fond | `#120F1A` | `#F3F0FA` |
| Surface | `#1A1625` | `#FFFFFF` |
| Surface 2 | `#231D33` | `#EAE5F6` |
| Ligne | `#2A2338` | `#DDD6EE` |
| Texte | `#F0ECF8` | `#170F2A` |
| Texte discret | `#9A90B3` | `#5E5673` |
| Accent (fonds de boutons) | `#B7A0FF` | `#B7A0FF` |
| Accent (texte, liens, actif) | `#B7A0FF` | `#6A4FD0` |
| Texte sur accent | `#170F2A` | `#170F2A` |
| Succès / Alerte / Erreur / Info | `#7ED6A0` `#F0C36A` `#F07A7A` `#8FB8FF` | `#1F8A55` `#9A6A00` `#C23B3B` `#2F63C9` |

L'améthyste est **l'unique accent**. Les signaux (succès, erreur…) servent à l'état, jamais à décorer.

**Typographie** (Google Fonts, à charger avec `next/font`) :
- **Sora** : titres et nom de la marque (600 ; « Plugins » en 300, en violet), interlettrage serré (−0.04 à −0.05em).
- **Instrument Sans** : texte courant.
- **JetBrains Mono** : code, étiquettes en capitales, clés de licence.

**Formes.** Rayons : champs 12 px, cartes 20 px, grandes cartes 24 px, boutons en pilule. Surfaces distinguées par la teinte et un filet fin, presque jamais par une ombre. Focus visible : anneau de 4 px à 35 % d'améthyste. Mouvement : 120, 200 et 320 ms, courbe `cubic-bezier(.2,.7,.2,1)`. Respecter `prefers-reduced-motion`.

**Composants** de la maquette à reproduire : boutons (principal, secondaire, discret, danger, chargement), champs, interrupteurs, badges (mono), alertes, onglets, tableaux, cartes de plugin, tableau comparatif, bloc de code avec bouton copier, FAQ en `details`, skeletons, états vides, toasts, bandeau cookies. La page « États et composants » les montre tous.

**Icônes.** Trait de 2 px, bouts arrondis, grille de 32 px, couleur héritée du texte (`currentColor`). Dans [`charte/icones/`](charte/icones/). L'icône du Pass (un ticket) est nouvelle, fournie en SVG, proposition à valider. Les logos Microsoft, Discord et Google de la maquette sont des substituts : utiliser les logos officiels.

**Logo.** Cube isométrique violet avec F et P gravés. Fichiers dans [`charte/logo/`](charte/logo/). Le nom se compose en Sora, pas en image : « Fondamental » en 600, « Plugins » en 300 dessous, en violet.

## 7. Responsive

Mobile d'abord. La maquette adapte chaque page à la largeur de son cadre :
- jusqu'à environ 940 px : les colonnes latérales passent sous le contenu (bloc d'achat de la fiche en premier) ;
- jusqu'à environ 760 px : menu burger, barre latérale de l'espace client en liste horizontale, cartes sur une colonne ;
- jusqu'à environ 520 px : pied de page sur une colonne.

Aucun défilement horizontal de la page : seuls les tableaux et les blocs de code défilent, dans leur propre conteneur.

## 8. Contenu et ton

- **Vouvoiement**, ton posé, précis, sans superlatif, sans point d'exclamation, sans « Oups ».
- Des chiffres et des noms exacts, pas de « nombreux » ni de « rapidement ».
- Signature : « Fondamental Plugins. Le socle de votre serveur. »
- Exemples : « Le paiement n'a pas abouti. Vérifiez votre carte. » ; « Cette adresse e-mail n'est pas valide. » ; « Tout se règle dans config.yml. »
- Erreurs de champ : sous le champ, en texte (pas seulement en couleur).
- Confirmations (libérer une installation, supprimer le compte) : **dans la page**, jamais avec `alert` ou `confirm` du navigateur.
- Retours brefs : toasts (« Clé copiée », « Installation libérée », « Paramètres enregistrés »).

**À ne pas promettre en l'état** (écarts constatés entre les README et le code, voir `rapport-plugins/00-synthese.md`) :
- des quêtes du Pass alimentées automatiquement par Bedwars ou Crate : aucun des deux n'envoie d'événement au Pass ;
- des limites de gain globales fiables sur un réseau multi-serveurs (Crate) ;
- des cosmétiques Commun et Rare en édition gratuite (Bedwars) : seuls 5 cosmétiques par défaut sont utilisables ;
- l'absence des animations 3D dans le fichier gratuit de Crate ;
- les animations `wheel`, `spotlight` et `flip` en édition gratuite (Crate) : elles sont Premium.

## 9. États à prévoir sur toutes les pages

Chargement (skeletons), liste vide (avec un bouton utile), erreur de l'API (avec « Réessayer »), et pour l'espace client une session expirée qui renvoie vers `/connexion`.

## 10. Sécurité et vie privée

Les règles générales (cookie de session, jeton CSRF, format d'erreur) sont dans `docs/api-front.md` §3 et §5. En plus, côté écrans :

- Les clés de licence sont **masquées par défaut** (bouton Afficher, bouton Copier).
- Utiliser un **identifiant interne** dans `/compte/licences/[id]`, pas la clé complète : une clé complète dans une URL se retrouve dans l'historique et les journaux.
- Bandeau cookies : seulement s'il y a des cookies non essentiels. « Refuser » doit être aussi visible qu'« Accepter ».
- Pied de page et mentions légales : « Fondamental Plugins n'est pas affilié à Mojang Studios ni à Microsoft. Minecraft est une marque de Mojang Studios. »

## 11. SEO et accessibilité

- Titre, description et image de partage par page, plan du site, site de développement en `noindex`.
- Contrastes suffisants (les couples de la charte sont calculés), navigation au clavier, focus visible, texte alternatif sur les images, libellés sur tous les champs.
- Le tableau Gratuit/Premium doit rester lisible par un lecteur d'écran : une coche seule ne suffit pas, ajoute un texte (« Inclus », « Non inclus »).

## 12. Ce qui reste ouvert côté front

- **Case de renonciation** au droit de rétractation avant l'achat, ajoutée sur la fiche plugin : proposition à valider avec les CGV (#35).
- **Icône du Pass** : nouvelle, à valider.
- **Captures d'écran et avis clients :** emplacements vides. Ne pas mettre de faux avis.
- Pour tout ce qui dépend de décisions produit (prix, langues, offres groupées) : voir `docs/api-front.md` §11, tenu à jour côté API.
