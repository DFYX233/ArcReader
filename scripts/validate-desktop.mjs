import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdir } from 'node:fs/promises';
import { _electron as electron } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const testPdf = path.join(artifacts, '桌面双击测试.pdf');
await copyFile(path.join(root, 'public', 'sample.pdf'), testPdf);

let app;
try {
  const electronEnv = { ...process.env };
  delete electronEnv.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    args: ['.', testPdf],
    cwd: root,
    env: electronEnv,
  });
  const window = await app.firstWindow();
  const errors = [];
  window.on('pageerror', (error) => errors.push(error.message));

  await window.waitForSelector('.app.is-desktop', { timeout: 20000 });
  await window.waitForFunction(() => document.querySelectorAll('.outline-title').length === 8, { timeout: 20000 });
  console.log('Observed document title:', await window.locator('.current-document strong').textContent());
  await window.waitForFunction(() => document.querySelector('.current-document strong')?.textContent === '桌面双击测试');
  await window.waitForSelector('.pdf-page canvas');
  await window.waitForTimeout(1200);

  const nativeApi = await window.evaluate(() => Boolean(window.arcDesktop?.isDesktop));
  if (!nativeApi) throw new Error('Native desktop API is unavailable');

  const title = await window.locator('.current-document strong').textContent();
  const pageCount = await window.locator('.page-input-wrap span').textContent();
  if (pageCount?.trim() !== '/ 6') throw new Error(`Unexpected page count: ${pageCount}`);

  await window.locator('.outline-title').filter({ hasText: /^透明阅读$/ }).click();
  await window.waitForTimeout(900);
  const outlinePage = await window.getByLabel('当前页码').inputValue();
  if (outlinePage !== '2') throw new Error(`Outline navigation failed: page ${outlinePage}`);
  await window.screenshot({ path: path.join(artifacts, 'arcreader-desktop.png') });

  const alwaysOnTopBefore = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop());
  await window.locator('.top-actions button[title*="置顶"]').click();
  await window.waitForTimeout(250);
  const alwaysOnTop = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop());
  if (alwaysOnTop === alwaysOnTopBefore) throw new Error('Always-on-top did not toggle');

  await window.locator('.top-actions').getByTitle('阅读外观').click();
  const windowSettings = window.locator('.window-settings');
  const windowOpacitySwitch = windowSettings.locator('.switch').first();
  if (await windowOpacitySwitch.getAttribute('aria-checked') !== 'true') await windowOpacitySwitch.click();
  const opacitySlider = windowSettings.locator('input[type="range"]');
  await opacitySlider.evaluate((element) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(element, '65');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await window.waitForTimeout(350);
  const nativeOpacity = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getOpacity());
  if (Math.abs(nativeOpacity - 0.65) > 0.02) throw new Error(`Window opacity failed: ${nativeOpacity}`);
  await windowSettings.locator('.switch').first().click();
  await window.locator('.appearance-panel .panel-heading button').click();

  await window.evaluate(() => window.arcDesktop.windowControl('maximize'));
  await window.waitForTimeout(400);
  const maximized = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized());
  if (!maximized) throw new Error('Native maximize control failed');
  await window.evaluate(() => window.arcDesktop.windowControl('maximize'));

  if (!await window.locator('.app.night').count()) await window.getByTitle('切换夜间模式（N）').click();
  await window.waitForSelector('.app.night');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({
    status: 'passed',
    openedByFileArgument: title,
    pages: 6,
    outlineEntries: 8,
    outlineNavigation: 2,
    nativeOpacity,
    alwaysOnTop,
    nativeApi,
    nativeWindowControls: true,
    nightMode: true,
    screenshot: 'artifacts/arcreader-desktop.png',
  }, null, 2));
} finally {
  if (app) await app.close();
}
