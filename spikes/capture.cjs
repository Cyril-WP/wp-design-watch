#!/usr/bin/env node
// SPIKE, throwaway (27 Nov 2026). Answers one question: can plain browser checks plus a
// screenshot give a judge enough to grade a page? It captures each profile route at each
// viewport and runs the detector layer only. The real tool replaces this file.
//
// Usage: node spikes/capture.cjs <profile.json> [--out <dir>]
// Output goes outside the repo by default: ~/.config/design-watch/<project>/runs/<date>/

const fs = require('fs');
const os = require('os');
const path = require('path');

const { chromium } = require('playwright-core');

const CHROME = process.env.DW_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Plain headless Chrome was served a Cloudflare challenge; a normal desktop signature was not.
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const FIRST_SCREEN_SAMPLE = 4;

function parseArgs(argv) {
  const [profilePath, ...rest] = argv;
  if (!profilePath) throw new Error('Usage: node spikes/capture.cjs <profile.json> [--out <dir>]');
  const outIndex = rest.indexOf('--out');
  return { profilePath, out: outIndex >= 0 ? rest[outIndex + 1] : null };
}

function contextOptions({ width, height, scale, mobile }) {
  return {
    viewport: { width, height },
    deviceScaleFactor: scale,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile ? PHONE_UA : DESKTOP_UA,
  };
}

// Runs inside the page. Boxes are CSS pixels relative to the first screen.
function detect({ houseFonts, sample }) {
  const vw = innerWidth;
  const vh = innerHeight;
  const luminance = (css) => {
    const m = css.match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return { lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, alpha: m[3] === undefined ? 1 : Number(m[3]) };
  };
  // Known weakness: text over an <img> (not a CSS background) reads the page behind it.
  const groundOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none') return null;
      const l = luminance(s.backgroundColor);
      if (l && l.alpha > 0.9) return l.lum;
    }
    return 1;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
  };
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  };
  const inFirstScreen = (b) => b[1] >= 0 && b[1] + b[3] <= vh && b[0] >= 0 && b[0] < vw;
  const pick = (items) => ({ count: items.length, firstScreen: items.filter((x) => inFirstScreen(x.box)).slice(0, sample) });

  const textEls = [...document.querySelectorAll('body *')].filter(
    (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) && visible(e),
  );
  const fonts = {};
  const offFont = [];
  const tiny = [];
  const lowContrast = [];
  for (const e of textEls) {
    const s = getComputedStyle(e);
    const family = s.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
    const text = e.textContent.trim().slice(0, 40);
    const size = parseFloat(s.fontSize);
    fonts[family] = (fonts[family] || 0) + 1;
    if (!houseFonts.some((h) => family.includes(h))) offFont.push({ family, text, box: box(e) });
    if (size < 12) tiny.push({ size, text, box: box(e) });
    const fg = luminance(s.color);
    const bg = groundOf(e);
    if (fg && bg !== null && fg.alpha > 0.5) {
      const ratio = (Math.max(fg.lum, bg) + 0.05) / (Math.min(fg.lum, bg) + 0.05);
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) lowContrast.push({ ratio: Number(ratio.toFixed(2)), text, box: box(e) });
    }
  }
  const controls = [...document.querySelectorAll('a,button,[role=button],input,select')].filter(visible);
  const smallTargets = controls
    .map((e) => ({ text: (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30), box: box(e) }))
    .filter((t) => t.box[2] < 24 || t.box[3] < 24);
  const unnamed = controls
    .filter((e) => !e.innerText.trim() && !e.getAttribute('aria-label') && !e.getAttribute('title') && !e.querySelector('img[alt]:not([alt=""]),[aria-label],title'))
    .map((e) => ({ box: box(e) }));

  return {
    fonts,
    offFont: pick(offFont),
    tiny: pick(tiny),
    lowContrast: pick(lowContrast),
    smallTargets: pick(smallTargets),
    unnamed: pick(unnamed),
    imagesWithoutAlt: [...document.querySelectorAll('img')].filter((i) => visible(i) && !i.hasAttribute('alt')).length,
    sidewaysOverflow: Math.max(0, document.documentElement.scrollWidth - vw),
    pageHeight: document.documentElement.scrollHeight,
  };
}

async function captureOne({ browser, profile, route, viewportName, outDir }) {
  const context = await browser.newContext(contextOptions(profile.viewports[viewportName]));
  const page = await context.newPage();
  const key = `${route.name}-${viewportName}`;
  try {
    await page.goto(new URL(route.path, profile.base).toString(), { waitUntil: 'networkidle', timeout: 45000 })
      .catch(() => page.waitForTimeout(3000));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, `${key}.jpg`), type: 'jpeg', quality: 62 });
    const checks = await page.evaluate(detect, { houseFonts: profile.houseFonts, sample: FIRST_SCREEN_SAMPLE });
    return [key, { path: route.path, viewport: viewportName, title: await page.title(), ...checks }];
  } catch (error) {
    return [key, { path: route.path, viewport: viewportName, error: String(error).slice(0, 200) }];
  } finally {
    await context.close();
  }
}

async function main() {
  const { profilePath, out } = parseArgs(process.argv.slice(2));
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  const stamp = new Date().toISOString().slice(0, 16).replace(':', '');
  const outDir = out || path.join(os.homedir(), '.config', 'design-watch', profile.project, 'runs', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--disable-blink-features=AutomationControlled'] });
  const results = {};
  try {
    for (const route of profile.routes) {
      for (const viewportName of Object.keys(profile.viewports)) {
        const [key, result] = await captureOne({ browser, profile, route, viewportName, outDir });
        results[key] = result;
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(results, null, 1));
  process.stdout.write(`${Object.keys(results).length} captures written to ${outDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
