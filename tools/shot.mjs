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
      await page.waitForSelector('.ik-play-panel', { timeout: 15_000 });
      await page.waitForTimeout(1200);
    } catch {
      console.log(`     .ik-play-panel absent — capture de l'ecran obtenu`);
      const theme = await page.evaluate(() => ({
        stored: localStorage.getItem('game-theme'),
        bodyClass: document.body.className,
        search: window.location.search,
      }));
      console.log(`     theme stocke=${theme.stored} search=${theme.search}`);
      console.log(`     classes body=${theme.bodyClass}`);
    }
    await page.screenshot({ path: file, fullPage: true });

    /* Sur tablette et mobile, le menu défile dans `.ik-main` plutôt que dans
       le document. Une capture fullPage ne voit donc que le haut du scroller :
       on capture aussi explicitement la matrice des modes en position basse. */
    if (viewport.name === 'tablet' || viewport.name === 'mobile') {
      const main = page.locator('.ik-main');
      await main.evaluate((node) => { node.scrollTop = node.scrollHeight; });
      await page.waitForTimeout(180);
      await page.screenshot({ path: `${OUT}/menu-${viewport.name}-modes.png`, fullPage: false });
      await main.evaluate((node) => { node.scrollTop = 0; });
    }

    const box = await page.locator('.ik-play-panel').boundingBox();
    const title = await page.locator('.ik-home-brand').boundingBox();

    console.log(
      `OK   ${viewport.name.padEnd(7)} ${viewport.width}x${viewport.height}` +
        `  panneau ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'absent'}` +
        `  titre ${title ? `${Math.round(title.width)}x${Math.round(title.height)}` : 'absent'}`,
    );

    /* Les portails ne font pas partie de l'arbre du home. Une capture du menu
       seul ne détecterait donc ni un ancien skin résiduel ni un panneau qui
       déborde sur mobile. On ouvre chaque famille d'overlay, puis on la ferme
       par son vrai bouton afin de tester aussi le cycle de focus. */
    if (viewport.name === '1440' || viewport.name === 'mobile') {
      const captureOverlay = async ({ trigger, panelSelector, name }) => {
        await trigger.click();
        const panel = page.locator(panelSelector);
        await panel.waitFor({ state: 'visible', timeout: 10_000 });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${OUT}/overlay-${name}-${viewport.name}.png`, fullPage: false });
        const panelBox = await panel.boundingBox();
        const scroll = await panel.locator('.ink-panel-body').evaluate((node) => ({
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
        }));
        console.log(
          `     overlay ${name.padEnd(8)} ${panelBox ? `${Math.round(panelBox.width)}x${Math.round(panelBox.height)}` : 'absent'}` +
            `  scroll ${scroll.clientHeight}/${scroll.scrollHeight}`,
        );
        await panel.locator('.ink-close-button').click();
        await panel.waitFor({ state: 'detached', timeout: 10_000 });
      };

      await captureOverlay({
        trigger: page.getByRole('button', { name: "J'ai un code", exact: true }),
        panelSelector: '.ik-join-modal',
        name: 'join',
      });
      await captureOverlay({
        trigger: page.getByRole('button', { name: 'Paramètres', exact: true }),
        panelSelector: '.ik-options-modal',
        name: 'options',
      });

      if (viewport.name === '1440' || viewport.name === 'mobile') {
        await captureOverlay({
          trigger: page.getByRole('button', { name: 'Mes amis', exact: true }),
          panelSelector: '.ik-friends-drawer',
          name: 'friends',
        });
        await captureOverlay({
          trigger: page.getByRole('button', { name: /^Profil de / }),
          panelSelector: '.ik-profile-drawer',
          name: 'profile',
        });
      }
    }

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
process.exitCode = failed > 0 ? 1 : 0;
