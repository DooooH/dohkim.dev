// Site-wide settings. Edit this file to rebrand the theme — every page
// and Open Graph tags read from here.

import type { UIKey } from './i18n/en';

export const SITE = {
  /** BCP 47 language tag. Picks the UI dictionary in `src/i18n/`, and sets
   *  `<html lang>` and date formatting. Dictionaries ship for `ko`, `en` and `ja`. */
  locale: 'ko',
  /** Site name — used in the header brand, <title>, and og:site_name. */
  title: 'Dohyung Kim',
  /** Default meta description for pages that don't set their own. */
  description:
    'Backend engineering notes and selected work on reliable systems, data, and operations.',
  /** Default social share image, relative to the site root (see public/). */
  ogImage: '/og.jpg',
  /** Post author, emitted in JSON-LD BlogPosting structured data.
   *  Leave empty ('') to omit the author field. */
  author: 'Dohyung Kim',
  /** Footer credit line. */
  footerText: '© 2026 Dohyung Kim. Built with Astro and Keel.',
} as const;

/** Icons bundled with the theme — see `src/components/SocialLinks.astro`. */
export type SocialIcon = 'x' | 'linkedin' | 'rss' | 'email';

export interface SocialLink {
  /** Accessible name announced on the icon-only link. */
  label: string;
  /** Full URL, `mailto:` address, or site-root path (gets `base` applied). */
  href: string;
  icon: SocialIcon;
}

/** Social profiles rendered as inline SVG icons in the footer.
 *  Add or remove entries here — no template edits needed. */
export const SOCIAL_LINKS: readonly SocialLink[] = [];

export type NavItem =
  | { href: string; label: string; labelKey?: never }
  | { href: string; labelKey: UIKey; label?: never };

/** Header navigation. `href` is relative to the site root; the configured
 *  `base` is applied automatically via `withBase()`. The bundled entries
 *  localize through the UI dictionary; give a page you add yourself a literal
 *  `label` instead — one of the two is required. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/writing/', label: 'Writing' },
  { href: '/work/', label: 'Work' },
  { href: '/about/', label: 'About' },
];
