import { chromium } from 'playwright';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXTENSION_PATH = join(__dirname, '..', 'build', 'chrome-mv3-prod');

async function main() {
  const tmpDir = mkdtempSync(join(tmpdir(), 'chrome-test-'));

  console.log(`Extension path: ${EXTENSION_PATH}`);
  console.log(`Profile dir: ${tmpDir}`);

  const context = await chromium.launchPersistentContext(tmpDir, {
    channel: 'chrome',
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
    viewport: { width: 480, height: 800 },
  });

  // Wait for extension to load
  console.log('Waiting for extension to load...');
  await sleep(5000);

  // Try to get extension ID from the background service worker
  let extId = null;

  // Method 1: Check if any background page or worker appeared
  const bgs = context.backgroundPages();
  console.log(`Background pages: ${bgs.length}`);
  for (const bg of bgs) {
    console.log('  BG URL:', bg.url());
    const m = bg.url().match(/^chrome-extension:\/\/([^/]+)/);
    if (m) extId = m[1];
  }

  const sws = context.serviceWorkers();
  console.log(`Service workers: ${sws.length}`);
  for (const sw of sws) {
    console.log('  SW URL:', sw.url());
    const m = sw.url().match(/^chrome-extension:\/\/([^/]+)/);
    if (m) extId = m[1];
  }

  // Method 2: Wait for a new page with the extension URL
  if (!extId) {
    console.log('Waiting for extension page to appear...');
    try {
      const page = await context.waitForEvent('page', { timeout: 10000 });
      console.log('New page:', page.url());
      const m = page.url().match(/^chrome-extension:\/\/([^/]+)/);
      if (m) extId = m[1];
    } catch {
      console.log('No extension page appeared');
    }
  }

  // Method 3: Open chrome://extensions and scrape
  if (!extId) {
    console.log('Opening chrome://extensions...');
    const extPage = await context.newPage();
    await extPage.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // Click dev mode toggle
    await extPage.evaluate(() => {
      const toggle = document.querySelector('cr-toggle#devMode');
      if (toggle && !toggle.getAttribute('checked')) {
        toggle.click();
      }
    });
    await sleep(2000);

    const ids = await extPage.evaluate(() => {
      const items = document.querySelectorAll('extensions-item');
      return Array.from(items).map((item) => ({
        name: item.querySelector('#name')?.textContent || '',
        id: item.getAttribute('id') || '',
      }));
    });

    console.log('Extensions found:');
    for (const ext of ids) {
      console.log(`  "${ext.name}" => ${ext.id}`);
      if (ext.name?.includes('ContentBridge')) extId = ext.id;
    }

    // Also try getting raw HTML
    if (!extId) {
      const html = await extPage.content();
      const match = html.match(/"([a-z]{32})"[^}]*"ContentBridge/);
      if (match) extId = match[1];
      if (!extId) {
        const m2 = html.match(/ContentBridge[^"]*"[^"]*"([a-z]{32})"/);
        if (m2) extId = m2[1];
      }
      if (!extId) {
        // Try reversed
        const m3 = html.match(/"([a-z]{32})"[^"]{0,200}ContentBridge/);
        if (m3) extId = m3[1];
      }
    }

    await extPage.close();
  }

  if (extId) {
    console.log(`\nExtension ID: ${extId}`);

    const sidepanel = await context.newPage();
    await sidepanel.goto(`chrome-extension://${extId}/sidepanel.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    console.log(`Opened: ${sidepanel.url()}`);
    await sleep(2000);

    // Screenshot
    await sidepanel.screenshot({
      path: join(__dirname, 'screenshots', 'sidepanel.png'),
      fullPage: true,
    });
    console.log('📸 Screenshot saved');

    // Test the flow
    const title = await sidepanel.locator('h1, .title').first().textContent().catch(() => '(not found)');
    console.log(`Page heading: "${title}"`);

    const startBtn = sidepanel.locator('button', { hasText: '开始创作' });
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Dashboard loaded');
      await startBtn.click();
      await sleep(500);

      const demoBtn = sidepanel.locator('button', { hasText: 'Demo' });
      if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await demoBtn.click();
        console.log('✅ Demo content filled');
        await sleep(500);

        const genBtn = sidepanel.locator('button', { hasText: '生成' });
        if (await genBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await genBtn.click();
          console.log('✅ Generate clicked');
          await sleep(3000);

          // Check for platform tabs
          const tabs = sidepanel.locator('.tab');
          const tabCount = await tabs.count();
          console.log(`Preview tabs: ${tabCount}`);

          await sidepanel.screenshot({
            path: join(__dirname, 'screenshots', 'preview.png'),
            fullPage: true,
          });
          console.log('📸 Preview screenshot saved');
        }
      }
    } else {
      console.log('Dashboard not found — unexpected page state');
      const body = await sidepanel.locator('body').textContent().catch(() => '(error)');
      console.log(`Body preview: ${body?.substring(0, 200)}`);
    }

    console.log('\n✅ Test done. Keeping browser open 30s...');
    await sleep(30000);
  } else {
    console.log('❌ Could not find extension ID');
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
