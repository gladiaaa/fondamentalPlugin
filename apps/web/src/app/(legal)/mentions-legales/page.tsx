import type { Metadata } from "next";
import { ACompleter, LegalArticle, LegalLink, LegalSection } from "@/features/legal/LegalArticle";
import { EDITEUR, HEBERGEUR, SITE } from "@/features/legal/editeur";

export const metadata: Metadata = { title: "Mentions légales — Fondamental Plugins" };

export default function MentionsLegalesPage() {
  return (
    <LegalArticle slug="mentions-legales">
      <LegalSection id="editeur" title="Éditeur du site">
        <p>
          Le site {SITE} et les plugins Fondamental sont édités par <strong>{EDITEUR.nom}</strong>, {EDITEUR.forme}.
        </p>
        <ul>
          <li>Adresse : {EDITEUR.adresse.join(", ")}</li>
          <li>SIREN : {EDITEUR.siren} · SIRET : {EDITEUR.siret}</li>
          <li>Activité (code NAF) : {EDITEUR.naf}</li>
          <li>{EDITEUR.tva}</li>
          <li>
            E-mail : <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>
          </li>
          <li>Téléphone : {EDITEUR.telephone ?? <ACompleter>numéro de téléphone</ACompleter>}</li>
        </ul>
      </LegalSection>

      <LegalSection id="directeur" title="Directeur de la publication">
        <p>{EDITEUR.nom}, en qualité d’entrepreneur individuel.</p>
      </LegalSection>

      <LegalSection id="hebergeur" title="Hébergeur">
        <p>
          Le site, son API et le serveur de licences sont hébergés sur un serveur loué à <strong>{HEBERGEUR.nom}</strong>,{" "}
          {HEBERGEUR.adresse.join(", ")} (<a href={HEBERGEUR.site}>{HEBERGEUR.site.replace("https://", "")}</a>).
        </p>
      </LegalSection>

      <LegalSection id="propriete" title="Propriété intellectuelle">
        <p>
          Les plugins FondamentalBedwars, FondamentalTag, FondamentalCrate et FondamentalPass, leur code, leurs
          textes, visuels et logos, ainsi que le contenu de ce site et de son wiki, sont la propriété de {EDITEUR.nom}.
          Toute reproduction ou redistribution sans autorisation est interdite. L’usage des plugins est encadré par les
          conditions de licence des <LegalLink href="/cgv#licence">CGV</LegalLink>.
        </p>
        <p>
          Minecraft est une marque de Mojang Studios. Fondamental Plugins n’est ni affilié à Mojang Studios ni à
          Microsoft, ni approuvé par eux.
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <LegalLink href="/confidentialite">politique de confidentialité</LegalLink>, l’usage des cookies dans la page{" "}
          <LegalLink href="/cookies">Cookies</LegalLink>.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
