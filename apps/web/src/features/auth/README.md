# `features/auth`

Inscription, vérification d'e-mail, connexion, mot de passe oublié, réinitialisation, session. Routes déjà disponibles (`docs/api-front.md` §4, §6). Le contexte de session (`csrfToken` en mémoire, jamais `localStorage`) vit ici, appelé uniquement depuis des composants clients (voir CLAUDE.md, section « Site »).
