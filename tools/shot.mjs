/**
 * Captures d'écran du menu, pour vérifier réellement le rendu.
 *
 * Sans cet outil, chaque ajustement de mise en page se faisait à l'aveugle :
 * le code compilait, les tests passaient, et l'écart avec la maquette ne se
 * découvrait qu'à la capture suivante envoyée à la main. Il permet la boucle
 * complète — modifier, capturer, regarder, corriger.
 *
 * Le thème beta est réservé aux administrateurs. On force donc le thème dans
 * `localStorage` et on ajoute `?betapreview`, un raccourci que `Index.tsx`
 * n'honore que sous `import.meta.env.DEV` et qui disparaît du bundle de
 * production.
 *
 * Usage :
 *   node tools/shot.mjs                      → toutes les largeurs
 *   node tools/shot.mjs 1920                 → une seule largeur
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = process.env.SHOT_URL || 'http://127.0.0.1:5199';
const OUT = resolve('tools/shots');

/* Le nom sert de suffixe de fichier ; la hauteur est celle du viewport, pas
   celle de la capture, qui est prise en pleine page. */
const VIEWPORTS = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

const only = process.argv[2];
const targets = only ? VIEWPORTS.filter((v) => v.name === only) : VIEWPORTS;

if (targets.length === 0) {
  console.error(`Largeur inconnue « ${only} ». Attendu : ${VIEWPORTS.map((v) => v.name).join(', ')}`);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
let failed = 0;

for (const viewport of targets) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    /* Coupe les animations d'entrée : sans ça la capture attrape les traits
       en cours de dessin et l'interface paraît cassée. */
    reducedMotion: 'reduce',
  });

  /* Le thème doit être choisi avant le premier rendu, sinon React monte
     l'accueil stable puis bascule, et la capture arrive trop tôt. */
  await context.addInitScript(() => {
    localStorage.setItem('game-theme', 'inkbeta');
    localStorage.setItem('ink-mode-enabled', 'true');
    localStorage.setItem('playerName', 'MOAT');
  });

  const page = await context.newPage();
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text().slice(0, 160));
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message.slice(0, 160)}`));

  try {
    await page.goto(`${BASE}/?betapreview`, { waitUntil: 'networkidle', timeout: 45_000 });

    /* Attend que le panneau soit réellement monté : `networkidle` ne garantit
       pas que le chunk chargé en lazy a fini de rendre.

       En cas d'échec on capture quand même : une capture de l'écran obtenu
       vaut mieux qu'un message de délai dépassé pour comprendre ce qui a été
       rendu à la place. */
    const file = `${OUT}/menu-${viewport.name}.png`;
    try {
      await page.waitForSelector('.ik-panel', { timeout: 15_000 });
      await page.waitForTimeout(1200);
    } catch {
      console.log(`     .ik-panel absent — capture de l'ecran obtenu`);
      const theme = await page.evaluate(() => ({
        stored: localStorage.getItem('game-theme'),
        bodyClass: document.body.className,
        search: window.location.search,
      }));
      console.log(`     theme stocke=${theme.stored} search=${theme.search}`);
      console.log(`     classes body=${theme.bodyClass}`);
    }
    await page.screenshot({ path: file, fullPage: true });

    const box = await page.locator('.ik-panel').boundingBox();
    const title = await page.locator('.ik-title').boundingBox();

    console.log(
      `OK   ${viewport.name.padEnd(7)} ${viewport.width}x${viewport.height}` +
        `  panneau ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'absent'}` +
        `  titre ${title ? `${Math.round(title.width)}x${Math.round(title.height)}` : 'absent'}`,
    );
    if (problems.length) {
      console.log(`     ${problems.length} erreur(s) console :`);
      for (const p of [...new Set(problems)].slice(0, 4)) console.log(`       ${p}`);
    }
  } catch (error) {
    console.log(`KO   ${viewport.name.padEnd(7)} ${error.message.split('\n')[0].slice(0, 140)}`);
    failed += 1;
  } finally {
    await context.close();
  }
}

await browser.close();
console.log(`\ncaptures dans ${OUT}`);
process.exitCode = failed === targets.length ? 1 : 0;
