// Textes des e-mails transactionnels. Version minimale en français ; les modèles
// soignés en FR/EN (React Email) arrivent avec #26.

export interface MailContent {
  subject: string;
  text: string;
}

export function verificationEmail(link: string): MailContent {
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

export function accountExistsEmail(resetLink: string): MailContent {
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

export function passwordResetEmail(link: string): MailContent {
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

export function accountDeletedEmail(): MailContent {
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

export function passwordChangedEmail(): MailContent {
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
