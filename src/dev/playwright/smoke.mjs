#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../../..");
const samplePath = path.join(__dirname, "assets", "sample-image.svg.png");
const outputDir = path.join(workspaceRoot, "output", "playwright");
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const mod = process.platform === "darwin" ? "Meta" : "Control";

async function run() {
  await mkdir(outputDir, { recursive: true });

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

  const overlayCanvas = page.locator("canvas").last();
  await overlayCanvas.waitFor();
  const box = await overlayCanvas.boundingBox();

  if (!box) {
    throw new Error("Overlay canvas is not visible.");
  }

  await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.62);
  await page.mouse.up();

  await page.getByRole("button", { name: "Apply", exact: true }).click();

  await page.keyboard.press(`${mod}+Z`);
  await page.keyboard.press(`${mod}+Y`);
  await page.keyboard.press(`${mod}+C`);
  await page.keyboard.press(`${mod}+V`);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  const exportPath = path.join(outputDir, "smoke-export.png");
  await download.saveAs(exportPath);

  await page.screenshot({
    path: path.join(outputDir, "smoke-editor.png"),
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
