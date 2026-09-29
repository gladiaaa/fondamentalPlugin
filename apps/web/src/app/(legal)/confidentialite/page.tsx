import type { Metadata } from "next";
import { LegalArticle, LegalLink, LegalSection } from "@/features/legal/LegalArticle";
import { EDITEUR, HEBERGEUR } from "@/features/legal/editeur";

export const metadata: Metadata = { title: "Confidentialité — Fondamental Plugins" };

export default function ConfidentialitePage() {
  return (
    <LegalArticle slug="confidentialite">
      <LegalSection id="responsable" title="Responsable du traitement">
        <p>
          {EDITEUR.nom}, {EDITEUR.forme} (voir les <LegalLink href="/mentions-legales">mentions légales</LegalLink>).
          Pour toute question sur vos données : <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>.
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="Données collectées">
        <ul>
          <li>
            <strong>Compte</strong> : adresse e-mail, mot de passe (enregistré sous forme d’empreinte, jamais en clair),
            langue, dates de création et de connexion.
          </li>
          <li>
            <strong>Commandes</strong> : plugin acheté, montant, date et références du paiement chez Stripe. Vos
            coordonnées bancaires sont saisies chez Stripe et ne nous sont jamais transmises.
          </li>
          <li>
            <strong>Licences</strong> : clé de licence et, pour chaque serveur Minecraft qui l’utilise, un identifiant
            d’installation généré par le plugin et les dates de première et de dernière vérification. L’adresse IP du
            serveur n’est utilisée que pour limiter le nombre de vérifications par minute, sans être enregistrée.
          </li>
          <li>
            <strong>Configurations</strong> que vous enregistrez dans le configurateur.
          </li>
          <li>
            <strong>Support</strong> : le contenu des messages que vous nous envoyez.
          </li>
          <li>
            <strong>Données techniques</strong> : adresse IP et navigateur dans les journaux du serveur ; rapports
            d’erreur du site, sans votre adresse IP ; statistiques de visite anonymes (voir la page{" "}
            <LegalLink href="/cookies">Cookies</LegalLink>).
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="finalites" title="Finalités et bases légales">
        <ul>
          <li>Gérer votre compte, vendre et livrer les licences, assurer le support : exécution du contrat.</li>
          <li>Vérifier les licences et limiter le nombre de serveurs par clé : exécution du contrat.</li>
          <li>Tenir la comptabilité et conserver les factures : obligation légale.</li>
          <li>
            Sécuriser le site (blocage après des échecs de connexion, journaux), corriger les erreurs et mesurer
            l’audience de façon anonyme : intérêt légitime.
          </li>
        </ul>
        <p>Nous n’envoyons aucune publicité et ne vendons aucune donnée.</p>
      </LegalSection>

      <LegalSection id="conservation" title="Durée de conservation">
        <ul>
          <li>Compte, licences et configurations : tant que le compte existe.</li>
          <li>Sessions de connexion : 30 jours au plus.</li>
          <li>Liens envoyés par e-mail (confirmation, mot de passe oublié) : jusqu’à leur utilisation ou leur expiration.</li>
          <li>
            Commandes et factures : 10 ans, comme l’impose le code de commerce, y compris après la suppression du compte,
            mais sans lien avec lui.
          </li>
          <li>Journaux du serveur : 14 jours.</li>
        </ul>
      </LegalSection>

      <LegalSection id="destinataires" title="Destinataires">
        <p>Vos données ne sont accessibles qu’à l’éditeur et aux prestataires nécessaires au service :</p>
        <ul>
          <li>
            <strong>{HEBERGEUR.nom}</strong> (Chypre) : hébergement du site et des bases de données ;
          </li>
          <li>
            <strong>Stripe Payments Europe, Ltd.</strong> (Irlande) : paiement et factures ;
          </li>
          <li>
            <strong>Resend, Inc.</strong> (États-Unis) : envoi des e-mails du site ;
          </li>
          <li>
            <strong>Functional Software, Inc. (Sentry)</strong> (États-Unis) : rapports d’erreur techniques.
          </li>
        </ul>
        <p>
          Les transferts vers les États-Unis sont encadrés par le cadre de protection des données UE-États-Unis ou par
          les clauses contractuelles types de la Commission européenne. Les statistiques de visite sont hébergées sur
          notre propre serveur.
        </p>
      </LegalSection>

      <LegalSection id="droits" title="Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de
          portabilité sur vos données. Vous pouvez supprimer votre compte vous-même depuis ses{" "}
          <LegalLink href="/compte/parametres">paramètres</LegalLink> ; pour le reste, écrivez à{" "}
          <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>. Nous répondons dans un délai d’un mois.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL
          (<a href="https://www.cnil.fr">cnil.fr</a>).
        </p>
      </LegalSection>

      <LegalSection id="mineurs" title="Mineurs">
        <p>
          L’achat d’une licence est réservé aux personnes majeures ou aux mineurs disposant de l’accord de leur
          représentant légal.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
