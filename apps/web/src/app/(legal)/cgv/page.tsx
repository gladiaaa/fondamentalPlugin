import type { Metadata } from "next";
import { Alert } from "@/components/ui/Alert";
import { ACompleter, LegalArticle, LegalLink, LegalSection } from "@/features/legal/LegalArticle";
import { EDITEUR, MEDIATEUR, SITE } from "@/features/legal/editeur";

export const metadata: Metadata = { title: "CGV — Fondamental Plugins" };

export default function CgvPage() {
  return (
    <LegalArticle slug="cgv">
      <Alert variant="info" title="En bref">
        La licence Premium est payée une fois et vaut à vie. Elle est livrée immédiatement : en payant, vous renoncez à
        votre droit de rétractation. Un plugin qui ne fonctionne pas comme décrit reste couvert par la garantie légale
        de conformité.
      </Alert>

      <LegalSection id="objet" title="Objet">
        <p>
          Les présentes conditions régissent la vente des licences Premium des plugins Minecraft FondamentalBedwars,
          FondamentalTag, FondamentalCrate et FondamentalPass sur le site {SITE}, par {EDITEUR.nom} (voir les{" "}
          <LegalLink href="/mentions-legales">mentions légales</LegalLink>), à des clients particuliers ou
          professionnels.
        </p>
        <p>
          Elles sont acceptées au moment du paiement, par la case prévue à cet effet. Les conditions applicables sont
          celles en vigueur au jour de la commande.
        </p>
      </LegalSection>

      <LegalSection id="produits" title="Produits">
        <p>
          Chaque plugin existe en <strong>édition gratuite</strong>, téléchargeable sans achat, et en{" "}
          <strong>édition Premium</strong>, activée par une clé de licence. Les fonctions de chaque édition sont
          décrites sur la fiche du plugin et dans le wiki.
        </p>
        <p>
          Les prérequis techniques (logiciel serveur, version de Minecraft, version de Java, plugins nécessaires) sont
          indiqués sur la fiche de chaque plugin. Il vous appartient de vérifier qu’ils correspondent à votre serveur
          avant l’achat ; l’édition gratuite permet de l’essayer.
        </p>
      </LegalSection>

      <LegalSection id="licence" title="Licence d’utilisation">
        <p>L’achat vous donne une licence d’utilisation du plugin Premium, et non la propriété du logiciel. Cette licence est :</p>
        <ul>
          <li>
            <strong>à vie</strong> : sans abonnement ni date de fin ;
          </li>
          <li>
            <strong>limitée en nombre de serveurs</strong> : chaque serveur Minecraft qui utilise la clé compte comme
            une installation, dans la limite indiquée dans <LegalLink href="/compte/licences">Mes licences</LegalLink>.
            Une installation peut être libérée depuis votre compte, par exemple après un changement de machine ;
          </li>
          <li>
            <strong>personnelle</strong> : la clé est réservée aux serveurs que vous exploitez ou administrez.
          </li>
        </ul>
        <p>Sont interdits :</p>
        <ul>
          <li>la revente, le prêt, le partage ou la publication de la clé de licence ;</li>
          <li>la redistribution du fichier du plugin Premium, modifié ou non ;</li>
          <li>
            le contournement de la vérification de licence, ainsi que la décompilation, hors des cas autorisés par la loi
            (article L122-6-1 du code de la propriété intellectuelle).
          </li>
        </ul>
        <p>
          Le plugin vérifie la clé en ligne au démarrage du serveur puis toutes les 6 heures. En cas de panne réseau, il
          conserve son édition 72 heures. Une clé peut être révoquée en cas de remboursement, de fraude au paiement ou
          de non-respect de ces interdictions ; le plugin repasse alors en édition gratuite.
        </p>
      </LegalSection>

      <LegalSection id="prix" title="Prix et paiement">
        <p>
          Les prix sont indiqués en euros sur la fiche de chaque plugin. {EDITEUR.tva} : le prix affiché est le prix
          final.
        </p>
        <p>
          L’achat nécessite un compte dont l’adresse e-mail est confirmée. Le paiement se fait en une fois, par carte
          bancaire, sur la page sécurisée de notre prestataire de paiement Stripe ; nous n’avons jamais accès à vos
          coordonnées bancaires. Une facture vous est envoyée par e-mail après le paiement.
        </p>
      </LegalSection>

      <LegalSection id="livraison" title="Livraison">
        <p>
          La licence est livrée immédiatement après la confirmation du paiement : la clé apparaît dans{" "}
          <LegalLink href="/compte/licences">Mes licences</LegalLink> et vous est envoyée par e-mail, et le fichier du
          plugin Premium devient téléchargeable depuis la fiche du plugin. Si la clé n’apparaît pas dans les minutes qui
          suivent, contactez le <LegalLink href="/support">support</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="retractation" title="Droit de rétractation">
        <p>
          La licence est un contenu numérique fourni sans support matériel, dont l’exécution commence dès le paiement.
          Conformément à l’article L221-28 13° du code de la consommation, en cochant la case prévue avant de payer,
          vous demandez cette exécution immédiate et <strong>renoncez expressément à votre droit de rétractation</strong>.
          Une confirmation de cet accord vous est adressée avec la facture.
        </p>
        <p>
          Cette renonciation ne vous prive pas de la garantie légale de conformité décrite ci-dessous.
        </p>
      </LegalSection>

      <LegalSection id="garantie" title="Garantie légale de conformité">
        <p>
          Les clients consommateurs bénéficient de la garantie légale de conformité des contenus numériques (articles
          L224-25-12 et suivants du code de la consommation). Si le plugin Premium ne fonctionne pas comme décrit sur sa
          fiche, sur un serveur qui respecte les prérequis indiqués, signalez-le au support : nous le mettons en
          conformité, par une correction ou une mise à jour. Si ce n’est pas possible dans un délai raisonnable, vous
          obtenez une réduction du prix ou le remboursement ; la licence est alors révoquée.
        </p>
        <p>
          Les mises à jour du plugin acheté sont fournies gratuitement, dont celles nécessaires à sa conformité, pendant
          la durée à laquelle vous pouvez raisonnablement vous attendre. La compatibilité avec les versions de Minecraft
          publiées après votre achat n’est pas garantie.
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" title="Responsabilité">
        <p>
          Il vous appartient de sauvegarder votre serveur et ses données avant d’installer ou de mettre à jour un plugin.
          Dans les limites permises par la loi, nous ne sommes pas responsables des dommages indirects (perte de données
          de jeu, perte d’exploitation, interruption du serveur), ni des problèmes causés par un autre plugin, une
          configuration modifiée ou un logiciel serveur non pris en charge.
        </p>
      </LegalSection>

      <LegalSection id="support" title="Support">
        <p>
          Le support est assuré en français par e-mail (<a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>), par le
          formulaire de la page <LegalLink href="/support">Support</LegalLink> et sur Discord. Nous répondons dans les
          meilleurs délais, sans délai garanti.
        </p>
      </LegalSection>

      <LegalSection id="compte" title="Compte">
        <p>
          Vous êtes responsable de la confidentialité de votre mot de passe. En cas de fraude ou de non-respect des
          présentes conditions, le compte peut être suspendu. Vous pouvez supprimer votre compte à tout moment depuis ses
          paramètres ; les licences déjà achetées restent valides.
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="Données personnelles">
        <p>
          Voir la <LegalLink href="/confidentialite">politique de confidentialité</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="litiges" title="Réclamations et litiges">
        <p>
          Les présentes conditions sont soumises au droit français. Pour toute réclamation, écrivez d’abord au support :
          la plupart des problèmes se règlent ainsi.
        </p>
        <p>
          Si vous êtes consommateur et que le désaccord persiste, vous pouvez recourir gratuitement au médiateur de la
          consommation :{" "}
          {MEDIATEUR ? (
            <>
              {MEDIATEUR.nom} (<a href={MEDIATEUR.site}>{MEDIATEUR.site.replace("https://", "")}</a>)
            </>
          ) : (
            <ACompleter>médiateur de la consommation</ACompleter>
          )}
          . À défaut d’accord, le litige est porté devant les tribunaux compétents ; le consommateur peut saisir celui de
          son domicile.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
