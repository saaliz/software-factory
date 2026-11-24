#!/usr/bin/env node
// The factory's project and product management viewer: one Node server, a static page, no packages.
// It only reads. GET /api/projects lists the projects; GET /api/projects/<id> reads that project's files.
//
//   node pm/server.mjs                      (PM_CONFIG, PORT, HOST and PM_USE_MOUNTS change the defaults)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, readProject } from './read.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
const HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
};

export function createServer({ config = process.env.PM_CONFIG ?? path.join(HERE, 'projects.json'), useMounts = process.env.PM_USE_MOUNTS === '1' } = {}) {
  const projects = () => loadConfig(config, { useMounts });
  const send = (res, code, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(code, { ...HEADERS, 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'read only' });
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/healthz') return send(res, 200, { ok: true });
      if (url.pathname === '/api/projects') return send(res, 200, projects().map(({ id, name }) => ({ id, name })));
      const m = url.pathname.match(/^\/api\/projects\/([a-z0-9-]+)$/);
      if (m) {
        const p = projects().find((x) => x.id === m[1]);
        return p ? send(res, 200, readProject(p)) : send(res, 404, { error: 'no such project' });
      }
      const file = path.join(PUBLIC, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
      if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'not found' });
      return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] ?? 'application/octet-stream');
    } catch (e) {
      return send(res, 500, { error: String(e.message).slice(0, 300) });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 5190);
  const host = process.env.HOST ?? '127.0.0.1';
  createServer().listen(port, host, () => console.log(`factory pm on http://${host}:${port}`));
}
