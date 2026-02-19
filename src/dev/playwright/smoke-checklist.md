# Playwright Smoke Checklist

1. Open app on `http://localhost:3000`.
2. Load wide fixture image.
3. Draw redaction rectangles near all four corners.
4. Export PNG and validate edge redactions are aligned between preview and export.
5. Reload and repeat with tall fixture image.
6. Confirm preview/export alignment checks pass and a download is triggered.
