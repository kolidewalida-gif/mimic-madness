/**
 * Compatibilité avec les composants de jeu qui distinguent encore l’ancien
 * thème Ink stable de leur variante `inkBeta` explicite.
 *
 * Ink Beta reste géré par les props `variant="inkBeta"` et les classes du
 * `body`. Renvoyer `true` ici activerait les anciennes branches Ink stable et
 * modifierait leur comportement ; l’ancien mode n’étant plus sélectionnable,
 * ce hook renvoie donc toujours son état historique sous Ink Beta.
 */
export const useInkMode = () => {
  const isInkMode = false;

  return {
    isInkMode,
    inkClasses: {
      card: '',
      button: '',
      buttonOutline: '',
      text: '',
      textMuted: '',
      background: '',
      input: '',
    },
    inkFont: {},
  };
};
