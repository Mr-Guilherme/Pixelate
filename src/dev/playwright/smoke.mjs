#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../../..");
const outputDir = path.join(workspaceRoot, "output", "playwright");
const docsDir = path.join(workspaceRoot, "docs");
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const CASES = [
  {
    name: "wide",
    file: path.join(workspaceRoot, "tests", "fixtures", "wide-image.png"),
    width: 1200,
    height: 600,
  },
  {
    name: "tall",
    file: path.join(workspaceRoot, "tests", "fixtures", "tall-image.png"),
    width: 600,
    height: 1200,
  },
];

const EDGE_RECTS = [
  {
    name: "top-left",
    start: { x: 0.01, y: 0.01 },
    end: { x: 0.2, y: 0.2 },
  },
  {
    name: "top-right",
    start: { x: 0.8, y: 0.01 },
    end: { x: 0.99, y: 0.2 },
  },
  {
    name: "bottom-left",
    start: { x: 0.01, y: 0.8 },
    end: { x: 0.2, y: 0.99 },
  },
  {
    name: "bottom-right",
    start: { x: 0.8, y: 0.8 },
    end: { x: 0.99, y: 0.99 },
  },
];

function toScreenPoint(bounds, normalizedPoint) {
  return {
    x: bounds.left + normalizedPoint.x * bounds.width,
    y: bounds.top + normalizedPoint.y * bounds.height,
  };
}

function toMidPoint(edgeRect) {
  return {
    x: (edgeRect.start.x + edgeRect.end.x) / 2,
    y: (edgeRect.start.y + edgeRect.end.y) / 2,
  };
}

function isMagentaPixel(pixel) {
  const [r, g, b, a] = pixel;
  return r > 170 && b > 170 && g < 130 && a > 120;
}

function assertMagenta(pixel, contextLabel) {
  if (isMagentaPixel(pixel)) {
    return;
  }

  throw new Error(
    `${contextLabel} expected magenta-ish pixel, got [${pixel.join(", ")}].`,
  );
}

function computeContainBounds(params) {
  const scale = Math.min(
    params.canvasRect.width / params.imageWidth,
    params.canvasRect.height / params.imageHeight,
  );
  const width = params.imageWidth * scale;
  const height = params.imageHeight * scale;

  return {
    left: params.canvasRect.left + (params.canvasRect.width - width) / 2,
    top: params.canvasRect.top + (params.canvasRect.height - height) / 2,
    width,
    height,
  };
}

async function getBaseCanvasMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.querySelectorAll("canvas")[0];

    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Base preview canvas not found.");
    }

    const rect = canvas.getBoundingClientRect();

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function drawRectInBounds(params) {
  const start = toScreenPoint(params.bounds, params.start);
  const end = toScreenPoint(params.bounds, params.end);

  await params.page.mouse.move(start.x, start.y);
  await params.page.mouse.down();
  await params.page.mouse.move(end.x, end.y, { steps: 12 });
  await params.page.mouse.up();
}

async function samplePreviewPixel(params) {
  return params.page.evaluate(
    ({ imageBounds, samplePoint }) => {
      const canvas = document.querySelectorAll("canvas")[0];

      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Base preview canvas not found.");
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        throw new Error("Preview context unavailable.");
      }

      const rect = canvas.getBoundingClientRect();
      const dprX = canvas.width / rect.width;
      const dprY = canvas.height / rect.height;
      const cssX = imageBounds.left + samplePoint.x * imageBounds.width;
      const cssY = imageBounds.top + samplePoint.y * imageBounds.height;
      const canvasX = Math.min(
        canvas.width - 1,
        Math.max(0, Math.round((cssX - rect.left) * dprX)),
      );
      const canvasY = Math.min(
        canvas.height - 1,
        Math.max(0, Math.round((cssY - rect.top) * dprY)),
      );

      return Array.from(ctx.getImageData(canvasX, canvasY, 1, 1).data);
    },
    {
      imageBounds: params.imageBounds,
      samplePoint: params.samplePoint,
    },
  );
}

async function sampleExportPixel(page, exportPath, samplePoint) {
  const raw = await readFile(exportPath);
  const base64 = raw.toString("base64");

  return page.evaluate(
    async ({ base64, samplePoint }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        throw new Error("Export sampling context unavailable.");
      }

      ctx.drawImage(image, 0, 0, image.width, image.height);
      const x = Math.min(
        canvas.width - 1,
        Math.max(0, Math.round(samplePoint.x * (canvas.width - 1))),
      );
      const y = Math.min(
        canvas.height - 1,
        Math.max(0, Math.round(samplePoint.y * (canvas.height - 1))),
      );

      return Array.from(ctx.getImageData(x, y, 1, 1).data);
    },
    { base64, samplePoint },
  );
}

async function runCase(page, testCase, screenshotPath) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByText("Import an image to start censoring").waitFor();

  await page
    .getByRole("button", { name: "Import image area" })
    .locator('input[type="file"]')
    .setInputFiles(testCase.file);

  await page.getByText("Redaction Settings").waitFor();
  await page.getByRole("button", { name: "Solid Fill" }).click();
  await page.locator('input[type="color"]').waitFor();

  const hexInput = page.locator('input[type="text"]').first();
  await hexInput.fill("#ff00ff");
  await hexInput.press("Enter");

  await page.getByRole("button", { name: "Rectangle" }).click();
  const canvasMetrics = await getBaseCanvasMetrics(page);
  const imageBounds = computeContainBounds({
    canvasRect: canvasMetrics,
    imageWidth: testCase.width,
    imageHeight: testCase.height,
  });

  for (const edge of EDGE_RECTS) {
    await drawRectInBounds({
      page,
      bounds: imageBounds,
      start: edge.start,
      end: edge.end,
    });
  }

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  const exportPath = path.join(outputDir, `smoke-export-${testCase.name}.png`);
  await download.saveAs(exportPath);

  for (const edge of EDGE_RECTS) {
    const samplePoint = toMidPoint(edge);
    const previewPixel = await samplePreviewPixel({
      page,
      imageBounds,
      samplePoint,
    });
    const exportPixel = await sampleExportPixel(page, exportPath, samplePoint);

    assertMagenta(previewPixel, `${testCase.name} preview ${edge.name}`);
    assertMagenta(exportPixel, `${testCase.name} export ${edge.name}`);
  }

  if (!screenshotPath) {
    return;
  }

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });
}

async function run() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1600, height: 1400 },
  });
  const page = await context.newPage();

  await runCase(
    page,
    CASES[0],
    path.join(docsDir, "preview-export-alignment.png"),
  );
  await runCase(page, CASES[1]);

  await context.close();
  await browser.close();

  process.stdout.write("Smoke check passed. Preview and export are aligned.\n");
}

run().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
