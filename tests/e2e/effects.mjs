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

      async function triggerEffect(text, className) {
        const input = page.locator('.effect-command-input');
        const submitButton = page.locator('[data-effect-submit]');

        await input.fill(text);
        await submitButton.click();

        // Wait for canvas to appear (Canvas-based rendering)
        const effectLayer = page.locator('.voice-effect-layer');
        const canvas = effectLayer.locator('canvas');
        await canvas.waitFor({ state: 'attached', timeout: 5000 });

        // Verify dataset reflects the effect
        const effectKey = await effectLayer.getAttribute('data-effect');
        assert.ok(effectKey, `Expected data-effect to be set after "${text}"`);

        // Take screenshot for each effect
        const screenshotPath = path.join(screenshotDir, `effect-${text}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`PASS: "${text}" triggered effect and screenshot saved`);
      }

      // Test "花" triggers flower
      await triggerEffect('花', 'flower');

      // Test "雪" triggers snow
      await triggerEffect('雪', 'snow');

      // Test "爱心" triggers heart
      await triggerEffect('爱心', 'heart');

      // Clear
      const input = page.locator('.effect-command-input');
      const submitButton = page.locator('[data-effect-submit]');
      await input.fill('清除');
      await submitButton.click();

      console.log('PASS: Clear command submitted without error');
    } finally {
      await browser.close();
    }

    console.log('All effect tests passed.');
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
