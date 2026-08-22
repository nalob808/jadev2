import { createServer } from 'node:http';
import { ASTRO_VERSION } from '@jade/astro';

/**
 * The worker.
 *
 * Phase 5 fills this in: nightly watch evaluation, shared ingress/eclipse
 * table precomputation, daśā × transit correlation series, and Playwright PDF
 * rendering. It lives outside Vercel because those jobs run for minutes and
 * serverless functions do not.
 *
 * For now it is a health endpoint, so the deploy pipeline is real from day one.
 */
const port = Number(process.env.PORT ?? 8080);

createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'jade-worker', astroVersion: ASTRO_VERSION }));
    return;
  }
  response.writeHead(404);
  response.end();
}).listen(port, () => {
  console.warn(`jade-worker listening on :${port}`);
});
