import {
  DEFAULT_PREFERENCES,
  STORAGE_KEY_PREFERENCES,
} from "@/features/editor/lib/defaults";
import {
  clampPixelateBlockSize,
  getPixelateBlockSizeBounds,
} from "@/features/editor/lib/pixelate";
import type {
  PreferencesV1,
  StyleMode,
  StyleParams,
  ToolType,
} from "@/features/editor/types/editor.types";

function isValidTool(tool: unknown): tool is ToolType {
  return ["select", "rect", "ellipse", "line", "freehand"].includes(
    String(tool),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function readNumber(value: unknown): number | null {
  const normalized = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeRounded(params: {
  value: unknown;
  min: number;
  max: number;
  fallback: number;
}): number {
  const parsed = readNumber(params.value);

  if (parsed === null) {
    return params.fallback;
  }

  return clamp(Math.round(parsed), params.min, params.max);
}

function normalizeDecimal(params: {
  value: unknown;
  min: number;
  max: number;
  fallback: number;
}): number {
  const parsed = readNumber(params.value);

  if (parsed === null) {
    return params.fallback;
  }

  return clamp(parsed, params.min, params.max);
}

function normalizeMode(mode: unknown): StyleMode {
  if (mode === "pixelate") {
    return "pixelate";
  }

  if (mode === "mark") {
    return "mark";
  }

  if (mode === "fill" || mode === "solid") {
    return "fill";
  }

  return DEFAULT_PREFERENCES.defaultStyle.mode;
}

function normalizeStyle(style: unknown): StyleParams {
  const defaults = DEFAULT_PREFERENCES.defaultStyle;
  const candidate =
    style && typeof style === "object"
      ? (style as Partial<StyleParams>)
      : ({} as Partial<StyleParams>);
  const pixelate =
    candidate.pixelate && typeof candidate.pixelate === "object"
      ? candidate.pixelate
      : defaults.pixelate;
  const fill =
    candidate.fill && typeof candidate.fill === "object"
      ? candidate.fill
      : defaults.fill;
  const markup =
    candidate.markup && typeof candidate.markup === "object"
      ? candidate.markup
      : defaults.markup;
  const bounds = getPixelateBlockSizeBounds();

  return {
    mode: normalizeMode(candidate.mode),
    pixelate: {
      blockSize: clamp(
        clampPixelateBlockSize(
          normalizeRounded({
            value: pixelate.blockSize,
            min: bounds.min,
            max: bounds.max,
            fallback: defaults.pixelate.blockSize,
          }),
        ),
        bounds.min,
        bounds.max,
      ),
      alpha: normalizeDecimal({
        value: pixelate.alpha,
        min: 0.1,
        max: 1,
        fallback: defaults.pixelate.alpha,
      }),
    },
    fill: {
      color: isHexColor(fill.color) ? fill.color : defaults.fill.color,
    },
    markup: {
      strokeColor: isHexColor(markup.strokeColor)
        ? markup.strokeColor
        : defaults.markup.strokeColor,
      strokeWidth: normalizeRounded({
        value: markup.strokeWidth,
        min: 1,
        max: 128,
        fallback: defaults.markup.strokeWidth,
      }),
    },
    lineWidth: normalizeRounded({
      value: candidate.lineWidth,
      min: 1,
      max: 200,
      fallback: defaults.lineWidth,
    }),
  };
}

function toPreferences(raw: unknown): PreferencesV1 {
  if (!raw || typeof raw !== "object") {
    return {
      version: 1,
      defaultTool: DEFAULT_PREFERENCES.defaultTool,
      defaultStyle: normalizeStyle(DEFAULT_PREFERENCES.defaultStyle),
    };
  }

  const candidate = raw as Partial<PreferencesV1>;

  return {
    version: 1,
    defaultTool: isValidTool(candidate.defaultTool)
      ? candidate.defaultTool
      : DEFAULT_PREFERENCES.defaultTool,
    defaultStyle: normalizeStyle(candidate.defaultStyle),
  };
}

export function loadPreferences(): PreferencesV1 {
  if (typeof window === "undefined") {
    return toPreferences(DEFAULT_PREFERENCES);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY_PREFERENCES);

  if (!raw) {
    return toPreferences(DEFAULT_PREFERENCES);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return toPreferences(parsed);
  } catch {
    return toPreferences(DEFAULT_PREFERENCES);
  }
}

export function savePreferences(preferences: PreferencesV1): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PreferencesV1 = {
    version: 1,
    defaultTool: isValidTool(preferences.defaultTool)
      ? preferences.defaultTool
      : DEFAULT_PREFERENCES.defaultTool,
    defaultStyle: normalizeStyle(preferences.defaultStyle),
  };

  window.localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(payload));
}
