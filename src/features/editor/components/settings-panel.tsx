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

interface RangeControlProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}

function RangeControl(params: RangeControlProps): React.JSX.Element {
  const increase = () => {
    params.onChange(clamp(params.value + params.step, params.min, params.max));
  };

  const decrease = () => {
    params.onChange(clamp(params.value - params.step, params.min, params.max));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">
        {params.label}
      </Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={decrease}
        >
          -
        </Button>
        <Slider
          min={params.min}
          max={params.max}
          step={params.step}
          value={[params.value]}
          className="flex-1 px-2"
          onValueChange={([value]) => params.onChange(value)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={increase}
        >
          +
        </Button>
      </div>
      <Input
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

          params.onChange(clamp(next, params.min, params.max));
        }}
      />
      <p className="text-xs text-muted-foreground">
        Current: {params.value}
        {params.suffix}
      </p>
    </div>
  );
}

export function SettingsPanel(params: {
  style: StyleParams;
  hasSelection: boolean;
  onStyleChange: (style: StyleParams) => void;
  onApplySelectionStyle: () => void;
}): React.JSX.Element {
  const setMode = (mode: RedactionMode) => {
    params.onStyleChange({
      ...params.style,
      mode,
    });
  };

  const setBlockSize = (value: number) => {
    params.onStyleChange({
      ...params.style,
      pixelate: {
        ...params.style.pixelate,
        blockSize: value,
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
            <RangeControl
              label="Intensity (block size)"
              min={2}
              max={96}
              step={1}
              value={params.style.pixelate.blockSize}
              suffix="px"
              onChange={setBlockSize}
            />
            <RangeControl
              label="Opacity"
              min={10}
              max={100}
              step={1}
              value={Math.round(params.style.pixelate.alpha * 100)}
              suffix="%"
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

        <RangeControl
          label="Line Width"
          min={1}
          max={128}
          step={1}
          value={params.style.lineWidth}
          suffix="px"
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
