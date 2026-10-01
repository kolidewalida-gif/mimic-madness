type Point = { x: number; y: number };
const clamp = (v: number, max: number) => Math.max(0, Math.min(Math.max(0, max), v));
const reflect = (v: number, max: number) => {
  if (max <= 0) return 0;
  const folded = ((v % (2 * max)) + 2 * max) % (2 * max);
  return folded > max ? 2 * max - folded : folded;
};

/** Fresh heading/distance per leg, with reflected screen boundaries. */
export function nextBubbleDestination(from: Point, width: number, height: number, random = Math.random): Point {
  const angle = random() * Math.PI * 2;
  const distance = 100 + random() * Math.min(300, Math.max(width, height) * .35);
  return { x: reflect(from.x + Math.cos(angle) * distance, width), y: reflect(from.y + Math.sin(angle) * distance, height) };
}

/** Compositor animations: no React renders or per-frame JS, no jump between legs. */
export function animateMenuBubbles(field: HTMLElement, slots: HTMLElement[]): () => void {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const mouse = window.matchMedia?.('(hover: hover) and (pointer: fine)');
  let disposed = false;
  const entries = slots.map(slot => {
    if (typeof slot.animate !== 'function') return null;
    const parent = field.getBoundingClientRect(), rect = slot.getBoundingClientRect();
    let point = { x: rect.left - parent.left, y: rect.top - parent.top };
    let animation: Animation | null = null;
    let hovered = false;
    slot.style.left = '0px'; slot.style.top = '0px';
    const transform = (p: Point) => `translate3d(${p.x}px,${p.y}px,0)`;
    slot.style.transform = transform(point);
    const paused = () => disposed || reduced?.matches || document.documentElement.classList.contains('low-power')
      || field.dataset.paused === 'true' || slot.dataset.popped === 'true' || slot.dataset.pressed === 'true'
      || slot.contains(document.activeElement) || hovered;
    const start = () => {
      if (disposed || animation || paused()) return;
      const w = Math.max(0, field.clientWidth - slot.offsetWidth - 8);
      const h = Math.max(0, field.clientHeight - slot.offsetHeight - 8);
      if (!w || !h) return;
      const target = nextBubbleDestination(point, w, h);
      const middle = { x: clamp((point.x + target.x) / 2 + (Math.random() - .5) * 80, w), y: clamp((point.y + target.y) / 2 + (Math.random() - .5) * 80, h) };
      animation = slot.animate([{ transform: transform(point) }, { transform: transform(middle) }, { transform: transform(target) }],
        { duration: 6500 + Math.random() * 6500, easing: 'ease-in-out', fill: 'forwards' });
      animation.onfinish = () => {
        if (disposed) return;
        point = target; slot.style.transform = transform(point);
        animation?.cancel(); animation = null; start();
      };
    };
    const sync = () => {
      if (paused()) animation?.pause();
      else if (animation) { if (animation.playState === 'paused') animation.play(); }
      else start();
    };
    const enter = () => { if (mouse?.matches) { hovered = true; sync(); } };
    const leave = () => { hovered = false; sync(); };
    const focus = () => queueMicrotask(sync);
    slot.addEventListener('pointerenter', enter); slot.addEventListener('pointerleave', leave);
    slot.addEventListener('focusin', focus); slot.addEventListener('focusout', focus);
    start();
    return { sync, resize: () => {
      const r = slot.getBoundingClientRect(), f = field.getBoundingClientRect();
      point = { x: clamp(r.left - f.left, field.clientWidth - slot.offsetWidth - 8), y: clamp(r.top - f.top, field.clientHeight - slot.offsetHeight - 8) };
      if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
      slot.style.transform = transform(point); start();
    }, stop: () => {
      if (animation) { animation.onfinish = null; animation.cancel(); }
      slot.removeEventListener('pointerenter', enter); slot.removeEventListener('pointerleave', leave);
      slot.removeEventListener('focusin', focus); slot.removeEventListener('focusout', focus);
      slot.style.removeProperty('left'); slot.style.removeProperty('top'); slot.style.removeProperty('transform');
    } };
  });
  const sync = () => entries.forEach(entry => entry?.sync());
  const resize = () => entries.forEach(entry => entry?.resize());
  const mutations = new MutationObserver(sync);
  mutations.observe(field, { attributes: true, subtree: true, attributeFilter: ['data-paused', 'data-popped', 'data-pressed'] });
  const power = new MutationObserver(sync);
  power.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(field);
  window.addEventListener('resize', resize);
  if (reduced?.addEventListener) reduced.addEventListener('change', sync);
  else reduced?.addListener(sync);
  return () => {
    disposed = true;
    mutations.disconnect(); power.disconnect(); observer?.disconnect();
    window.removeEventListener('resize', resize);
    if (reduced?.removeEventListener) reduced.removeEventListener('change', sync);
    else reduced?.removeListener(sync);
    entries.forEach(entry => entry?.stop());
  };
}
