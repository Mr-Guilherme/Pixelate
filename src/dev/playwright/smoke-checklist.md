# Playwright Smoke Checklist

1. Open app on `http://localhost:3000`.
2. Import image using file picker input.
3. Draw first rectangle redaction and verify it applies on pointer release.
4. Change blur intensity in `Blur Intensity` control.
5. Draw second rectangle redaction.
6. Verify two objects exist and only one active selection remains (latest object).
7. Click `Export PNG` and verify download trigger.
