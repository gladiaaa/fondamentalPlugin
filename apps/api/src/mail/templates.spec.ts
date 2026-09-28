import {
  accountDeletedEmail,
  accountExistsEmail,
  licenseKeyEmail,
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
    ['licenseKeyEmail', (l) => licenseKeyEmail('FondamentalTag', 'CLE-TEST', l)],
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

  it('licenseKeyEmail : la clé apparaît telle quelle, dans les deux langues', () => {
    expect(licenseKeyEmail('FondamentalTag', 'CLE-TEST-123', 'fr').text).toContain('CLE-TEST-123');
    expect(licenseKeyEmail('FondamentalTag', 'CLE-TEST-123', 'en').text).toContain('CLE-TEST-123');
  });
});
