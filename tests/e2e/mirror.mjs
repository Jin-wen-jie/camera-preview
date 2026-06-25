import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const screenshotDir = path.join(__dirname, 'screenshots');
const serverScript = path.join(root, 'server.js');

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function getRandomPort() {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });

  const port = await getRandomPort();
  const serverUrl = `http://127.0.0.1:${port}`;

  console.log(`Starting server on port ${port}...`);
  const serverProcess = spawn('node', [serverScript], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverExitCode = null;
  serverProcess.on('exit', (code) => { serverExitCode = code; });

  try {
    await waitForServer(serverUrl);
    console.log('Server is ready.');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    try {
      await page.goto(serverUrl, { waitUntil: 'networkidle' });

      // Mirror toggle exists
      const mirrorToggle = page.locator('.mirror-toggle');
      await mirrorToggle.waitFor({ state: 'visible', timeout: 5000 });
      assert.ok(await mirrorToggle.isVisible(), '.mirror-toggle should be visible');
      console.log('PASS: .mirror-toggle exists and is visible');

      // Get the video element
      const video = page.locator('[data-camera-preview]');

      // Initial: no mirrored
      let mirrored = await video.getAttribute('data-mirrored');
      assert.equal(mirrored, null, 'data-mirrored should be absent initially');
      console.log('PASS: Initially data-mirrored is absent');

      // First click: set mirrored
      await mirrorToggle.click();
      await page.waitForTimeout(100);
      mirrored = await video.getAttribute('data-mirrored');
      assert.equal(mirrored, 'true', `Expected data-mirrored="true", got "${mirrored}"`);
      console.log('PASS: After click, data-mirrored="true"');

      await page.screenshot({ path: path.join(screenshotDir, 'mirror-on.png'), fullPage: true });

      // Second click: remove
      await mirrorToggle.click();
      await page.waitForTimeout(100);
      mirrored = await video.getAttribute('data-mirrored');
      assert.equal(mirrored, null, `Expected data-mirrored removed, got "${mirrored}"`);
      console.log('PASS: After second click, data-mirrored removed');

      await page.screenshot({ path: path.join(screenshotDir, 'mirror-off.png'), fullPage: true });
    } finally {
      await browser.close();
    }

    console.log('All mirror toggle tests passed.');
  } finally {
    if (serverExitCode === null) {
      serverProcess.kill();
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
