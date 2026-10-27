import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  process.env.ARC_READER_EXE,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'ArcReader', 'ArcReader.exe'),
  'C:\\Program Files\\ArcReader\\ArcReader.exe',
  path.join(root, 'release', 'win-unpacked', 'ArcReader.exe'),
].filter(Boolean);
const executable = candidates.find((candidate) => existsSync(candidate));
if (!executable) {
  console.error('未找到 ArcReader.exe，请先安装 ArcReader。');
  process.exit(1);
}

const key = 'HKCU\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\ArcReader';
function register(args) {
  const result = spawnSync('reg.exe', args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

register(['add', key, '/ve', '/d', '使用 ArcReader 打开', '/f']);
register(['add', key, '/v', 'Icon', '/d', executable, '/f']);
register(['add', key, '/v', 'Position', '/d', 'Top', '/f']);
register(['add', `${key}\\command`, '/ve', '/d', `"${executable}" "%1"`, '/f']);
console.log(`PDF 右键菜单已启用：${executable}`);
