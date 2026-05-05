/**
 * Yerel ortam: WSL Ubuntu içinde npm install + stack-prepare.
 * Windows'tan Cursor ile çalışırken wslpath ile proje kökünü WSL yoluna çevirir.
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function resolveWslPath(winOrUnixPath) {
    if (process.platform !== 'win32') {
        return winOrUnixPath;
    }
    try {
        const out = execSync(`wsl wslpath -a "${String(winOrUnixPath).replace(/"/g, '\\"')}"`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        const s = out.trim();
        if (s) return s;
    } catch {
        /* fall through */
    }
    return '/home/azem/projects/shopping';
}

const wslRoot = resolveWslPath(root);
const inner = [
    'set -euo pipefail',
    `cd ${JSON.stringify(wslRoot)}`,
    'npm install',
    'bash scripts/stack-prepare.sh',
].join('; ');

const r = spawnSync('wsl', ['-d', 'Ubuntu-24.04', 'bash', '-lc', inner], {
    stdio: 'inherit',
    shell: false,
});

process.exit(r.status === null ? 1 : r.status);
