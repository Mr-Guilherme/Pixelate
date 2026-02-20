"use client";

import { PaintBucket, Puzzle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  blockSizeToIntensity,
  intensityToBlockSize,
} from "@/features/editor/lib/pixelate";
import type {
  ModeTab,
  StyleMode,
  StyleParams,
} from "@/features/editor/types/editor.types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toModeTab(mode: StyleMode): ModeTab {
  if (mode === "fill") {
    return "solid";
  }

  if (mode === "pixelate" || mode === "mark") {
    return mode;
  }

  return "pixelate";
}

function toStyleMode(modeTab: ModeTab): StyleMode {
  if (modeTab === "solid") {
    return "fill";
  }

  return modeTab;
}

function isModeTab(value: string): value is ModeTab {
  return value === "pixelate" || value === "solid" || value === "mark";
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

interface PrecisionControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  coarseStep: number;
  suffix: string;
  inputId: string;
  onPreviewChange: (value: number) => void;
  onCommit: (value: number) => void;
}

function PrecisionControl(params: PrecisionControlProps): React.JSX.Element {
  const [draftValue, setDraftValue] = useState(params.value);
  const draftValueRef = useRef(draftValue);
  const isDraggingRef = useRef(false);
  const lastCommittedRef = useRef(params.value);

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }

    setDraftValue(params.value);
    draftValueRef.current = params.value;
    lastCommittedRef.current = params.value;
  }, [params.value]);

  const normalize = useCallback(
    (next: number) => clamp(next, params.min, params.max),
    [params.max, params.min],
  );

  const previewValue = useCallback(
    (next: number) => {
      const normalized = normalize(next);
      setDraftValue(normalized);
      draftValueRef.current = normalized;
      params.onPreviewChange(normalized);
    },
    [normalize, params.onPreviewChange],
  );

  const commitValue = useCallback(
    (next: number) => {
      const normalized = normalize(next);

      if (normalized === lastCommittedRef.current) {
        setDraftValue(normalized);
        draftValueRef.current = normalized;
        return;
      }

      lastCommittedRef.current = normalized;
      setDraftValue(normalized);
      draftValueRef.current = normalized;
      params.onCommit(normalized);
    },
    [normalize, params.onCommit],
  );

  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={params.inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          {params.label}
        </Label>
        <span className="rounded-md border border-border px-2 py-1 text-xs font-medium">
          {draftValue}
          {params.suffix}
        </span>
      </div>

      <Slider
        min={params.min}
        max={params.max}
        step={params.step}
        value={[draftValue]}
        className="px-1"
        onPointerDownCapture={() => {
          isDraggingRef.current = true;
        }}
        onPointerUpCapture={() => {
          if (!isDraggingRef.current) {
            return;
          }

          isDraggingRef.current = false;
          commitValue(draftValueRef.current);
        }}
        onPointerCancel={() => {
          if (!isDraggingRef.current) {
            return;
          }

          isDraggingRef.current = false;
          commitValue(draftValueRef.current);
        }}
        onValueChange={([value]) => {
          previewValue(value);
        }}
        onValueCommit={([value]) => {
          if (isDraggingRef.current) {
            return;
          }

          commitValue(value);
        }}
      />

      <div className="grid grid-cols-[repeat(4,40px)_1fr] items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10"
          onClick={() => {
            commitValue(draftValue - params.coarseStep);
          }}
        >
          -{params.coarseStep}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10"
          onClick={() => {
            commitValue(draftValue - params.step);
          }}
        >
          -{params.step}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10"
          onClick={() => {
            commitValue(draftValue + params.step);
          }}
        >
          +{params.step}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10"
          onClick={() => {
            commitValue(draftValue + params.coarseStep);
          }}
        >
          +{params.coarseStep}
        </Button>
        <Input
          id={params.inputId}
          data-testid={params.inputId}
          type="number"
          min={params.min}
          max={params.max}
          step={params.step}
          value={draftValue}
          className="h-10"
          onChange={(event) => {
            const next = Number(event.target.value);

            if (Number.isNaN(next)) {
              return;
            }

            previewValue(next);
          }}
          onBlur={() => {
            isDraggingRef.current = false;
            commitValue(draftValue);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            isDraggingRef.current = false;
            commitValue(draftValue);
          }}
        />
      </div>
    </div>
  );
}

function ColorControl(params: {
  label: string;
  value: string;
  onPreviewChange: (value: string) => void;
  onCommit: (value: string) => void;
}): React.JSX.Element {
  const [draftValue, setDraftValue] = useState(params.value);

  useEffect(() => {
    setDraftValue(params.value);
  }, [params.value]);

  const previewValue = (next: string) => {
    setDraftValue(next);

    if (!isHexColor(next)) {
      return;
    }

    params.onPreviewChange(next);
  };

  const commitValue = (next: string) => {
    const normalized = isHexColor(next) ? next : params.value;
    setDraftValue(normalized);
    params.onCommit(normalized);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">
        {params.label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={draftValue}
          className="h-11 w-20 cursor-pointer"
          onInput={(event) => {
            previewValue(event.currentTarget.value);
          }}
          onChange={(event) => {
            commitValue(event.target.value);
          }}
        />
        <Input
          type="text"
          value={draftValue}
          className="h-11 font-mono"
          onChange={(event) => {
            previewValue(event.target.value);
          }}
          onBlur={(event) => {
            commitValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            commitValue((event.target as HTMLInputElement).value);
          }}
        />
      </div>
    </div>
  );
}

export function SettingsPanel(params: {
  style: StyleParams;
  hasSelection: boolean;
  onStylePreviewChange: (style: StyleParams) => void;
  onStyleChange: (style: StyleParams) => void;
  onApplySelectionStyle: () => void;
}): React.JSX.Element {
  const [draftStyle, setDraftStyle] = useState(params.style);
  const draftStyleRef = useRef(draftStyle);
  const frameRef = useRef<number | null>(null);
  const queuedStyleRef = useRef<StyleParams | null>(null);

  useEffect(() => {
    draftStyleRef.current = params.style;
    setDraftStyle(params.style);
  }, [params.style]);

  useEffect(() => {
    return () => {
      if (frameRef.current === null) {
        return;
      }

      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const schedulePreview = useCallback(
    (style: StyleParams) => {
      queuedStyleRef.current = style;

      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const queued = queuedStyleRef.current;

        if (!queued) {
          return;
        }

        params.onStylePreviewChange(queued);
      });
    },
    [params.onStylePreviewChange],
  );

  const updateDraft = useCallback(
    (updater: (current: StyleParams) => StyleParams) => {
      const next = updater(draftStyleRef.current);
      draftStyleRef.current = next;
      setDraftStyle(next);
      schedulePreview(next);
      return next;
    },
    [schedulePreview],
  );

  const commitDraft = useCallback(
    (updater: (current: StyleParams) => StyleParams) => {
      const next = updater(draftStyleRef.current);
      draftStyleRef.current = next;
      setDraftStyle(next);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      queuedStyleRef.current = next;
      params.onStylePreviewChange(next);
      params.onStyleChange(next);
    },
    [params.onStyleChange, params.onStylePreviewChange],
  );

  const modeTab = toModeTab(draftStyle.mode);
  const blurIntensity = blockSizeToIntensity(draftStyle.pixelate.blockSize);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Redaction Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs
          value={modeTab}
          onValueChange={(value) => {
            if (!isModeTab(value)) {
              return;
            }

            commitDraft((current) => ({
              ...current,
              mode: toStyleMode(value),
            }));
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-lg border border-border bg-muted/20 p-1">
            <TabsTrigger
              value="pixelate"
              className="h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90"
            >
              Pixelate
            </TabsTrigger>
            <TabsTrigger
              value="solid"
              className="h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90"
            >
              Solid Fill
            </TabsTrigger>
            <TabsTrigger
              value="mark"
              className="h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90"
            >
              Mark
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {modeTab === "pixelate" ? (
          <>
            <PrecisionControl
              label="Pixelation Strength"
              value={blurIntensity}
              min={0}
              max={100}
              step={1}
              coarseStep={10}
              suffix="%"
              inputId="blur-intensity-input"
              onPreviewChange={(value) => {
                updateDraft((current) => ({
                  ...current,
                  pixelate: {
                    ...current.pixelate,
                    blockSize: intensityToBlockSize(value),
                  },
                }));
              }}
              onCommit={(value) => {
                commitDraft((current) => ({
                  ...current,
                  pixelate: {
                    ...current.pixelate,
                    blockSize: intensityToBlockSize(value),
                  },
                }));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Block size: {draftStyle.pixelate.blockSize}px
            </p>
            <PrecisionControl
              label="Opacity"
              value={Math.round(draftStyle.pixelate.alpha * 100)}
              min={10}
              max={100}
              step={1}
              coarseStep={10}
              suffix="%"
              inputId="blur-opacity-input"
              onPreviewChange={(value) => {
                updateDraft((current) => ({
                  ...current,
                  pixelate: {
                    ...current.pixelate,
                    alpha: value / 100,
                  },
                }));
              }}
              onCommit={(value) => {
                commitDraft((current) => ({
                  ...current,
                  pixelate: {
                    ...current.pixelate,
                    alpha: value / 100,
                  },
                }));
              }}
            />
          </>
        ) : null}

        {modeTab === "solid" ? (
          <ColorControl
            label="Fill Color"
            value={draftStyle.fill.color}
            onPreviewChange={(value) => {
              updateDraft((current) => ({
                ...current,
                fill: {
                  color: value,
                },
              }));
            }}
            onCommit={(value) => {
              commitDraft((current) => ({
                ...current,
                fill: {
                  color: value,
                },
              }));
            }}
          />
        ) : null}

        {modeTab === "mark" ? (
          <>
            <ColorControl
              label="Stroke Color"
              value={draftStyle.markup.strokeColor}
              onPreviewChange={(value) => {
                updateDraft((current) => ({
                  ...current,
                  markup: {
                    ...current.markup,
                    strokeColor: value,
                  },
                }));
              }}
              onCommit={(value) => {
                commitDraft((current) => ({
                  ...current,
                  markup: {
                    ...current.markup,
                    strokeColor: value,
                  },
                }));
              }}
            />
            <PrecisionControl
              label="Stroke Width"
              value={draftStyle.markup.strokeWidth}
              min={1}
              max={128}
              step={1}
              coarseStep={8}
              suffix="px"
              inputId="mark-stroke-width-input"
              onPreviewChange={(value) => {
                updateDraft((current) => ({
                  ...current,
                  markup: {
                    ...current.markup,
                    strokeWidth: value,
                  },
                }));
              }}
              onCommit={(value) => {
                commitDraft((current) => ({
                  ...current,
                  markup: {
                    ...current.markup,
                    strokeWidth: value,
                  },
                }));
              }}
            />
          </>
        ) : (
          <PrecisionControl
            label="Line Width"
            value={draftStyle.lineWidth}
            min={1}
            max={128}
            step={1}
            coarseStep={8}
            suffix="px"
            inputId="line-width-input"
            onPreviewChange={(value) => {
              updateDraft((current) => ({
                ...current,
                lineWidth: value,
              }));
            }}
            onCommit={(value) => {
              commitDraft((current) => ({
                ...current,
                lineWidth: value,
              }));
            }}
          />
        )}

        <Button
          type="button"
          className="h-11 w-full gap-2"
          variant="secondary"
          onClick={params.onApplySelectionStyle}
          disabled={!params.hasSelection}
        >
          <PaintBucket className="size-4" />
          Update Selected Objects
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Puzzle className="size-3" />
          Shortcut: Ctrl/Cmd+Enter applies current settings to selected objects
        </div>
      </CardContent>
    </Card>
  );
}
