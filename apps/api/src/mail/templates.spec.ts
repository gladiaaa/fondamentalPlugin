import {
  accountDeletedEmail,
  accountExistsEmail,
  passwordChangedEmail,
  passwordResetEmail,
  verificationEmail,
} from './templates.js';

describe('modèles d’e-mails', () => {
  const cases: [string, (locale: 'fr' | 'en') => { subject: string; text: string }][] = [
    ['verificationEmail', (l) => verificationEmail('https://x/lien', l)],
    ['accountExistsEmail', (l) => accountExistsEmail('https://x/lien', l)],
    ['passwordResetEmail', (l) => passwordResetEmail('https://x/lien', l)],
    ['accountDeletedEmail', (l) => accountDeletedEmail(l)],
    ['passwordChangedEmail', (l) => passwordChangedEmail(l)],
  ];

  it.each(cases)('%s : un sujet et un texte non vides dans les deux langues', (_nom, build) => {
    for (const locale of ['fr', 'en'] as const) {
      const mail = build(locale);
      expect(mail.subject.length).toBeGreaterThan(0);
      expect(mail.text.length).toBeGreaterThan(0);
    }
  });

  it.each(cases)('%s : le contenu change réellement entre fr et en', (_nom, build) => {
    const fr = build('fr');
    const en = build('en');
    expect(en.subject).not.toBe(fr.subject);
    expect(en.text).not.toBe(fr.text);
  });

  it('verificationEmail : le lien apparaît tel quel, dans les deux langues', () => {
    expect(verificationEmail('https://x/lien-test', 'fr').text).toContain('https://x/lien-test');
    expect(verificationEmail('https://x/lien-test', 'en').text).toContain('https://x/lien-test');
  });
});
