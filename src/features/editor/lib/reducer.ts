import {
  DEFAULT_HISTORY,
  DEFAULT_STYLE,
  DEFAULT_TOOL,
} from "@/features/editor/lib/defaults";
import {
  createHistoryCommand,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/features/editor/lib/history";
import {
  getStyleLineWidth,
  modeToObjectKind,
} from "@/features/editor/lib/object-style";
import type {
  CommandType,
  EditorDocument,
  HistoryState,
  ImageModel,
  RedactionObject,
  ShapeClipboardPayload,
  StyleParams,
  ToolType,
} from "@/features/editor/types/editor.types";

export interface EditorState {
  document: EditorDocument;
  history: HistoryState;
  tool: ToolType;
  style: StyleParams;
  shapeClipboard: ShapeClipboardPayload | null;
  placingIds: string[];
}

export type EditorAction =
  | { type: "setImage"; image: ImageModel }
  | { type: "setTool"; tool: ToolType }
  | { type: "setStyle"; style: StyleParams }
  | { type: "setSelection"; selectedIds: string[] }
  | { type: "setPendingDraft"; draft: RedactionObject | null }
  | { type: "appendObject"; object: RedactionObject }
  | { type: "setObjectsTransient"; objects: RedactionObject[] }
  | {
      type: "commitObjects";
      before: RedactionObject[];
      after: RedactionObject[];
      command: CommandType;
    }
  | { type: "deleteSelected" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "setClipboard"; clipboard: ShapeClipboardPayload | null }
  | { type: "setPlacingIds"; ids: string[] }
  | { type: "clearPlacingIds" }
  | { type: "replaceAll"; objects: RedactionObject[] }
  | { type: "applyStyleToSelection" }
  | { type: "bringSelectionToFront" }
  | { type: "sendSelectionToBack" };

export const initialEditorState: EditorState = {
  document: {
    image: null,
    objects: [],
    selectedIds: [],
    pendingDraft: null,
  },
  history: DEFAULT_HISTORY,
  tool: DEFAULT_TOOL,
  style: DEFAULT_STYLE,
  shapeClipboard: null,
  placingIds: [],
};

function cloneObjects(objects: RedactionObject[]): RedactionObject[] {
  return objects.map((item) => structuredClone(item));
}

function insertObjectWithDefaultLayer(params: {
  objects: RedactionObject[];
  object: RedactionObject;
}): RedactionObject[] {
  const nextObject = structuredClone(params.object);

  if (nextObject.kind === "markup") {
    return [...params.objects, nextObject];
  }

  const markupIndex = params.objects.findIndex(
    (item) => item.kind === "markup",
  );

  if (markupIndex < 0) {
    return [...params.objects, nextObject];
  }

  return [
    ...params.objects.slice(0, markupIndex),
    nextObject,
    ...params.objects.slice(markupIndex),
  ];
}

function reorderSelection(params: {
  objects: RedactionObject[];
  selectedIds: string[];
  position: "front" | "back";
}): RedactionObject[] {
  const selected = new Set(params.selectedIds);
  const selectedObjects = params.objects.filter((item) =>
    selected.has(item.id),
  );

  if (!selectedObjects.length) {
    return params.objects;
  }

  const remainingObjects = params.objects.filter(
    (item) => !selected.has(item.id),
  );

  if (params.position === "front") {
    return [...remainingObjects, ...selectedObjects];
  }

  return [...selectedObjects, ...remainingObjects];
}

function applyStyleToObject(params: {
  object: RedactionObject;
  style: StyleParams;
}): RedactionObject {
  const now = Date.now();
  const kind = modeToObjectKind(params.style.mode);

  if (params.object.shape.type !== "line") {
    return {
      ...params.object,
      kind,
      style: structuredClone(params.style),
      updatedAt: now,
    };
  }

  return {
    ...params.object,
    kind,
    style: structuredClone(params.style),
    shape: {
      type: "line",
      data: {
        ...params.object.shape.data,
        width: Math.max(1, Math.round(getStyleLineWidth(params.style))),
      },
    },
    updatedAt: now,
  };
}

function withHistoryCommand(params: {
  state: EditorState;
  before: RedactionObject[];
  after: RedactionObject[];
  command: CommandType;
  selectedIds?: string[];
}): EditorState {
  const command = createHistoryCommand({
    type: params.command,
    before: params.before,
    after: params.after,
  });

  if (!command) {
    return {
      ...params.state,
      document: {
        ...params.state.document,
        objects: params.after,
        selectedIds: params.selectedIds ?? params.state.document.selectedIds,
      },
    };
  }

  return {
    ...params.state,
    document: {
      ...params.state.document,
      objects: cloneObjects(params.after),
      selectedIds: params.selectedIds ?? params.state.document.selectedIds,
    },
    history: pushHistory({
      history: params.state.history,
      command,
    }),
  };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  if (action.type === "setImage") {
    return {
      ...state,
      document: {
        image: action.image,
        objects: [],
        selectedIds: [],
        pendingDraft: null,
      },
      history: DEFAULT_HISTORY,
      placingIds: [],
    };
  }

  if (action.type === "setTool") {
    const clearSelection = action.tool !== "select";

    return {
      ...state,
      tool: action.tool,
      document: {
        ...state.document,
        pendingDraft: null,
        selectedIds: clearSelection ? [] : state.document.selectedIds,
      },
    };
  }

  if (action.type === "setStyle") {
    return {
      ...state,
      style: action.style,
    };
  }

  if (action.type === "setSelection") {
    return {
      ...state,
      document: {
        ...state.document,
        selectedIds: action.selectedIds,
      },
    };
  }

  if (action.type === "setPendingDraft") {
    return {
      ...state,
      document: {
        ...state.document,
        pendingDraft: action.draft,
      },
    };
  }

  if (action.type === "setObjectsTransient") {
    return {
      ...state,
      document: {
        ...state.document,
        objects: cloneObjects(action.objects),
      },
    };
  }

  if (action.type === "appendObject") {
    const before = cloneObjects(state.document.objects);
    const after = insertObjectWithDefaultLayer({
      objects: before,
      object: action.object,
    });

    return withHistoryCommand({
      state,
      before,
      after,
      command: "add",
      selectedIds: [action.object.id],
    });
  }

  if (action.type === "commitObjects") {
    return withHistoryCommand({
      state,
      before: action.before,
      after: action.after,
      command: action.command,
    });
  }

  if (action.type === "deleteSelected") {
    if (!state.document.selectedIds.length) {
      return state;
    }

    const selected = new Set(state.document.selectedIds);
    const before = cloneObjects(state.document.objects);
    const after = before.filter((item) => !selected.has(item.id));

    return withHistoryCommand({
      state,
      before,
      after,
      command: "delete",
      selectedIds: [],
    });
  }

  if (action.type === "undo") {
    const next = undoHistory({
      history: state.history,
      currentObjects: state.document.objects,
    });

    return {
      ...state,
      history: next.history,
      document: {
        ...state.document,
        objects: next.objects,
        selectedIds: state.document.selectedIds.filter((id) =>
          next.objects.some((item) => item.id === id),
        ),
        pendingDraft: null,
      },
      placingIds: [],
    };
  }

  if (action.type === "redo") {
    const next = redoHistory({
      history: state.history,
      currentObjects: state.document.objects,
    });

    return {
      ...state,
      history: next.history,
      document: {
        ...state.document,
        objects: next.objects,
        selectedIds: state.document.selectedIds.filter((id) =>
          next.objects.some((item) => item.id === id),
        ),
        pendingDraft: null,
      },
      placingIds: [],
    };
  }

  if (action.type === "setClipboard") {
    return {
      ...state,
      shapeClipboard: action.clipboard,
    };
  }

  if (action.type === "setPlacingIds") {
    return {
      ...state,
      placingIds: action.ids,
      document: {
        ...state.document,
        selectedIds: action.ids,
      },
    };
  }

  if (action.type === "clearPlacingIds") {
    return {
      ...state,
      placingIds: [],
    };
  }

  if (action.type === "replaceAll") {
    return {
      ...state,
      document: {
        ...state.document,
        objects: cloneObjects(action.objects),
      },
    };
  }

  if (action.type === "applyStyleToSelection") {
    if (!state.document.selectedIds.length) {
      return state;
    }

    const selected = new Set(state.document.selectedIds);
    const before = cloneObjects(state.document.objects);
    const after = before.map((item) => {
      if (!selected.has(item.id)) {
        return item;
      }

      return applyStyleToObject({
        object: item,
        style: state.style,
      });
    });

    return withHistoryCommand({
      state,
      before,
      after,
      command: "update",
    });
  }

  if (action.type === "bringSelectionToFront") {
    if (!state.document.selectedIds.length) {
      return state;
    }

    const before = cloneObjects(state.document.objects);
    const after = reorderSelection({
      objects: before,
      selectedIds: state.document.selectedIds,
      position: "front",
    });

    return withHistoryCommand({
      state,
      before,
      after,
      command: "update",
    });
  }

  if (action.type === "sendSelectionToBack") {
    if (!state.document.selectedIds.length) {
      return state;
    }

    const before = cloneObjects(state.document.objects);
    const after = reorderSelection({
      objects: before,
      selectedIds: state.document.selectedIds,
      position: "back",
    });

    return withHistoryCommand({
      state,
      before,
      after,
      command: "update",
    });
  }

  return state;
}
