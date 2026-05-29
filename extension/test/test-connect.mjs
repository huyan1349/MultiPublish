import { chromium } from 'playwright';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CDP_URL = 'http://localhost:9222';

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  console.log('Connected to Chrome');

  // Open a new page and go to extensions
  const extPage = await browser.contexts()[0].newPage();
  await extPage.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
  await sleep(2000);

  // Enable developer mode
  await extPage.evaluate(() => {
    const toggle = document.querySelector('cr-toggle#devMode');
    if (toggle && !toggle.hasAttribute('checked')) {
      toggle.click();
    }
  });
  await sleep(2000);

  // Take screenshot of extensions page for debugging
  await extPage.screenshot({
    path: join(__dirname, 'screenshots', 'extensions-page.png'),
    fullPage: true,
  });
  console.log('📸 Extensions page screenshot saved');

  // Get the full HTML text to debug
  const pageText = await extPage.evaluate(() => {
    const container = document.querySelector('extensions-manager')
      || document.querySelector('#container')
      || document.body;
    return container?.textContent?.substring(0, 3000) || '(empty)';
  });
  console.log('Extensions page text:', pageText.substring(0, 500));

  // Check for extension items
  const extData = await extPage.evaluate(() => {
    const items = document.querySelectorAll('extensions-item');
    if (items.length === 0) {
      // Try older selectors
      const rows = document.querySelectorAll('.extension-list-item-wrapper');
      return {
        count: rows.length,
        items: Array.from(rows).map((r) => ({
          name: r.querySelector('#name')?.textContent || r.textContent?.substring(0, 50) || '',
          id: r.getAttribute('id') || '',
        })),
      };
    }
    return {
      count: items.length,
      items: Array.from(items).map((item) => ({
        name: item.querySelector('#name')?.textContent || '',
        id: item.getAttribute('id') || '',
      })),
    };
  });
  console.log(`Extension items: ${extData.count}`);
  for (const ext of extData.items) {
    console.log(`  "${ext.name}" id=${ext.id}`);
  }

  // Look for error messages
  const errors = await extPage.evaluate(() => {
    const errEls = document.querySelectorAll('#errors, .errors, .error, #load-error');
    return Array.from(errEls).map((el) => el.textContent?.trim()).filter(Boolean);
  });
  if (errors.length > 0) {
    console.log('Load errors:', errors);
  }

  // Check if ContentBridge is loaded
  const hasContentBridge = extData.items.some((item) =>
    item.name?.toLowerCase().includes('contentbridge') ||
    item.name?.includes('多平台')
  );

  if (!hasContentBridge) {
    console.log('\n⚠️ ContentBridge not loaded. Trying to load it manually...');

    // Try loading the extension via the "Load unpacked" button
    try {
      await extPage.evaluate(() => {
        const loadBtn = document.querySelector('#loadUnpacked');
        if (loadBtn) loadBtn.click();
        else {
          // Find by text
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent?.includes('加载') || btn.textContent?.includes('load')) {
              btn.click();
              break;
            }
          }
        }
      });
      console.log('Clicked load unpacked button (need to select folder manually)');
    } catch (e) {
      console.log('Could not click load button:', e.message);
    }

    // Check the chrome://inspect/#service-workers page for more info
    const swPage = await browser.contexts()[0].newPage();
    await swPage.goto('chrome://serviceworker-internals/', { waitUntil: 'domcontentloaded' });
    await sleep(1000);
    const swText = await swPage.evaluate(() => document.body.textContent?.substring(0, 500));
    console.log('Service workers:', swText);
    await swPage.close();
  }

  // Keep browser open
  console.log('\nBrowser open for 60s — you can manually check chrome://extensions');
  await sleep(60000);
  await browser.close();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
