/**
 * Nest health: GET http://127.0.0.1:${API_PORT}/api/v1/health
 * API_PORT yoksa 4000.
 */
const port = process.env.API_PORT || '4000';
const url = `http://127.0.0.1:${port}/api/v1/health`;

fetch(url)
    .then((r) => {
        if (!r.ok) {
            console.error(`check:api failed: HTTP ${r.status} ${r.statusText} (${url})`);
            process.exit(1);
        }
        return r.json();
    })
    .then((body) => {
        console.log(`check:api OK ${url}`);
        console.log(typeof body === 'object' ? JSON.stringify(body, null, 2) : body);
    })
    .catch((err) => {
        console.error(`check:api failed: ${err instanceof Error ? err.message : err} (${url})`);
        process.exit(1);
    });
