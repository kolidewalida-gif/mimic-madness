/**
 * Ce que chaque récompense de niveau apporte réellement en jeu.
 *
 * Source unique. `RewardsPanel` et `TitleSelector` portaient chacun sa propre
 * table, et les trois titres présents dans les deux se décrivaient
 * différemment : `title_legend` promettait « Priorité de parole en Undercover »
 * d'un côté et « Priorité de parole » sans restriction de l'autre. Les deux
 * panneaux étant désormais deux tuiles voisines de la même grille de menus, un
 * joueur peut lire les deux formulations à quelques secondes d'intervalle.
 */
export const REWARD_PERKS: Record<string, string> = {
  badge_beginner: 'Score de prestige +1. Visible dans ta collection.',
  badge_explorer: 'Score de prestige +1. Boost la confiance des autres joueurs.',
  title_player: '+5% XP permanent. Titre visible sur ton profil.',
  badge_enthusiast: 'Score de prestige +3. Badge rare mis en avant.',
  effect_sparkle: 'Étincelles autour de ton avatar en lobby et en jeu.',
  frame_bronze: 'Cadre bronze visible par tous dans les lobbies.',
  title_veteran: '+10% XP permanent. Chat coloré en partie.',
  badge_master: 'Score de prestige +5. Badge épique affiché en priorité.',
  effect_glow: 'Aura lumineuse intense autour de ton avatar.',
  frame_silver: 'Cadre argent remplace le bronze. Plus prestigieux.',
  title_legend: '+15% XP permanent. Priorité de parole en Undercover. Style prestige.',
  badge_champion: 'Score de prestige +8. Badge légendaire ultime.',
  frame_gold: 'Cadre or animé. Effet visuel maximum sur ton avatar.',
};

/** Description d'une récompense, ou `undefined` si elle n'en a pas encore. */
export const rewardPerk = (rewardId: string): string | undefined => REWARD_PERKS[rewardId];
