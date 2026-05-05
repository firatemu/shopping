/**
 * Next.js dev (port 3000). Windows + UNC workspace: komutu WSL içinde çalıştırır.
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

if (process.platform !== 'win32') {
    const r = spawnSync('npm', ['run', 'dev', '--workspace=apps/web'], {
        cwd: root,
        stdio: 'inherit',
        shell: true,
    });
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
const inner = [
    'set -euo pipefail',
    `cd ${JSON.stringify(wslRoot)}`,
    'npm run dev:web',
].join('; ');

const r = spawnSync('wsl', ['-d', 'Ubuntu-24.04', 'bash', '-lc', inner], {
    stdio: 'inherit',
    shell: false,
});

process.exit(r.status === null ? 1 : r.status);
