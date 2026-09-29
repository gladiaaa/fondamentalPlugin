import { escapeHtml } from './layout.js';
import {
  accountDeletedEmail,
  accountExistsEmail,
  licenseKeyEmail,
  passwordChangedEmail,
  passwordResetEmail,
  refundEmail,
  verificationEmail,
} from './templates.js';

describe('modèles d’e-mails', () => {
  const cases: [string, (locale: 'fr' | 'en') => { subject: string; text: string; html: string }][] = [
    ['verificationEmail', (l) => verificationEmail('https://x/lien', l)],
    ['accountExistsEmail', (l) => accountExistsEmail('https://x/lien', l)],
    ['passwordResetEmail', (l) => passwordResetEmail('https://x/lien', l)],
    ['accountDeletedEmail', (l) => accountDeletedEmail(l)],
    ['passwordChangedEmail', (l) => passwordChangedEmail(l)],
    ['licenseKeyEmail', (l) => licenseKeyEmail('FondamentalTag', 'CLE-TEST', l, 'https://x/compte/licences')],
    ['refundEmail', (l) => refundEmail('FondamentalTag', l, 'https://x/support')],
  ];

  it.each(cases)('%s : un sujet, un texte et un HTML non vides dans les deux langues', (_nom, build) => {
    for (const locale of ['fr', 'en'] as const) {
      const mail = build(locale);
      expect(mail.subject.length).toBeGreaterThan(0);
      expect(mail.text.length).toBeGreaterThan(0);
      expect(mail.html).toContain('<!doctype html>');
      expect(mail.html).toContain(`<html lang="${locale}">`);
    }
  });

  it.each(cases)('%s : le contenu change réellement entre fr et en', (_nom, build) => {
    const fr = build('fr');
    const en = build('en');
    expect(en.subject).not.toBe(fr.subject);
    expect(en.text).not.toBe(fr.text);
    expect(en.html).not.toBe(fr.html);
  });

  it('verificationEmail : le lien apparaît tel quel dans le texte et le bouton, dans les deux langues', () => {
    for (const locale of ['fr', 'en'] as const) {
      const mail = verificationEmail('https://x/verifier?token=abc_-1', locale);
      expect(mail.text).toContain('https://x/verifier?token=abc_-1');
      expect(mail.html).toContain('href="https://x/verifier?token=abc_-1"');
    }
  });

  it('licenseKeyEmail : la clé et le lien vers les licences, dans le texte et le HTML', () => {
    for (const locale of ['fr', 'en'] as const) {
      const mail = licenseKeyEmail('FondamentalTag', 'CLE-TEST-123', locale, 'https://x/compte/licences');
      expect(mail.text).toContain('CLE-TEST-123');
      expect(mail.text).toContain('key: "CLE-TEST-123"');
      expect(mail.text).toContain('https://x/compte/licences');
      expect(mail.html).toContain('CLE-TEST-123');
      expect(mail.html).toContain('href="https://x/compte/licences"');
    }
  });

  it('refundEmail : le nom du plugin et le lien vers le support', () => {
    const mail = refundEmail('FondamentalCrate', 'fr', 'https://x/support');
    expect(mail.subject).toContain('FondamentalCrate');
    expect(mail.html).toContain('href="https://x/support"');
  });

  it('le HTML échappe toute donnée insérée (nom de produit, lien)', () => {
    const mail = licenseKeyEmail('<script>alert(1)</script>', 'CLE"&<>', 'fr', 'https://x/"onmouseover="x');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('CLE&quot;&amp;&lt;&gt;');
    expect(mail.html).not.toContain('"onmouseover="');
  });

  it('escapeHtml : les cinq caractères sensibles', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
});
