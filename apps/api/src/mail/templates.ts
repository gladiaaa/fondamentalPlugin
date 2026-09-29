// E-mails transactionnels, en français et en anglais (voir `../auth/locale.ts` pour la langue du client).
// Chaque e-mail part en HTML (gabarit de `layout.ts`) et en texte brut, construits des mêmes blocs (#26).

import type { MailLocale } from '../auth/locale.js';
import { type Block, renderEmail, renderText } from './layout.js';

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

interface Version {
  subject: string;
  /** Titre affiché en tête du message HTML. */
  title: string;
  blocks: Block[];
}

function build(locale: MailLocale, versions: { fr: Version; en: Version }): MailContent {
  const { subject, title, blocks } = locale === 'en' ? versions.en : versions.fr;
  return { subject, text: `${title}\n\n${renderText(blocks)}`, html: renderEmail(title, blocks, locale) };
}

export function verificationEmail(link: string, locale: MailLocale): MailContent {
  return build(locale, {
    fr: {
      subject: 'Confirmez votre adresse e-mail',
      title: 'Bienvenue sur Fondamental Plugin !',
      blocks: [
        { type: 'p', text: 'Pour activer votre compte, confirmez votre adresse e-mail (lien valable 24 heures) :' },
        { type: 'button', label: 'Confirmer mon adresse', url: link },
        { type: 'note', text: "Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message." },
      ],
    },
    en: {
      subject: 'Confirm your e-mail address',
      title: 'Welcome to Fondamental Plugin!',
      blocks: [
        { type: 'p', text: 'To activate your account, please confirm your e-mail address (link valid for 24 hours):' },
        { type: 'button', label: 'Confirm my address', url: link },
        { type: 'note', text: "If you didn't create this account, you can safely ignore this message." },
      ],
    },
  });
}

export function accountExistsEmail(resetLink: string, locale: MailLocale): MailContent {
  return build(locale, {
    fr: {
      subject: 'Vous avez déjà un compte',
      title: 'Vous avez déjà un compte',
      blocks: [
        {
          type: 'p',
          text: "Quelqu'un vient de tenter de créer un compte Fondamental Plugin avec cette adresse, qui est déjà inscrite.",
        },
        { type: 'p', text: "Si c'était vous, connectez-vous avec votre mot de passe, ou choisissez-en un nouveau ici :" },
        { type: 'button', label: 'Choisir un nouveau mot de passe', url: resetLink },
        { type: 'note', text: "Si ce n'était pas vous, vous pouvez ignorer ce message : votre compte n'a pas été modifié." },
      ],
    },
    en: {
      subject: 'You already have an account',
      title: 'You already have an account',
      blocks: [
        {
          type: 'p',
          text: 'Someone just tried to create a Fondamental Plugin account with this address, which is already registered.',
        },
        { type: 'p', text: 'If this was you, sign in with your password, or choose a new one here:' },
        { type: 'button', label: 'Choose a new password', url: resetLink },
        { type: 'note', text: "If it wasn't you, you can ignore this message: your account has not been changed." },
      ],
    },
  });
}

export function passwordResetEmail(link: string, locale: MailLocale): MailContent {
  return build(locale, {
    fr: {
      subject: 'Réinitialisation de votre mot de passe',
      title: 'Réinitialiser votre mot de passe',
      blocks: [
        {
          type: 'p',
          text: 'Vous avez demandé à réinitialiser votre mot de passe (lien valable 30 minutes, utilisable une seule fois) :',
        },
        { type: 'button', label: 'Choisir un nouveau mot de passe', url: link },
        {
          type: 'note',
          text: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
        },
      ],
    },
    en: {
      subject: 'Reset your password',
      title: 'Reset your password',
      blocks: [
        { type: 'p', text: 'You asked to reset your password (link valid for 30 minutes, single use):' },
        { type: 'button', label: 'Choose a new password', url: link },
        { type: 'note', text: "If you didn't make this request, ignore this message: your password stays unchanged." },
      ],
    },
  });
}

export function accountDeletedEmail(locale: MailLocale): MailContent {
  return build(locale, {
    fr: {
      subject: 'Votre compte a été supprimé',
      title: 'Votre compte a été supprimé',
      blocks: [
        {
          type: 'p',
          text: "Votre compte Fondamental Plugin vient d'être supprimé, avec les données personnelles qui lui étaient liées.",
        },
        {
          type: 'p',
          text: "Vos clés de licence déjà achetées restent valides dans vos plugins. Les données de facturation sont conservées sans lien avec votre identité, comme la loi l'impose.",
        },
        { type: 'note', text: "Si vous n'êtes pas à l'origine de cette suppression, répondez à ce message sans attendre." },
      ],
    },
    en: {
      subject: 'Your account has been deleted',
      title: 'Your account has been deleted',
      blocks: [
        {
          type: 'p',
          text: 'Your Fondamental Plugin account has just been deleted, along with the personal data attached to it.',
        },
        {
          type: 'p',
          text: 'License keys you already purchased stay valid in your plugins. Billing data is kept without any link to your identity, as required by law.',
        },
        { type: 'note', text: "If you didn't request this deletion, reply to this message right away." },
      ],
    },
  });
}

export function passwordChangedEmail(locale: MailLocale): MailContent {
  return build(locale, {
    fr: {
      subject: 'Votre mot de passe a été modifié',
      title: 'Votre mot de passe a été modifié',
      blocks: [
        { type: 'p', text: "Le mot de passe de votre compte Fondamental Plugin vient d'être modifié." },
        { type: 'p', text: "Si c'était vous, aucune action n'est nécessaire." },
        {
          type: 'p',
          text: 'Sinon, réinitialisez-le immédiatement avec « Mot de passe oublié » : toutes vos sessions ont été fermées.',
        },
      ],
    },
    en: {
      subject: 'Your password has been changed',
      title: 'Your password has been changed',
      blocks: [
        { type: 'p', text: 'The password of your Fondamental Plugin account has just been changed.' },
        { type: 'p', text: 'If this was you, no action is needed.' },
        { type: 'p', text: 'Otherwise, reset it immediately with "Forgot password": all your sessions have been closed.' },
      ],
    },
  });
}

/**
 * Reçu d'achat avec la clé (#26) : envoyé dès que le webhook Stripe a créé la licence, et par le renvoi
 * manuel du back-office. Pas de montant : la facture Stripe (envoyée à part) fait foi, code promo compris.
 */
export function licenseKeyEmail(
  productName: string,
  licenseKey: string,
  locale: MailLocale,
  licensesLink: string,
): MailContent {
  const config = `license:\n  key: "${licenseKey}"`;
  return build(locale, {
    fr: {
      subject: `Votre clé de licence ${productName}`,
      title: `Merci pour votre achat de ${productName} !`,
      blocks: [
        { type: 'p', text: 'Voici votre clé de licence Premium :' },
        { type: 'code', text: licenseKey },
        {
          type: 'p',
          text: "Collez-la dans le config.yml du plugin sur votre serveur Minecraft, puis redémarrez le serveur : l'édition Premium se débloque toute seule.",
        },
        { type: 'code', text: config },
        { type: 'button', label: 'Voir mes licences', url: licensesLink },
        {
          type: 'note',
          text: 'Votre facture vous est envoyée séparément par Stripe. Gardez cette clé pour vous : elle est liée à votre achat.',
        },
      ],
    },
    en: {
      subject: `Your ${productName} license key`,
      title: `Thanks for buying ${productName}!`,
      blocks: [
        { type: 'p', text: 'Here is your Premium license key:' },
        { type: 'code', text: licenseKey },
        {
          type: 'p',
          text: 'Paste it into the config.yml of the plugin on your Minecraft server, then restart the server: the Premium edition unlocks on its own.',
        },
        { type: 'code', text: config },
        { type: 'button', label: 'See my licenses', url: licensesLink },
        { type: 'note', text: 'Your invoice is sent separately by Stripe. Keep this key to yourself: it is tied to your purchase.' },
      ],
    },
  });
}

/** Remboursement (#26) : envoyé quand un remboursement total a révoqué la licence. */
export function refundEmail(productName: string, locale: MailLocale, supportLink: string): MailContent {
  return build(locale, {
    fr: {
      subject: `Remboursement de votre achat ${productName}`,
      title: 'Votre achat a été remboursé',
      blocks: [
        {
          type: 'p',
          text: `Votre achat de ${productName} a été remboursé. Le montant revient sur votre moyen de paiement sous quelques jours, selon votre banque.`,
        },
        {
          type: 'p',
          text: "La clé de licence associée a été révoquée : le plugin repasse en édition gratuite sur les serveurs qui l'utilisaient.",
        },
        { type: 'button', label: 'Contacter le support', url: supportLink },
      ],
    },
    en: {
      subject: `Refund of your ${productName} purchase`,
      title: 'Your purchase has been refunded',
      blocks: [
        {
          type: 'p',
          text: `Your ${productName} purchase has been refunded. The amount goes back to your payment method within a few days, depending on your bank.`,
        },
        {
          type: 'p',
          text: 'The associated license key has been revoked: the plugin goes back to the free edition on the servers that used it.',
        },
        { type: 'button', label: 'Contact support', url: supportLink },
      ],
    },
  });
}
