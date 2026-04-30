// Smoke test: drives all 7 pages via Playwright and captures a hero screenshot
// for the README. Intentionally light (no assertion framework) — this is a demo.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'docs', 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const PAGES = [
  { path: '/', name: 'dashboard', wait: 'text=Dashboard' },
  { path: '/menu', name: 'menu-performance', wait: 'text=Menu Performance' },
  { path: '/coupons', name: 'coupon-analysis', wait: 'text=Coupon Analysis' },
  { path: '/weather', name: 'weather-impact', wait: 'text=Weather Impact' },
  { path: '/recommendations', name: 'recommendations', wait: 'text=Recommendations' },
  { path: '/dineout', name: 'dineout-insights', wait: 'text=Dine-in vs Delivery' },
  { path: '/chat', name: 'chat-copilot', wait: 'text=Chat Copilot' },
];

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let pass = 0;
  for (const p of PAGES) {
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle' });
      await page.waitForSelector(p.wait, { timeout: 10000 });
      // wait an extra beat for charts to render
      await page.waitForTimeout(800);
      const screenshot = join(OUT_DIR, `${p.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      console.log(`✓ ${p.path.padEnd(20)} → ${screenshot}`);
      pass++;
    } catch (err) {
      console.error(`✗ ${p.path.padEnd(20)} ${err.message}`);
    }
  }

  // Hero screenshot — Dashboard, used in README
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Dashboard');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT_DIR, 'hero.png'), fullPage: false });
  console.log(`✓ hero (Dashboard) → docs/screenshots/hero.png`);

  await browser.close();
  console.log(`\n${pass}/${PAGES.length} pages rendered cleanly`);
  if (pass !== PAGES.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
