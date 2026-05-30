import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT  = path.join(__dirname, 'screenshots');
const BASE = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 860 });

// Login as mcp_user
await page.goto(BASE);
await page.waitForTimeout(2000);
await page.fill('input[type="text"]', 'mcp_user@dobbydrive.com');
await page.fill('input[type="password"]', 'mcp_secure_password_12345');
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);

// Root dashboard
await page.screenshot({ path: `${OUT}/mcp-dashboard.png` });
console.log('✅ mcp-dashboard.png');

// Click into Campaigns folder
const folders = page.locator('.folder-card');
const count = await folders.count();
for (let i = 0; i < count; i++) {
  const name = await folders.nth(i).locator('.folder-name').textContent();
  if (name?.includes('Campaigns')) {
    await folders.nth(i).click();
    break;
  }
}
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/mcp-campaigns.png` });
console.log('✅ mcp-campaigns.png');

await browser.close();
console.log('Done!');
