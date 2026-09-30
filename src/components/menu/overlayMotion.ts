/** Keep large menu surfaces opaque: only their position is animated.
 * Fading and scaling the whole surface also fades every shadow and child,
 * which makes opening a menu look like a flash rather than a movement.
 */
export const menuPanelMotion = (reduced: boolean | null) => ({
  initial: reduced ? false as const : { opacity: 1, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { y: reduced ? 0 : 8, opacity: 0 },
  transition: { duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] as const },
});

export const menuScrimMotion = (reduced: boolean | null) => ({
  initial: reduced ? false as const : { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] as const },
});
