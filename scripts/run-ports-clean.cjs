/**
 * Port temizliği (WSL veya doğrudan Linux/macOS bash).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const script = path.join(__dirname, 'clean-dev-ports.sh');

if (process.platform !== 'win32') {
    const r = spawnSync('bash', [script], { cwd: root, stdio: 'inherit', shell: false });
    process.exit(r.status === null ? 1 : r.status);
}

function resolveWslPath(winOrUnixPath) {
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
const inner = ['set -euo pipefail', `cd ${JSON.stringify(wslRoot)}`, 'bash scripts/clean-dev-ports.sh'].join(
    '; ',
);

const r = spawnSync('wsl', ['-d', 'Ubuntu-24.04', 'bash', '-lc', inner], {
    stdio: 'inherit',
    shell: false,
});

process.exit(r.status === null ? 1 : r.status);
