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

    const box = await page.locator('.ik-play-panel').boundingBox();
    const title = await page.locator('.ik-title').boundingBox();

    console.log(
      `OK   ${viewport.name.padEnd(7)} ${viewport.width}x${viewport.height}` +
        `  panneau ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'absent'}` +
        `  titre ${title ? `${Math.round(title.width)}x${Math.round(title.height)}` : 'absent'}`,
    );

    /* Entrée doit activer le bouton focalisé du lecteur, jamais le raccourci
       global « créer une partie ». On le vérifie avant les autres captures. */
    if (viewport.name === '1440') {
      const playButton = page.getByRole('button', { name: /^(Lire|Mettre en pause) / });
      await playButton.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
      if (!(await page.locator('.ik-play-panel').isVisible())) {
        throw new Error('Entrée sur le lecteur a quitté l’accueil');
      }
      await playButton.focus();
      await page.keyboard.press('Enter');
      console.log('     clavier lecteur OK');
    }

    /* Le lecteur Ink Beta est un dock permanent. Sa liste doit rester dans le
       viewport et se refermer avec le même contrôle sur desktop comme mobile. */
    if (viewport.name === '1440' || viewport.name === 'mobile') {
      const musicListButton = page.getByRole('button', { name: 'Ouvrir la liste des pistes' });
      await musicListButton.click();
      const musicList = page.locator('.mp-list');
      await musicList.waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/music-list-${viewport.name}.png`, fullPage: false });
      const musicBox = await page.locator('.mp-shell--ink-beta').boundingBox();
      console.log(
        `     lecteur ouvert ${musicBox ? `${Math.round(musicBox.width)}x${Math.round(musicBox.height)}` : 'absent'}`,
      );
      await page.getByRole('button', { name: 'Fermer la liste des pistes' }).click();
      await musicList.waitFor({ state: 'detached', timeout: 10_000 });
    }

    /* Planche de contrôle purement visuelle des SVG locaux : elle garantit que
       chaque preset est décodable par le navigateur et lisible en miniature. */
    if (viewport.name === '1440') {
      const avatars = await page.evaluate(async () => {
        const module = await import('/src/lib/gameAvatars.ts');
        return module.GAME_AVATARS.map(({ id, label, src }) => ({ id, label, src }));
      });
      await page.evaluate((items) => {
        const sheet = document.createElement('section');
        sheet.id = 'game-avatar-control-sheet';
        sheet.style.cssText = [
          'position:fixed', 'inset:0', 'z-index:20000', 'display:grid', 'place-items:center',
          'background:linear-gradient(135deg,#4c086e,#bf207e)', 'font-family:Outfit,sans-serif',
        ].join(';');
        sheet.innerHTML = `<div style="width:min(900px,92vw);padding:32px;border:3px solid rgba(255,255,255,.35);border-radius:28px;background:#721273;box-shadow:0 12px 0 #35104f">
          <h1 style="margin:0 0 24px;color:#fff8ff;font-size:30px">Avatars Mimic Master</h1>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px">${items.map((avatar) => `
            <article style="padding:14px;text-align:center;border:2px solid rgba(255,255,255,.22);border-radius:18px;background:#5a0b62">
              <img src="${avatar.src}" alt="${avatar.label}" style="display:block;width:128px;height:128px;margin:auto;border:4px solid #fff;border-radius:50%;object-fit:cover" />
              <strong style="display:block;margin-top:10px;color:#fff8ff">${avatar.label}</strong>
            </article>`).join('')}</div>
        </div>`;
        document.body.appendChild(sheet);
      }, avatars);
      await page.locator('#game-avatar-control-sheet img').first().waitFor({ state: 'visible' });
      await page.screenshot({ path: `${OUT}/avatar-catalog.png`, fullPage: false });
      await page.locator('#game-avatar-control-sheet').evaluate((node) => node.remove());
    }

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

      if (viewport.name === '1440') {
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
process.exitCode = failed === targets.length ? 1 : 0;
