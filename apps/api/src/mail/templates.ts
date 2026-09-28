// Textes des e-mails transactionnels, en français et en anglais (voir `../auth/locale.ts` pour
// la détection de la langue). Version texte brut ; les modèles soignés (React Email) et les e-mails
// liés aux commandes (reçu, remboursement) arrivent avec #23/#24.

import type { MailLocale } from '../auth/locale.js';

export interface MailContent {
  subject: string;
  text: string;
}

export function verificationEmail(link: string, locale: MailLocale): MailContent {
  if (locale === 'en') {
    return {
      subject: 'Confirm your e-mail address',
      text: [
        'Welcome to Fondamental Plugin!',
        '',
        'To activate your account, please confirm your e-mail address (link valid for 24 hours):',
        link,
        '',
        "If you didn't create this account, you can safely ignore this message.",
      ].join('\n'),
    };
  }
  return {
    subject: 'Confirmez votre adresse e-mail',
    text: [
      'Bienvenue sur Fondamental Plugin !',
      '',
      'Pour activer votre compte, confirmez votre adresse e-mail (lien valable 24 heures) :',
      link,
      '',
      "Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message.",
    ].join('\n'),
  };
}

export function accountExistsEmail(resetLink: string, locale: MailLocale): MailContent {
  if (locale === 'en') {
    return {
      subject: 'You already have an account',
      text: [
        'Someone just tried to create a Fondamental Plugin account with this address, which is already registered.',
        '',
        'If this was you, sign in with your password, or choose a new one here:',
        resetLink,
        '',
        "If it wasn't you, you can ignore this message: your account has not been changed.",
      ].join('\n'),
    };
  }
  return {
    subject: 'Vous avez déjà un compte',
    text: [
      "Quelqu'un vient de tenter de créer un compte Fondamental Plugin avec cette adresse, qui est déjà inscrite.",
      '',
      'Si c\'était vous, connectez-vous avec votre mot de passe, ou choisissez-en un nouveau ici :',
      resetLink,
      '',
      "Si ce n'était pas vous, vous pouvez ignorer ce message : votre compte n'a pas été modifié.",
    ].join('\n'),
  };
}

export function passwordResetEmail(link: string, locale: MailLocale): MailContent {
  if (locale === 'en') {
    return {
      subject: 'Reset your password',
      text: [
        'You asked to reset your password (link valid for 30 minutes, single use):',
        link,
        '',
        "If you didn't make this request, ignore this message: your password stays unchanged.",
      ].join('\n'),
    };
  }
  return {
    subject: 'Réinitialisation de votre mot de passe',
    text: [
      'Vous avez demandé à réinitialiser votre mot de passe (lien valable 30 minutes, utilisable une seule fois) :',
      link,
      '',
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
    ].join('\n'),
  };
}

export function accountDeletedEmail(locale: MailLocale): MailContent {
  if (locale === 'en') {
    return {
      subject: 'Your account has been deleted',
      text: [
        'Your Fondamental Plugin account has just been deleted, along with the personal data attached to it.',
        '',
        'License keys you already purchased stay valid in your plugins. Billing data is kept without any link to your identity, as required by law.',
        '',
        "If you didn't request this deletion, reply to this message right away.",
      ].join('\n'),
    };
  }
  return {
    subject: 'Votre compte a été supprimé',
    text: [
      'Votre compte Fondamental Plugin vient d\'être supprimé, avec les données personnelles qui lui étaient liées.',
      '',
      "Vos clés de licence déjà achetées restent valides dans vos plugins. Les données de facturation sont conservées sans lien avec votre identité, comme la loi l'impose.",
      '',
      "Si vous n'êtes pas à l'origine de cette suppression, répondez à ce message sans attendre.",
    ].join('\n'),
  };
}

export function passwordChangedEmail(locale: MailLocale): MailContent {
  if (locale === 'en') {
    return {
      subject: 'Your password has been changed',
      text: [
        'The password of your Fondamental Plugin account has just been changed.',
        '',
        'If this was you, no action is needed.',
        'Otherwise, reset it immediately with "Forgot password": all your sessions have been closed.',
      ].join('\n'),
    };
  }
  return {
    subject: 'Votre mot de passe a été modifié',
    text: [
      'Le mot de passe de votre compte Fondamental Plugin vient d\'être modifié.',
      '',
      "Si c'était vous, aucune action n'est nécessaire.",
      "Sinon, réinitialisez-le immédiatement avec « Mot de passe oublié » : toutes vos sessions ont été fermées.",
    ].join('\n'),
  };
}

/**
 * Version minimale, en attendant le modèle soigné de #26 : juste la clé, en texte brut. Utilisée par
 * le renvoi manuel du back-office (#32) ; branchée à la création de la licence quand #26 sera fait.
 */
export function licenseKeyEmail(productName: string, licenseKey: string, locale: MailLocale): MailContent {
  if (locale === 'en') {
    return {
      subject: `Your license key for ${productName}`,
      text: [
        `Thanks for your purchase! Here is your ${productName} license key:`,
        '',
        licenseKey,
        '',
        'Paste it into the config.yml of the plugin on your Minecraft server to unlock the premium edition.',
      ].join('\n'),
    };
  }
  return {
    subject: `Votre clé de licence pour ${productName}`,
    text: [
      `Merci pour votre achat ! Voici votre clé de licence ${productName} :`,
      '',
      licenseKey,
      '',
      "Collez-la dans le config.yml du plugin sur votre serveur Minecraft pour débloquer l'édition premium.",
    ].join('\n'),
  };
}
