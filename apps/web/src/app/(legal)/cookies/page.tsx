import type { Metadata } from "next";
import { LegalArticle, LegalLink, LegalSection } from "@/features/legal/LegalArticle";

export const metadata: Metadata = { title: "Cookies — Fondamental Plugins" };

export default function CookiesPage() {
  return (
    <LegalArticle slug="cookies">
      <p>
        Ce site ne dépose <strong>aucun cookie publicitaire ni de mesure d’audience</strong>. C’est pour cela qu’il ne
        vous affiche pas de bandeau de consentement.
      </p>

      <LegalSection id="essentiels" title="Cookie essentiel">
        <p>
          Un seul cookie est déposé, et seulement quand vous vous connectez : le <strong>cookie de session</strong>. Il
          vous garde connecté pendant 30 jours au plus, n’est lisible que par notre serveur et disparaît à la
          déconnexion. Indispensable au fonctionnement de votre compte, il ne demande pas votre consentement.
        </p>
      </LegalSection>

      <LegalSection id="audience" title="Mesure d’audience">
        <p>
          Nous comptons les visites avec Umami, un outil hébergé sur notre propre serveur, <strong>sans cookie</strong>{" "}
          et sans conserver votre adresse IP : les statistiques sont anonymes et ne permettent pas de vous suivre d’un
          site à l’autre. Si votre navigateur envoie le signal « Ne pas suivre » (Do Not Track), votre visite n’est pas
          comptée.
        </p>
      </LegalSection>

      <LegalSection id="paiement" title="Paiement">
        <p>
          Le paiement se déroule sur la page de Stripe, qui dépose ses propres cookies sur son domaine pour sécuriser la
          transaction et lutter contre la fraude. Ils relèvent de la{" "}
          <a href="https://stripe.com/fr/legal/cookies-policy">politique de cookies de Stripe</a>.
        </p>
      </LegalSection>

      <LegalSection id="choix" title="Gérer vos choix">
        <p>
          Vous pouvez supprimer ou bloquer les cookies dans les réglages de votre navigateur. Sans le cookie de session,
          vous pouvez consulter le site, mais pas vous connecter. Pour le reste de vos données, voir la{" "}
          <LegalLink href="/confidentialite">politique de confidentialité</LegalLink>.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
