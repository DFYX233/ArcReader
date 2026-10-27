import { spawnSync } from 'node:child_process';

const key = 'HKCU\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\ArcReader';
const result = spawnSync('reg.exe', ['delete', key, '/f'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
console.log('ArcReader PDF 右键菜单已移除。');
