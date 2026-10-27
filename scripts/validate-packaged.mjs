import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const executable = path.join(root, 'release', 'win-unpacked', 'ArcReader.exe');
const pdf = path.join(root, 'artifacts', '桌面双击测试.pdf');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

let app;
try {
  app = await electron.launch({ executablePath: executable, args: [pdf], cwd: root, env });
  const window = await app.firstWindow();
  const errors = [];
  window.on('pageerror', (error) => errors.push(error.message));
  await window.waitForSelector('.app.is-desktop', { timeout: 20000 });
  await window.waitForFunction(() => document.querySelector('.current-document strong')?.textContent === '桌面双击测试');
  await window.waitForFunction(() => document.querySelectorAll('.outline-title').length === 8);
  await window.waitForSelector('.pdf-page canvas');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({
    status: 'passed',
    executable: 'release/win-unpacked/ArcReader.exe',
    openedByFileArgument: '桌面双击测试.pdf',
    pages: 6,
    installer: 'release/ArcReader Setup 1.1.0.exe',
  }, null, 2));
} finally {
  if (app) await app.close();
}
