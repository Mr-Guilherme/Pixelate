#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../../..");
const samplePath = path.join(
  workspaceRoot,
  "tests",
  "fixtures",
  "smoke-image.png",
);
const outputDir = path.join(workspaceRoot, "output", "playwright");
const docsDir = path.join(workspaceRoot, "docs");
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function drawRectangle(params) {
  const overlayCanvas = params.page.locator("canvas").last();
  await overlayCanvas.waitFor();
  const box = await overlayCanvas.boundingBox();

  if (!box) {
    throw new Error("Overlay canvas is not visible.");
  }

  await params.page.mouse.move(
    box.x + box.width * params.startX,
    box.y + box.height * params.startY,
  );
  await params.page.mouse.down();
  await params.page.mouse.move(
    box.x + box.width * params.endX,
    box.y + box.height * params.endY,
  );
  await params.page.mouse.up();
}

async function run() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByText("Import an image to start censoring").waitFor();

  await page
    .getByRole("button", { name: "Import image area" })
    .locator('input[type="file"]')
    .setInputFiles(samplePath);

  await page.getByText("Redaction Settings").waitFor();

  await page.getByRole("button", { name: "Rectangle" }).click();
  await page.waitForTimeout(200);

  await drawRectangle({
    page,
    startX: 0.18,
    startY: 0.24,
    endX: 0.44,
    endY: 0.52,
  });

  await page.getByTestId("blur-intensity-input").fill("82");
  await page.keyboard.press("Enter");

  await drawRectangle({
    page,
    startX: 0.56,
    startY: 0.28,
    endX: 0.82,
    endY: 0.58,
  });

  const objectCount = await page.getByTestId("object-item").count();

  if (objectCount < 2) {
    throw new Error(
      `Expected at least 2 redaction objects, got ${objectCount}.`,
    );
  }

  const selectedCount = await page
    .locator('[data-testid="object-item"][data-selected="true"]')
    .count();

  if (selectedCount !== 1) {
    throw new Error(
      `Expected exactly 1 active selection, got ${selectedCount}.`,
    );
  }

  const firstSelected = await page
    .locator('[data-testid="object-item"]')
    .first()
    .getAttribute("data-selected");

  if (firstSelected !== "true") {
    throw new Error("Expected latest object to be the active selection.");
  }

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  const exportPath = path.join(outputDir, "smoke-export.png");
  await download.saveAs(exportPath);

  await page.screenshot({
    path: path.join(outputDir, "smoke-editor.png"),
    fullPage: true,
  });

  await page.screenshot({
    path: path.join(docsDir, "image-redactor-ux.png"),
    fullPage: true,
  });

  await context.close();
  await browser.close();

  process.stdout.write(`Smoke check passed. Export: ${exportPath}\n`);
}

run().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
