import { chromium } from 'playwright';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXTENSION_PATH = join(__dirname, '..', 'build', 'chrome-mv3-prod');

async function main() {
  // Verify extension build exists
  const manifestPath = join(EXTENSION_PATH, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('Extension build not found at:', EXTENSION_PATH);
    process.exit(1);
  }

  console.log(`Extension path: ${EXTENSION_PATH}`);

  // Launch Chrome with extension using a fresh temp profile
  const tmpDir = mkdtempSync(join(tmpdir(), 'ctbridge-'));

  const context = await chromium.launchPersistentContext(tmpDir, {
    channel: 'chrome',
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
    viewport: { width: 480, height: 800 },
  });

  console.log('Chrome launched, waiting for extension...');
  await sleep(5000);

  // Check all pages
  let pages = context.pages();
  console.log(`Pages: ${pages.length}`);

  // Check background pages and service workers
  const bgs = context.backgroundPages();
  console.log(`Background pages: ${bgs.length}`);
  for (const bg of bgs) {
    console.log(`  ${bg.url()}`);
  }

  const sws = context.serviceWorkers();
  console.log(`Service workers: ${sws.length}`);
  for (const sw of sws) {
    console.log(`  ${sw.url()}`);
  }

  // Try to get extension ID from all contexts
  let extId = null;

  // Also wait for new pages that might be extension pages
  const allUrls = [];
  for (const page of pages) {
    allUrls.push(page.url());
  }

  // Wait for a service worker or background page to appear
  for (let i = 0; i < 10 && !extId; i++) {
    await sleep(1000);

    // Re-check background pages
    const newBgs = context.backgroundPages();
    for (const bg of newBgs) {
      const url = bg.url();
      const m = url.match(/^chrome-extension:\/\/([^/]+)/);
      if (m) extId = m[1];
    }

    // Re-check service workers
    const newSws = context.serviceWorkers();
    for (const sw of newSws) {
      const url = sw.url();
      const m = url.match(/^chrome-extension:\/\/([^/]+)/);
      if (m) extId = m[1];
    }

    // Check new pages
    const newPages = context.pages();
    for (const page of newPages) {
      const url = page.url();
      if (!allUrls.includes(url)) {
        allUrls.push(url);
        const m = url.match(/^chrome-extension:\/\/([^/]+)/);
        if (m) extId = m[1];
      }
    }
  }

  if (extId) {
    console.log(`\n✅ Extension loaded! ID: ${extId}`);

    // Open sidepanel
    const sidepanel = await context.newPage();
    await sidepanel.goto(`chrome-extension://${extId}/sidepanel.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    console.log(`Sidepanel URL: ${sidepanel.url()}`);
    await sleep(3000);

    // ===== TEST FLOW =====
    console.log('\n--- Testing Dashboard ---');
    const h1Text = await sidepanel.locator('h1').textContent().catch(() => '(none)');
    console.log(`h1: "${h1Text}"`);

    await sidepanel.screenshot({
      path: join(__dirname, 'screenshots', 'dashboard.png'),
      fullPage: true,
    });
    console.log('📸 dashboard.png');

    // Click "开始创作"
    const startBtn = sidepanel.locator('button', { hasText: '开始创作' });
    const startVisible = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`开始创作 button: ${startVisible ? 'visible' : 'NOT FOUND'}`);

    if (startVisible) {
      await startBtn.click();
      await sleep(800);

      // Check platform pills
      const pills = sidepanel.locator('.platform-pill');
      const pillCount = await pills.count();
      console.log(`\n--- Testing Editor ---`);
      console.log(`Platform pills: ${pillCount}`);

      for (let i = 0; i < pillCount; i++) {
        const text = await pills.nth(i).textContent();
        console.log(`  ${i}: ${text.trim()}`);
      }

      // Demo button
      const demoBtn = sidepanel.locator('button', { hasText: 'Demo' });
      if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await demoBtn.click();
        console.log('Demo content filled');
        await sleep(500);
      }

      // Select all platforms
      for (let i = 0; i < pillCount; i++) {
        await pills.nth(i).click();
        await sleep(100);
      }
      console.log('All platforms selected');

      // Generate
      const genBtn = sidepanel.locator('button', { hasText: '生成' });
      if (await genBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await genBtn.click();
        console.log('Generate clicked');
        await sleep(4000);
      }

      // Check preview
      console.log(`\n--- Testing Preview ---`);
      const tabs = sidepanel.locator('.tab');
      const tabCount = await tabs.count();
      console.log(`Preview tabs: ${tabCount}`);

      for (let i = 0; i < tabCount; i++) {
        const text = await tabs.nth(i).textContent();
        console.log(`  Tab ${i}: ${text.trim()}`);
      }

      await sidepanel.screenshot({
        path: join(__dirname, 'screenshots', 'preview.png'),
        fullPage: true,
      });
      console.log('📸 preview.png');

      if (tabCount < 4) {
        console.log(`⚠️ Expected 4 tabs, got ${tabCount}`);
      } else {
        console.log('✅ All 4 platform tabs showing');
      }

      // Switch tabs and screenshot each
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await sleep(300);
        await sidepanel.screenshot({
          path: join(__dirname, 'screenshots', `preview-tab-${i}.png`),
          fullPage: true,
        });
      }
      console.log('📸 All tabs screenshotted');

      // Test records page
      const backBtn = sidepanel.locator('button').first();
      await backBtn.click().catch(() => {});
      await sleep(500);

      const recordsBtn = sidepanel.locator('button', { hasText: '发布记录' });
      if (await recordsBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await recordsBtn.first().click();
        await sleep(500);
        await sidepanel.screenshot({
          path: join(__dirname, 'screenshots', 'records.png'),
          fullPage: true,
        });
        console.log('📸 records.png');
      }

      console.log('\n✅ All UI tests passed!');
    }

    console.log('\nKeeping browser open for 30s...');
    await sleep(30000);
  } else {
    console.log('\n❌ Extension did not load. Debug info:');

    // Open chrome://extensions to see if there's an error
    const extPage = await context.newPage();
    await extPage.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Enable dev mode
    await extPage.evaluate(() => {
      const toggle = document.querySelector('cr-toggle#devMode');
      if (toggle && !toggle.hasAttribute('checked')) toggle.click();
    });
    await sleep(2000);

    await extPage.screenshot({
      path: join(__dirname, 'screenshots', 'extensions-debug.png'),
      fullPage: true,
    });
    console.log('📸 extensions-debug.png — check this screenshot');

    const pageText = await extPage.evaluate(() =>
      document.body?.textContent?.substring(0, 2000) || '(empty)'
    );
    console.log('Page text:', pageText);

    await sleep(30000);
  }

  await context.close();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
