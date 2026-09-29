// Gabarit HTML commun des e-mails (#26). Styles en ligne et tableaux : seule mise en page que tous les
// clients de messagerie (Gmail, Outlook, Apple Mail) affichent pareil. Chaque e-mail part aussi en texte
// brut (même contenu) : lisible partout, et moins souvent classé en spam qu'un HTML seul.

import type { MailLocale } from '../auth/locale.js';

/** Couleurs de la charte (thème clair) : un e-mail n'a pas de mode sombre fiable. */
const COLOR = {
  bg: '#F3F0FA',
  surface: '#FFFFFF',
  line: '#DDD6EE',
  text: '#170F2A',
  muted: '#5E5673',
  accent: '#6A4FD0',
  code: '#EAE5F6',
} as const;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Échappe une valeur avant de l'insérer dans le HTML : aucune donnée n'y entre brute. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export type Block =
  | { type: 'p'; text: string }
  | { type: 'button'; label: string; url: string }
  /** Texte à copier tel quel (clé de licence, extrait de config) : police à chasse fixe, sur fond. */
  | { type: 'code'; text: string }
  /** Petit texte en fin de message (« si ce n'était pas vous… »). */
  | { type: 'note'; text: string };

function renderBlock(block: Block): string {
  switch (block.type) {
    case 'p':
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text}">${escapeHtml(block.text)}</p>`;
    case 'note':
      return `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${COLOR.muted}">${escapeHtml(block.text)}</p>`;
    case 'code':
      return `<pre style="margin:0 0 16px;padding:12px 14px;background:${COLOR.code};border-radius:8px;font-family:Consolas,Menlo,monospace;font-size:14px;line-height:1.5;color:${COLOR.text};white-space:pre-wrap;word-break:break-all">${escapeHtml(block.text)}</pre>`;
    case 'button':
      return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 20px"><tr><td style="border-radius:999px;background:${COLOR.accent}"><a href="${escapeHtml(block.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px">${escapeHtml(block.label)}</a></td></tr></table>`;
  }
}

/** Le HTML complet d'un e-mail : en-tête de marque, contenu, pied de page. */
export function renderEmail(title: string, blocks: Block[], locale: MailLocale): string {
  const footer =
    locale === 'en'
      ? 'Fondamental Plugins · Minecraft plugins for Paper servers · fondamentalplugin.fr'
      : 'Fondamental Plugins · Plugins Minecraft pour serveurs Paper · fondamentalplugin.fr';
  return `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${COLOR.bg};font-family:${FONT}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLOR.bg}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px;font-size:18px;font-weight:700;color:${COLOR.text}">Fondamental <span style="color:${COLOR.accent}">Plugins</span></td></tr>
<tr><td style="background:${COLOR.surface};border:1px solid ${COLOR.line};border-radius:14px;padding:28px 26px">
<h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:${COLOR.text}">${escapeHtml(title)}</h1>
${blocks.map(renderBlock).join('\n')}
</td></tr>
<tr><td style="padding:16px 4px 0;font-size:12px;color:${COLOR.muted}">${escapeHtml(footer)}</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

/** La version texte brut des mêmes blocs (lien du bouton affiché en clair). */
export function renderText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'button') return `${block.label}\n${block.url}`;
      return block.text;
    })
    .join('\n\n');
}
