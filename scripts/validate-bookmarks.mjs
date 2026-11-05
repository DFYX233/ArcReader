import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { _electron as electron } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const testPdf = path.join(artifacts, '书签测试.pdf');
const profile = path.join(artifacts, 'bookmark-test-profile');
await copyFile(path.join(root, 'public', 'sample.pdf'), testPdf);
await rm(profile, { recursive: true, force: true });
const documentKey = `path:${testPdf.replace(/\//g, '\\').toLowerCase()}`;
const electronEnv = { ...process.env };
delete electronEnv.ELECTRON_RUN_AS_NODE;
const errors = [];
const executablePath = process.env.ARC_READER_EXECUTABLE;
let app;

async function launch() {
  const instance = await electron.launch({
    ...(executablePath ? { executablePath } : {}),
    args: executablePath ? [testPdf, `--user-data-dir=${profile}`] : ['.', testPdf, `--user-data-dir=${profile}`],
    cwd: root,
    env: electronEnv,
  });
  const window = await instance.firstWindow();
  window.on('pageerror', (error) => errors.push(error.message));
  window.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  window.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await window.waitForFunction(
    () => document.querySelector('.current-document strong')?.textContent === '书签测试',
    { timeout: 20000 },
  );
  await window.waitForSelector('.pdf-page[data-page="1"] canvas', { timeout: 20000 });
  return { instance, window };
}

async function openBookmarkPanel(window) {
  await window.locator('.sidebar-tabs button').filter({ hasText: '书签' }).click();
  await window.waitForSelector('.bookmark-list');
}

async function savedBookmarks(window) {
  return window.evaluate((key) => {
    const store = JSON.parse(localStorage.getItem('arcreader-bookmarks-v1') || '{}');
    return store[key] ?? [];
  }, documentKey);
}

try {
  const first = await launch();
  app = first.instance;
  const window = first.window;
  await window.waitForFunction(() => document.querySelectorAll('.outline-title').length === 8);
  await window.locator('.outline-title').filter({ hasText: /^透明阅读$/ }).click();
  await window.waitForTimeout(900);
  if (await window.getByLabel('当前页码').inputValue() !== '2') throw new Error('Failed to navigate to page 2');

  await window.keyboard.press('b');
  await window.getByTitle('删除当前页书签（B）').waitFor();
  await openBookmarkPanel(window);
  await window.waitForFunction(() => document.querySelectorAll('.bookmark-item').length === 1);
  const excerpt = (await window.locator('.bookmark-excerpt').textContent())?.trim();
  if (!excerpt) throw new Error('Bookmark excerpt is empty');
  const saved = await savedBookmarks(window);
  if (saved.length !== 1 || saved[0].page !== 2 || saved[0].excerpt !== excerpt) {
    throw new Error(`Bookmark was not saved correctly: ${JSON.stringify(saved)}`);
  }
  await window.screenshot({ path: path.join(artifacts, 'arcreader-bookmarks.png') });

  await window.getByLabel('当前页码').fill('1');
  await window.waitForTimeout(500);
  await window.locator('.bookmark-jump').click();
  await window.waitForTimeout(900);
  if (await window.getByLabel('当前页码').inputValue() !== '2') throw new Error('Bookmark navigation failed');

  await app.close();
  app = undefined;

  const second = await launch();
  app = second.instance;
  const restartedWindow = second.window;
  await openBookmarkPanel(restartedWindow);
  await restartedWindow.waitForFunction(() => document.querySelectorAll('.bookmark-item').length === 1);
  const restoredExcerpt = (await restartedWindow.locator('.bookmark-excerpt').textContent())?.trim();
  if (restoredExcerpt !== excerpt) throw new Error('Bookmark excerpt changed after restart');
  await restartedWindow.locator('.bookmark-jump').click();
  await restartedWindow.waitForTimeout(900);
  if (await restartedWindow.getByLabel('当前页码').inputValue() !== '2') {
    throw new Error('Restored bookmark navigation failed');
  }

  await restartedWindow.getByTitle('删除当前页书签（B）').click();
  await restartedWindow.waitForSelector('.bookmark-empty');
  await restartedWindow.keyboard.press('b');
  await restartedWindow.waitForFunction(() => document.querySelectorAll('.bookmark-item').length === 1);
  await restartedWindow.getByRole('button', { name: '删除第 2 页书签', exact: true }).click();
  await restartedWindow.waitForSelector('.bookmark-empty');
  const remaining = await savedBookmarks(restartedWindow);
  if (remaining.length) throw new Error('Bookmark deletion was not persisted');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({
    status: 'passed',
    bookmarkPage: 2,
    excerpt,
    keyboardShortcut: true,
    navigation: true,
    persistedAfterRestart: true,
    toolbarDeletion: true,
    panelDeletion: true,
    consoleErrors: 0,
    screenshot: 'artifacts/arcreader-bookmarks.png',
  }, null, 2));
} finally {
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
}
