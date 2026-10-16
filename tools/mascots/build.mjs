// Génère les Mimo : huit personnages au même trait (encre #2b1442, aplats, ombre
// pleine, zéro dégradé de verre) et la version « solo » sans fond utilisée comme
// mascotte principale.
//
//   node tools/mascots/build.mjs
//
// Sortie : public/game-avatars/mimo-*.svg (256×256, fond arrondi) et
// public/mimo/mimo.svg (256×256, fond transparent). Chaque personnage est une
// configuration : une silhouette, un visage, un accessoire. Pour en ajouter un,
// ajouter une entrée à CHARACTERS puis relancer le script.

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const INK = '#2b1442';
const out = (path) => fileURLToPath(new URL(path, import.meta.url));

/* ---- Silhouettes ---------------------------------------------------------- */

const star = (cx, cy, outer, inner, points) => {
  const pts = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
};

const BODIES = {
  // Le fantôme à casque : la mascotte historique, redessinée à plat.
  ghost: 'M128 54C84 54 60 88 60 132L60 196Q60 210 73 203L89 194Q100 208 113 196Q128 212 143 196Q156 208 167 194L183 203Q196 210 196 196L196 132C196 88 172 54 128 54Z',
  tube: 'M128 56C96 56 76 78 76 108L76 168C76 194 98 210 128 210C158 210 180 194 180 168L180 108C180 78 160 56 128 56Z',
  bean: 'M128 60C176 60 198 96 198 138C198 184 168 212 128 212C88 212 58 184 58 138C58 96 80 60 128 60Z',
  heart: 'M128 210C70 170 54 134 54 104C54 76 76 60 98 60C114 60 124 70 128 82C132 70 142 60 158 60C180 60 202 76 202 104C202 134 186 170 128 210Z',
  burst: star(128, 136, 86, 66, 9),
  square: 'M98 66H158Q192 66 192 100V176Q192 208 160 208H96Q64 208 64 176V100Q64 66 98 66Z',
};

const FLOWER_PETALS = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 8;
  return { x: 128 + 56 * Math.cos(a), y: 134 + 56 * Math.sin(a) };
});

/* ---- Visages -------------------------------------------------------------- */

const eyes = {
  round: ([lx, rx, y]) => `
    <ellipse cx="${lx}" cy="${y}" rx="14" ry="18" fill="#fff" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="${rx}" cy="${y}" rx="14" ry="18" fill="#fff" stroke="${INK}" stroke-width="5"/>
    <circle cx="${lx + 3}" cy="${y + 3}" r="7.5" fill="${INK}"/><circle cx="${rx - 3}" cy="${y + 3}" r="7.5" fill="${INK}"/>
    <circle cx="${lx + 5.5}" cy="${y - 1}" r="2.6" fill="#fff"/><circle cx="${rx - 0.5}" cy="${y - 1}" r="2.6" fill="#fff"/>`,
  wide: ([lx, rx, y]) => `
    <ellipse cx="${lx}" cy="${y}" rx="17" ry="22" fill="#fff" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="${rx}" cy="${y}" rx="17" ry="22" fill="#fff" stroke="${INK}" stroke-width="5"/>
    <circle cx="${lx}" cy="${y + 2}" r="9" fill="${INK}"/><circle cx="${rx}" cy="${y + 2}" r="9" fill="${INK}"/>
    <circle cx="${lx + 3}" cy="${y - 3}" r="3" fill="#fff"/><circle cx="${rx + 3}" cy="${y - 3}" r="3" fill="#fff"/>`,
  happy: ([lx, rx, y]) => `
    <path d="M${lx - 14} ${y + 6}Q${lx} ${y - 16} ${lx + 14} ${y + 6}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M${rx - 14} ${y + 6}Q${rx} ${y - 16} ${rx + 14} ${y + 6}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
  sleepy: ([lx, rx, y]) => `
    <path d="M${lx - 14} ${y - 2}Q${lx} ${y + 14} ${lx + 14} ${y - 2}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M${rx - 14} ${y - 2}Q${rx} ${y + 14} ${rx + 14} ${y - 2}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
  visor: ([lx, rx, y]) => `
    <rect x="${lx - 15}" y="${y - 17}" width="30" height="34" rx="9" fill="#fff" stroke="${INK}" stroke-width="5"/>
    <rect x="${rx - 15}" y="${y - 17}" width="30" height="34" rx="9" fill="#fff" stroke="${INK}" stroke-width="5"/>
    <rect x="${lx - 6}" y="${y - 6}" width="14" height="16" rx="3" fill="${INK}"/><rect x="${rx - 8}" y="${y - 6}" width="14" height="16" rx="3" fill="${INK}"/>
    <rect x="${lx + 1}" y="${y - 4}" width="4" height="4" fill="#fff"/><rect x="${rx - 1}" y="${y - 4}" width="4" height="4" fill="#fff"/>`,
};

const mouths = {
  smile: (y, tongue) => `<path d="M110 ${y}Q128 ${y + 20} 146 ${y}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
    + (tongue ? `<path d="M122 ${y + 12}Q128 ${y + 24} 136 ${y + 12}" fill="${tongue}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` : ''),
  open: (y, tongue) => `<path d="M108 ${y}Q128 ${y + 36} 148 ${y}Z" fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M118 ${y + 18}Q128 ${y + 10} 138 ${y + 18}Q128 ${y + 28} 118 ${y + 18}Z" fill="${tongue ?? '#ff6fb7'}"/>`,
  grin: (y) => `<path d="M102 ${y}Q128 ${y + 38} 154 ${y}Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M115 ${y + 4}V${y + 13}M128 ${y + 5}V${y + 17}M141 ${y + 4}V${y + 13}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  o: (y) => `<ellipse cx="128" cy="${y + 8}" rx="9" ry="12" fill="${INK}"/>`,
  cat: (y) => `<path d="M108 ${y}Q118 ${y + 12} 128 ${y}Q138 ${y + 12} 148 ${y}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/* ---- Accessoires ---------------------------------------------------------- */

const headset = (color) => `
  <path d="M68 128C66 86 94 62 128 62C162 62 190 86 188 128" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
  <path d="M68 128C66 86 94 62 128 62C162 62 190 86 188 128" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
  <rect x="52" y="112" width="26" height="50" rx="12" fill="${color}" stroke="${INK}" stroke-width="6"/>
  <rect x="178" y="112" width="26" height="50" rx="12" fill="${color}" stroke="${INK}" stroke-width="6"/>
  <path d="M190 156Q196 190 160 194" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  <path d="M190 156Q196 190 160 194" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="156" cy="194" r="9" fill="${color}" stroke="${INK}" stroke-width="5"/>`;

const crown = (gold) => `
  <path d="M92 70L96 36L113 54L128 28L143 54L160 36L164 70Z" fill="${gold}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <rect x="92" y="62" width="72" height="12" rx="4" fill="${gold}" stroke="${INK}" stroke-width="5"/>
  <circle cx="128" cy="68" r="4" fill="#ff3f6f" stroke="${INK}" stroke-width="2"/>`;

const antenna = (ball) => `
  <path d="M128 60V34" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="128" cy="28" r="10" fill="${ball}" stroke="${INK}" stroke-width="5"/>`;

const bolt = (color) => `<path d="M134 64L118 88H129L121 103L142 80H131Z" fill="${color}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;

const sleepCap = (color, pom) => `
  <path d="M64 100C66 56 118 38 156 54C184 66 194 94 200 126C170 96 120 100 64 100Z" fill="${color}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M66 98C110 100 170 94 198 122" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="202" cy="130" r="12" fill="${pom}" stroke="${INK}" stroke-width="5"/>`;

const gamepad = () => `
  <rect x="88" y="172" width="80" height="34" rx="14" fill="${INK}"/>
  <path d="M106 181V197M98 189H114" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <circle cx="142" cy="186" r="5" fill="#ff3f6f"/><circle cx="154" cy="194" r="5" fill="#ffd23f"/>`;

const sparkle = (x, y, size, color) => `<path d="M${x} ${y - size}Q${x + size * 0.18} ${y - size * 0.18} ${x + size} ${y}Q${x + size * 0.18} ${y + size * 0.18} ${x} ${y + size}Q${x - size * 0.18} ${y + size * 0.18} ${x - size} ${y}Q${x - size * 0.18} ${y - size * 0.18} ${x} ${y - size}Z" fill="${color}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;

/* ---- Personnages ---------------------------------------------------------- */

const CHARACTERS = [
  {
    id: 'pop', bg: '#8a1fc2', light: '#c58bff', body: 'ghost', main: '#ff8fc8', dark: '#e0569f',
    eyes: 'round', eyePos: [108, 148, 126], mouth: ['open', 162, '#ff6fb7'], cheeks: true,
    back: () => '', front: () => headset('#52efd0'), sparkles: [[212, 56, 12, '#ffd23f']],
  },
  {
    id: 'neon', bg: '#d12a86', light: '#ff7cc4', body: 'tube', main: '#52efd0', dark: '#27c7a8',
    eyes: 'visor', eyePos: [108, 148, 124], mouth: ['smile', 158, '#ff6fb7'], cheeks: false,
    back: () => antenna('#ffd23f'), front: () => headset('#ffd23f'), sparkles: [[40, 60, 12, '#ffd23f']],
  },
  {
    id: 'voltage', bg: '#2b1442', light: '#6a3fa0', body: 'burst', main: '#ffd23f', dark: '#e0a800',
    eyes: 'wide', eyePos: [106, 150, 126], mouth: ['grin', 158], cheeks: false,
    back: () => '', front: () => bolt('#52efd0'), sparkles: [[44, 54, 12, '#52efd0'], [214, 206, 10, '#ff8fc8']],
  },
  {
    id: 'royal', bg: '#560e8c', light: '#9a5ad0', body: 'bean', main: '#c7b3ff', dark: '#9a82e8',
    eyes: 'round', eyePos: [108, 148, 134], mouth: ['smile', 168, null], cheeks: true,
    back: () => '', front: () => crown('#ffd23f'), sparkles: [[210, 58, 11, '#ffd23f'], [44, 200, 9, '#ffd23f']],
  },
  {
    id: 'love', bg: '#ffd23f', light: '#fff0a6', body: 'heart', main: '#ff3f6f', dark: '#c8184d',
    eyes: 'happy', eyePos: [106, 150, 124], mouth: ['open', 150, '#ff9db6'], cheeks: true,
    back: () => '', front: () => '', sparkles: [[206, 50, 12, '#ff8fc8'], [48, 196, 10, '#52efd0']],
  },
  {
    id: 'luna', bg: '#261041', light: '#4b2a9a', body: 'bean', main: '#e8d6fb', dark: '#bda4ec',
    eyes: 'sleepy', eyePos: [108, 148, 140], mouth: ['o', 160], cheeks: true,
    back: () => '', front: () => sleepCap('#4b2a9a', '#ffd23f'), sparkles: [[50, 56, 12, '#ffd23f'], [212, 210, 9, '#e8d6fb']],
  },
  {
    id: 'bloom', bg: '#52efd0', light: '#c2fff1', body: 'flower', main: '#ffeb94', dark: '#ffc94d',
    eyes: 'round', eyePos: [110, 146, 130], mouth: ['smile', 156, '#ff6fb7'], cheeks: true,
    back: () => '', front: () => '', sparkles: [[44, 56, 11, '#ff8fc8'], [214, 204, 11, '#ffffff']],
  },
  {
    id: 'player', bg: '#148f79', light: '#52efd0', body: 'square', main: '#6aa8ff', dark: '#3a64d8',
    eyes: 'visor', eyePos: [108, 148, 122], mouth: ['cat', 156], cheeks: false,
    back: () => '', front: () => headset('#ff3f6f') + gamepad(), sparkles: [[44, 58, 11, '#ffd23f']],
  },
];

/* ---- Assemblage ----------------------------------------------------------- */

const bodyMarkup = (ch) => {
  if (ch.body === 'flower') {
    const petals = FLOWER_PETALS.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="32" fill="#ff8fc8" stroke="${INK}" stroke-width="8"/>`).join('');
    return `${petals}<circle cx="128" cy="134" r="62" fill="${ch.main}" stroke="${INK}" stroke-width="8"/>`
      + `<path d="M128 72A62 62 0 1 1 74 168A62 62 0 0 0 128 72Z" fill="${ch.dark}" opacity=".7"/>`
      + `<circle cx="128" cy="134" r="62" fill="none" stroke="${INK}" stroke-width="8"/>`;
  }
  const d = BODIES[ch.body];
  return `<clipPath id="shape"><path d="${d}"/></clipPath>
    <path d="${d}" fill="${ch.dark}"/>
    <g clip-path="url(#shape)"><path d="${d}" fill="${ch.main}" transform="translate(-10 -10)"/></g>
    <path d="${d}" fill="none" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <ellipse cx="96" cy="86" rx="13" ry="7" fill="#fff" opacity=".75" transform="rotate(-32 96 86)"/>`;
};

const characterMarkup = (ch) => {
  const [, , eyeY] = ch.eyePos;
  const [mouthKind, mouthY, tongue] = ch.mouth;
  const cheekY = ch.mouth[1] - 2;
  const cheeks = ch.cheeks
    ? `<ellipse cx="88" cy="${cheekY}" rx="10" ry="6.5" fill="#ff6fb7" opacity=".6"/><ellipse cx="168" cy="${cheekY}" rx="10" ry="6.5" fill="#ff6fb7" opacity=".6"/>`
    : '';
  return `
  <ellipse cx="128" cy="226" rx="60" ry="9" fill="${INK}" opacity=".3"/>
  ${ch.back()}
  ${bodyMarkup(ch)}
  ${eyes[ch.eyes](ch.eyePos)}
  ${cheeks}
  ${mouths[mouthKind](mouthY, tongue)}
  ${ch.front()}
  ${void eyeY ?? ''}`;
};

const avatarSvg = (ch) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Mimo ${ch.id}">
  <defs><pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.9" fill="${INK}" opacity=".2"/></pattern></defs>
  <rect width="256" height="256" rx="58" fill="${ch.bg}"/>
  <rect width="256" height="256" rx="58" fill="url(#dots)"/>
  <circle cx="128" cy="130" r="104" fill="${ch.light}" opacity=".35"/>
  ${ch.sparkles.map(([x, y, s, c]) => sparkle(x, y, s, c)).join('')}
  ${characterMarkup(ch)}
</svg>
`;

const soloSvg = (ch) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Mimo">
  ${characterMarkup(ch)}
</svg>
`;

mkdirSync(out('../../public/game-avatars'), { recursive: true });
mkdirSync(out('../../public/mimo'), { recursive: true });
for (const ch of CHARACTERS) writeFileSync(out(`../../public/game-avatars/mimo-${ch.id}.svg`), avatarSvg(ch));
writeFileSync(out('../../public/mimo/mimo.svg'), soloSvg(CHARACTERS[0]));
console.log(`${CHARACTERS.length} avatars + mascotte écrits.`);
