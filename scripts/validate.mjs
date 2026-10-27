import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'artifacts');
await mkdir(artifacts, { recursive: true });

const server = spawn(process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host', '127.0.0.1',
  '--port', '7100',
  '--strictPort',
], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });

let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:7100/');
      if (response.ok) { ready = true; break; }
    } catch { /* Vite is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error(`Vite did not start:\n${serverOutput}`);

  browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('fonts.googleapis.com')) {
      errors.push(message.text());
    }
  });

  await page.goto('http://127.0.0.1:7100/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.pdf-page canvas', { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll('.thumbnail-item').length === 6);
  await page.waitForTimeout(1600);

  const pageCount = await page.locator('.page-input-wrap span').textContent();
  if (pageCount?.trim() !== '/ 6') throw new Error(`Unexpected page count: ${pageCount}`);

  const firstCanvas = page.locator('.pdf-page canvas').first();
  const canvasSize = await firstCanvas.evaluate((canvas) => ({ width: canvas.width, height: canvas.height }));
  if (canvasSize.width < 500 || canvasSize.height < 700) throw new Error(`Canvas did not render correctly: ${JSON.stringify(canvasSize)}`);

  await page.screenshot({ path: path.join(artifacts, 'arcreader-day.png'), fullPage: true });

  await page.getByTitle('切换夜间模式（N）').click();
  await page.waitForSelector('.app.night');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(artifacts, 'arcreader-night.png'), fullPage: true });

  await page.getByTitle('阅读外观').click();
  await page.waitForSelector('.appearance-panel');
  const slider = page.locator('.opacity-control input[type="range"]');
  await slider.evaluate((element) => {
    const input = element;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '25');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const opacity = await page.locator('.app').evaluate((element) => element.style.getPropertyValue('--paper-opacity'));
  if (opacity !== '0.25') throw new Error(`Opacity did not update: ${opacity}`);
  await page.getByRole('button', { name: '柔和', exact: true }).click();
  await page.locator('.appearance-panel .panel-heading button').click();

  await page.getByTitle('搜索文档（Ctrl+F）').click();
  await page.getByPlaceholder('输入关键词…').fill('夜深了');
  await page.getByRole('button', { name: '搜索全文' }).click();
  await page.waitForSelector('.search-result');
  await page.locator('.search-result').first().click();
  await page.waitForTimeout(900);
  const searchedPage = await page.getByLabel('当前页码').inputValue();
  if (searchedPage !== '3') throw new Error(`Search navigation failed: page ${searchedPage}`);
  await page.locator('.search-panel .panel-heading button').click();

  const zoomBefore = await page.locator('.zoom-value').textContent();
  await page.getByTitle('放大').click();
  const zoomAfter = await page.locator('.zoom-value').textContent();
  if (zoomBefore === zoomAfter) throw new Error('Zoom did not change');
  await page.getByTitle('适应宽度（0）').click();

  await page.keyboard.press('f');
  await page.waitForSelector('.app.focus-mode');
  await page.keyboard.press('f');
  await page.waitForSelector('.app:not(.focus-mode)');

  await page.locator('input[type="file"]').setInputFiles(path.join(root, 'public', 'sample.pdf'));
  await page.waitForSelector('.toast');
  await page.waitForTimeout(700);

  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
  console.log(JSON.stringify({
    status: 'passed',
    pages: 6,
    canvas: canvasSize,
    searchNavigation: 3,
    transparentOpacity: 0.25,
    nightMode: true,
    zoom: `${zoomBefore} -> ${zoomAfter}`,
    screenshots: ['artifacts/arcreader-day.png', 'artifacts/arcreader-night.png'],
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}
