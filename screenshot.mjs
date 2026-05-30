import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT   = path.join(__dirname, 'screenshots');
const BASE  = 'http://localhost:5173';
const ts    = Date.now();

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 860 });

const waitNoModal = () =>
  page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 10000 }).catch(() => {});

// ── 1. Login page ──────────────────────────────
await page.goto(BASE);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/login.png` });
console.log('✅ login.png');

// ── Login ──────────────────────────────────────
await page.fill('input[type="text"]', 'Dheeraj');
await page.fill('input[type="password"]', 'Dheeraj1!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

// ── 2. Dashboard empty state ───────────────────
await page.screenshot({ path: `${OUT}/dashboard-empty.png` });
console.log('✅ dashboard-empty.png');

// ── 3. Create folder modal ──────────────────────
await page.click('button:has-text("New Folder")');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/create-folder.png` });
console.log('✅ create-folder.png');

// Create unique folder 1
const folder1 = `My Projects ${ts}`;
await page.fill('input[placeholder="e.g. Vacation Photos"]', folder1);
await page.click('button[type="submit"]');
await waitNoModal();
await page.waitForTimeout(1000);

// Create unique folder 2
await page.click('button:has-text("New Folder")');
await waitNoModal();
await page.waitForSelector('input[placeholder="e.g. Vacation Photos"]');
await page.fill('input[placeholder="e.g. Vacation Photos"]', `Design Assets ${ts}`);
await page.click('button[type="submit"]');
await waitNoModal();
await page.waitForTimeout(1000);

// ── 4. Upload modal ─────────────────────────────
await page.click('button:has-text("Upload")');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/upload-modal.png` });
console.log('✅ upload-modal.png');

// Close upload modal via backdrop click
await page.click('.modal-backdrop', { position: { x: 50, y: 50 } });
await waitNoModal();
await page.waitForTimeout(600);

// ── 5. Dashboard with folders ───────────────────
await page.screenshot({ path: `${OUT}/dashboard-with-content.png` });
console.log('✅ dashboard-with-content.png');

// ── 6. Navigate into folder ─────────────────────
await page.locator('.folder-card').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/nested-folder.png` });
console.log('✅ nested-folder.png');

await browser.close();
console.log('\nAll screenshots saved to /screenshots');
