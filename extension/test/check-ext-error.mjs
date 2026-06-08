import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  console.log('Connected');

  const extPage = await browser.contexts()[0].newPage();
  await extPage.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
  await sleep(3000);

  // Enable dev mode
  await extPage.evaluate(() => {
    const toggle = document.querySelector('cr-toggle#devMode');
    if (toggle && !toggle.hasAttribute('checked')) {
      toggle.click();
    }
  });
  await sleep(3000);

  // Get all extension info including errors
  const info = await extPage.evaluate(() => {
    const items = document.querySelectorAll('extensions-item');
    return Array.from(items).map((item) => {
      const shadowRoot = item.shadowRoot;
      const name = shadowRoot?.querySelector('#name')?.textContent || '';
      const id = item.getAttribute('id') || '';
      const errors = shadowRoot?.querySelector('#errors')?.textContent?.trim() || '';
      const warnings = shadowRoot?.querySelector('#warnings')?.textContent?.trim() || '';

      // Check if there's a "reload" button (indicates loaded extension)
      const reload = shadowRoot?.querySelector('#reload')?.textContent || '';

      return { name, id, errors, warnings, hasReload: !!reload };
    });
  });

  console.log('Extensions:');
  for (const ext of info) {
    console.log(`\n  Name: "${ext.name}"`);
    console.log(`  ID: ${ext.id}`);
    if (ext.errors) console.log(`  ❌ Errors: ${ext.errors}`);
    if (ext.warnings) console.log(`  ⚠️ Warnings: ${ext.warnings}`);
    if (ext.hasReload) console.log('  Status: loaded');
  }

  // Also check for any error messages about unpacked extensions
  const fullText = await extPage.evaluate(() => document.body.textContent);
  // Search for ContentBridge or error mentions
  if (fullText.includes('ContentBridge')) {
    console.log('\nContentBridge mentioned on page');
  }
  if (fullText.includes('错误') || fullText.includes('Error') || fullText.includes('error')) {
    // Find error context
    const lines = fullText.split('\n').filter(l =>
      l.includes('错误') || l.includes('Error') || l.includes('error') || l.includes('ContentBridge')
    );
    console.log('Relevant lines:', lines.slice(0, 10));
  }

  console.log('\nNo ContentBridge found. Checking manifest validity...');

  // Directly read the manifest to check
  const { readFileSync } = await import('fs');
  const { join } = await import('path');
  const manifest = JSON.parse(
    readFileSync(join(import.meta.url.replace('file://', '').replace('/test/check-ext-error.mjs', ''),
      '/build/chrome-mv3-prod/manifest.json'), 'utf-8')
  );
  console.log('\nManifest check:');
  console.log('  manifest_version:', manifest.manifest_version);
  console.log('  name:', manifest.name);
  console.log('  background:', JSON.stringify(manifest.background));
  console.log('  side_panel:', JSON.stringify(manifest.side_panel));
  console.log('  permissions:', manifest.permissions);
  console.log('  content_scripts count:', manifest.content_scripts?.length);

  // Check if background service worker file exists
  if (manifest.background?.service_worker) {
    const swPath = manifest.background.service_worker;
    const fullSwPath = join(import.meta.url.replace('file://', '').replace('/test/check-ext-error.mjs', ''),
      '/build/chrome-mv3-prod', swPath);
    const { existsSync } = await import('fs');
    console.log(`  Service worker exists: ${existsSync(fullSwPath)} at ${swPath}`);
  }

  await sleep(10000);
  await browser.close();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => console.error(err));
