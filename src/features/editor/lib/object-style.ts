import type {
  ObjectKind,
  RedactionObject,
  StyleMode,
  StyleParams,
} from "@/features/editor/types/editor.types";

export function modeToObjectKind(mode: StyleMode): ObjectKind {
  if (mode === "mark") {
    return "markup";
  }

  return "redaction";
}

export function getStyleLineWidth(style: StyleParams): number {
  if (style.mode === "mark") {
    return style.markup.strokeWidth;
  }

  return style.lineWidth;
}

export function getObjectStrokeWidth(object: RedactionObject): number {
  if (object.shape.type === "line") {
    return object.shape.data.width;
  }

  if (object.kind === "markup") {
    return object.style.markup.strokeWidth;
  }

  return object.style.lineWidth;
}
