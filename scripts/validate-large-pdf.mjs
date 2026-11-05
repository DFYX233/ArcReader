import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';

const pdfArgument = process.argv[2];
const expectedPages = Number(process.argv[3] || 305);
if (!pdfArgument) {
  console.error('Usage: node scripts/validate-large-pdf.mjs <pdf-path> [pages]');
  process.exit(1);
}
const pdfPath = path.resolve(pdfArgument);
const expectedTitle = path.basename(pdfPath, path.extname(pdfPath));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const started = Date.now();
let app;
try {
  const executablePath = process.env.ARC_READER_EXECUTABLE;
  app = await electron.launch({
    ...(executablePath ? { executablePath } : {}),
    args: executablePath ? [pdfPath] : ['.', pdfPath],
    cwd: root,
    env,
  });
  const window = await app.firstWindow();
  const errors = [];
  window.on('pageerror', (error) => errors.push(error.message));
  await window.waitForFunction(
    (title) => document.querySelector('.current-document strong')?.textContent === title,
    expectedTitle,
    { timeout: 60000 },
  );
  const documentMs = Date.now() - started;
  await window.waitForSelector('.pdf-page[data-page="1"] canvas', { timeout: 30000 });
  const firstCanvasMs = Date.now() - started;
  await window.waitForTimeout(1200);
  const initialThumbnailCanvases = await window.locator('.thumbnail-paper canvas').count();
  if (initialThumbnailCanvases > 20) throw new Error(`Too many thumbnails rendered: ${initialThumbnailCanvases}`);

  await window.getByLabel('当前页码').fill(String(expectedPages));
  await window.waitForSelector(`.pdf-page[data-page="${expectedPages}"] canvas`, { timeout: 30000 });
  await window.waitForTimeout(700);
  const lastPage = await window.getByLabel('当前页码').inputValue();
  if (lastPage !== String(expectedPages)) throw new Error(`Last-page navigation failed: ${lastPage}`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ status: 'passed', expectedPages, documentMs, firstCanvasMs, initialThumbnailCanvases, lastPage }, null, 2));
} finally {
  if (app) await app.close();
}
