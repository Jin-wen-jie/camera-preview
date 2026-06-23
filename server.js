import http from 'node:http';
import { execFile } from 'node:child_process';
import { createReadStream, writeFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const preferredPort = Number(process.env.PORT) || 5173;
const shouldOpenBrowser = process.argv.includes('--open');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8']
]);

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${preferredPort}`);
  const pathname = decodeURIComponent(url.pathname);
  const target = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.normalize(path.join(root, target));

  if (!resolved.startsWith(root)) {
    return null;
  }

  return resolved;
}

const server = http.createServer(async (request, response) => {
  const filePath = resolveRequestPath(request.url);

  if (!filePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(filePath)) || 'application/octet-stream'
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

function openBrowser(url) {
  if (!shouldOpenBrowser) return;

  if (process.platform === 'win32') {
    execFile('cmd', ['/c', 'start', '', url], { windowsHide: true });
    return;
  }

  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  execFile(command, [url]);
}

function listen(port, attempts = 0) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempts < 20) {
      listen(port + 1, attempts + 1);
      return;
    }
    throw error;
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    writeFileSync(
      path.join(root, '.camera-server.json'),
      JSON.stringify({ pid: process.pid, port, url }, null, 2)
    );
    console.log(`Camera preview running at ${url}`);
    openBrowser(url);
  });
}

listen(preferredPort);
