import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { _electron as electron } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs', 'images');
await mkdir(output, { recursive: true });
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

let app;
try {
  app = await electron.launch({ args: ['.'], cwd: root, env });
  const window = await app.firstWindow();
  await window.waitForSelector('.app.is-desktop', { timeout: 20000 });
  await window.evaluate(() => {
    localStorage.setItem('arcreader-theme', 'day');
    localStorage.setItem('arcreader-window-translucent', 'false');
    localStorage.setItem('arcreader-always-on-top', 'false');
  });
  await window.reload();
  await window.waitForFunction(() => document.querySelectorAll('.outline-title').length === 8);
  await window.waitForSelector('.pdf-page canvas');
  await window.waitForTimeout(1300);
  await window.screenshot({ path: path.join(output, 'reader-day.png') });

  await window.getByTitle('切换夜间模式（N）').click();
  await window.waitForSelector('.app.night');
  await window.waitForTimeout(350);
  await window.screenshot({ path: path.join(output, 'reader-night.png') });

  await window.locator('.top-actions').getByTitle('阅读外观').click();
  await window.waitForSelector('.window-settings');
  await window.waitForTimeout(250);
  await window.screenshot({ path: path.join(output, 'reader-settings.png') });
  console.log('README screenshots created in docs/images');
} finally {
  if (app) await app.close();
}
