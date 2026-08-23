/**
 * Constantes des pages publiques et légales.
 *
 * Ces pages sont accessibles sans compte : elles constituent le contenu que les
 * robots d'indexation et l'examen AdSense peuvent réellement lire, puisque le
 * jeu lui-même reste derrière une connexion Google.
 */

/** Nom de l'éditeur affiché dans les mentions légales. */
export const PUBLISHER_NAME = 'Mimic Master';

/**
 * Adresse de contact publiée dans les pages légales.
 *
 * À REMPLACER par une adresse réellement relevée : AdSense et le RGPD exigent
 * un moyen de contact valide pour l'exercice des droits des utilisateurs.
 */
export const CONTACT_EMAIL = 'ton-email@exemple.com';

/** Adresse canonique du site. */
export const SITE_URL = 'https://mimic-madness.lovable.app';

/** Date de dernière révision affichée en bas des pages légales. */
export const LEGAL_LAST_UPDATED = '23 août 2026';

/** Tarifs des offres de soutien, alignés sur le catalogue Paddle. */
export const PRICE_AD_FREE_MONTHLY_LABEL = '1,99 €';
export const PRICE_SUPPORTER_LIFETIME_LABEL = '3,99 €';

export interface LegalRoute {
  path: string;
  label: string;
}

/** Liens légaux repris dans le pied de page public. */
export const LEGAL_ROUTES: LegalRoute[] = [
  { path: '/confidentialite', label: 'Confidentialité' },
  { path: '/conditions', label: "Conditions d'utilisation" },
  { path: '/mentions-legales', label: 'Mentions légales' },
];
