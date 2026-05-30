import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT  = path.join(__dirname, 'screenshots');
const BASE = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 860 });

// Login
await page.goto(BASE);
await page.waitForTimeout(2000);
await page.fill('input[type="text"]', 'Dheeraj');
await page.fill('input[type="password"]', 'Dheeraj1!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

// Click into Projects folder (has images)
const folderCards = page.locator('.folder-card');
const count = await folderCards.count();
console.log(`Found ${count} folders`);

// Find and click the Projects folder
for (let i = 0; i < count; i++) {
  const name = await folderCards.nth(i).locator('.folder-name').textContent();
  console.log(`Folder ${i}: ${name}`);
  if (name?.trim() === 'Projects') {
    await folderCards.nth(i).click();
    break;
  }
}

await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/folder-with-images.png` });
console.log('✅ folder-with-images.png');

// Also take list view
await page.click('.view-toggle-btn:last-child');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/list-view.png` });
console.log('✅ list-view.png');

await browser.close();
console.log('Done!');
