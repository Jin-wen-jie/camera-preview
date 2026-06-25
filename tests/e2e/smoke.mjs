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
      // server not ready yet
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

      // Check page title
      const title = await page.title();
      assert.ok(
        title.includes('语音花雨'),
        `Expected title to contain "语音花雨", got "${title}"`
      );
      console.log('PASS: Page title contains "语音花雨"');

      // Check key structural elements exist
      const previewFrame = await page.$('.preview-frame');
      assert.ok(previewFrame, '.preview-frame not found');
      console.log('PASS: .preview-frame exists');

      const controlPanel = await page.$('.control-panel');
      assert.ok(controlPanel, '.control-panel not found');
      console.log('PASS: .control-panel exists');

      const effectLayer = await page.$('.voice-effect-layer');
      assert.ok(effectLayer, '.voice-effect-layer not found');
      console.log('PASS: .voice-effect-layer exists');

      // Check mirror toggle button exists
      const mirrorToggle = await page.$('.mirror-toggle');
      assert.ok(mirrorToggle, '.mirror-toggle not found');
      console.log('PASS: .mirror-toggle exists');

      // Take screenshot
      const screenshotPath = path.join(screenshotDir, 'smoke.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to ${screenshotPath}`);
    } finally {
      await browser.close();
    }

    console.log('All smoke tests passed.');
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
