import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '../../dist');
const TMP = resolve(__dirname, '.tmp');

let context: BrowserContext;
let extensionId: string;
let samplePdfPath: string;

async function makeSamplePdf(path: string) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i++) {
    const page = doc.addPage([420, 595]);
    page.drawText(`UnlimitedPDF test page ${i + 1}`, { x: 40, y: 520, size: 20, font, color: rgb(0.1, 0.1, 0.1) });
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, await doc.save());
}

test.beforeAll(async () => {
  test.setTimeout(120_000);
  if (!existsSync(DIST)) throw new Error('dist/ not found. Run `npm run build` before the e2e tests.');
  samplePdfPath = resolve(TMP, 'sample.pdf');
  await makeSamplePdf(samplePdfPath);

  const userDataDir = mkdtempSync(resolve(tmpdir(), 'unlimitedpdf-e2e-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
    ],
  });

  // MV3 service workers are lazy; poll for it, then fall back to waiting.
  let sw = context.serviceWorkers()[0];
  for (let i = 0; i < 20 && !sw; i++) {
    await new Promise((r) => setTimeout(r, 500));
    sw = context.serviceWorkers()[0];
  }
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 30_000 });
  extensionId = new URL(sw.url()).host;
});

test.afterAll(async () => {
  await context?.close();
});

test('popup renders the launcher and shipped tools', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
  await expect(page.locator('.popup-title')).toContainText('Unlimited');
  await expect(page.getByText('Open PDF or files')).toBeVisible();
  await expect(page.getByText('Merge PDFs')).toBeVisible();
  await expect(page.getByText('Files are not uploaded.')).toBeVisible();
  await page.close();
});

test('workspace opens, loads a PDF and renders page thumbnails locally', async () => {
  const page = await context.newPage();

  // Fail the test if any non-local network request is made during the flow.
  const external: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!/^(chrome-extension|data|blob):/i.test(url)) external.push(url);
  });

  await page.goto(`chrome-extension://${extensionId}/workspace/index.html`);
  await expect(page.getByRole('heading', { name: /Open a PDF/i })).toBeVisible();

  await page.locator('input[type=file]').setInputFiles(samplePdfPath);

  // The pdf.js pipeline must render three page cards with a canvas each.
  await expect(page.locator('.pagecard')).toHaveCount(3, { timeout: 20_000 });
  const firstCanvas = page.locator('.pagecard canvas').first();
  await expect(firstCanvas).toBeVisible();
  const box = await firstCanvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(0);

  expect(external, `unexpected external requests: ${external.join(', ')}`).toHaveLength(0);
  await page.close();
});

test('organize → apply produces a downloadable result offline', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/workspace/index.html`);
  await page.locator('input[type=file]').setInputFiles(samplePdfPath);
  await expect(page.locator('.pagecard')).toHaveCount(3, { timeout: 20_000 });

  // Rotate all pages, then apply & save.
  await page.getByRole('button', { name: /^Right$/ }).click();
  await page.getByRole('button', { name: /Apply changes/i }).click();

  // The result modal reports success with an output file.
  await expect(page.getByText(/Organized PDF/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/original file untouched/i)).toBeVisible();
  await page.close();
});
