"use client";

import { PaintBucket, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type {
  RedactionMode,
  StyleParams,
} from "@/features/editor/types/editor.types";
import { cn } from "@/lib/utils";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function intensityToBlockSize(intensity: number): number {
  return Math.round(2 + (clamp(intensity, 0, 100) / 100) * 126);
}

function blockSizeToIntensity(blockSize: number): number {
  return Math.round(((clamp(blockSize, 2, 128) - 2) / 126) * 100);
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
  onChange: (value: number) => void;
}

function PrecisionControl(params: PrecisionControlProps): React.JSX.Element {
  const updateValue = (next: number) => {
    params.onChange(clamp(next, params.min, params.max));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={params.inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          {params.label}
        </Label>
        <span className="rounded-md border border-border px-2 py-1 text-xs font-medium">
          {params.value}
          {params.suffix}
        </span>
      </div>

      <Slider
        min={params.min}
        max={params.max}
        step={params.step}
        value={[params.value]}
        className="px-1"
        onValueChange={([value]) => updateValue(value)}
      />

      <div className="grid grid-cols-[repeat(4,40px)_1fr] items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10"
          onClick={() => updateValue(params.value - params.coarseStep)}
        >
          -{params.coarseStep}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10"
          onClick={() => updateValue(params.value - params.step)}
        >
          -{params.step}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10"
          onClick={() => updateValue(params.value + params.step)}
        >
          +{params.step}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10"
          onClick={() => updateValue(params.value + params.coarseStep)}
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
          value={params.value}
          className="h-10"
          onChange={(event) => {
            const next = Number(event.target.value);

            if (Number.isNaN(next)) {
              return;
            }

            updateValue(next);
          }}
        />
      </div>
    </div>
  );
}

export function SettingsPanel(params: {
  style: StyleParams;
  hasSelection: boolean;
  onStyleChange: (style: StyleParams) => void;
  onApplySelectionStyle: () => void;
}): React.JSX.Element {
  const blurIntensity = blockSizeToIntensity(params.style.pixelate.blockSize);

  const setMode = (mode: RedactionMode) => {
    params.onStyleChange({
      ...params.style,
      mode,
    });
  };

  const setBlurIntensity = (value: number) => {
    params.onStyleChange({
      ...params.style,
      pixelate: {
        ...params.style.pixelate,
        blockSize: intensityToBlockSize(value),
      },
    });
  };

  const setOpacity = (value: number) => {
    params.onStyleChange({
      ...params.style,
      pixelate: {
        ...params.style.pixelate,
        alpha: value / 100,
      },
    });
  };

  const setLineWidth = (value: number) => {
    params.onStyleChange({
      ...params.style,
      lineWidth: value,
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Redaction Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/20 p-1">
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-10",
              params.style.mode === "pixelate" &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            onClick={() => setMode("pixelate")}
          >
            Pixelate
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-10",
              params.style.mode === "fill" &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            onClick={() => setMode("fill")}
          >
            Solid Fill
          </Button>
        </div>

        {params.style.mode === "pixelate" ? (
          <>
            <PrecisionControl
              label="Blur Intensity"
              value={blurIntensity}
              min={0}
              max={100}
              step={1}
              coarseStep={10}
              suffix=""
              inputId="blur-intensity-input"
              onChange={setBlurIntensity}
            />
            <PrecisionControl
              label="Opacity"
              value={Math.round(params.style.pixelate.alpha * 100)}
              min={10}
              max={100}
              step={1}
              coarseStep={10}
              suffix="%"
              inputId="blur-opacity-input"
              onChange={setOpacity}
            />
          </>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Fill Color
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={params.style.fill.color}
                className="h-11 w-20 cursor-pointer"
                onChange={(event) => {
                  params.onStyleChange({
                    ...params.style,
                    fill: {
                      color: event.target.value,
                    },
                  });
                }}
              />
              <Input
                type="text"
                value={params.style.fill.color}
                className="h-11 font-mono"
                onChange={(event) => {
                  params.onStyleChange({
                    ...params.style,
                    fill: {
                      color: event.target.value,
                    },
                  });
                }}
              />
            </div>
          </div>
        )}

        <PrecisionControl
          label="Line Width"
          value={params.style.lineWidth}
          min={1}
          max={128}
          step={1}
          coarseStep={8}
          suffix="px"
          inputId="line-width-input"
          onChange={setLineWidth}
        />

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
          Shortcut: Ctrl/Cmd+Enter applies current filter to selected objects
        </div>
      </CardContent>
    </Card>
  );
}
