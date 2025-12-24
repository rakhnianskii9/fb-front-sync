import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export interface DatePreset {
  label: string;
  days: number;
}

interface DateRangePresetsProps {
  presets: DatePreset[];
  activePreset: number | null;
  onPresetClick: (days: number) => void;
  /** Number of days currently loaded in the report */
  loadedDays?: number;
  /** Whether sync is currently in progress */
  isSyncing?: boolean;
  /** Which preset (days) is currently extending/loading */
  syncingPresetDays?: number | null;
  className?: string;
  buttonClassName?: string;
  fontSize?: "xs" | "sm" | "base" | "lg";
  buttonHeight?: "sm" | "md" | "lg";
  gap?: "tight" | "normal" | "relaxed";
}

const fontSizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const buttonHeightClasses = {
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
};

const gapClasses = {
  tight: "gap-1",
  normal: "gap-2",
  relaxed: "gap-3",
};

export function DateRangePresets({
  presets,
  activePreset,
  onPresetClick,
  loadedDays,
  isSyncing = false,
  syncingPresetDays = null,
  className,
  buttonClassName,
  fontSize = "sm",
  buttonHeight = "md",
  gap = "normal",
}: DateRangePresetsProps) {
  return (
    <div className={cn("flex flex-col justify-between", gapClasses[gap], className)}>
      {presets.map((preset) => {
        // Check if this preset requires data extension
        const needsExtend = loadedDays !== undefined && preset.days > loadedDays;
        const isDisabled = isSyncing && needsExtend;
        const shouldSpin = Boolean(isSyncing && needsExtend && syncingPresetDays === preset.days);
        
        return (
          <Button
            key={preset.days}
            variant={activePreset === preset.days ? "default" : "outline"}
            size="sm"
            onClick={() => onPresetClick(preset.days)}
            disabled={isDisabled}
            className={cn(
              fontSizeClasses[fontSize],
              buttonHeightClasses[buttonHeight],
              "px-3 min-w-[70px] relative",
              activePreset === preset.days && "bg-primary text-primary-foreground",
              needsExtend && !isDisabled && "border-dashed",
              buttonClassName
            )}
            data-testid={`button-preset-${preset.days}`}
          >
            <span className="flex items-center gap-1">
              {preset.label}
              {needsExtend && (
                <RefreshCw className={cn(
                  "w-3 h-3",
                  shouldSpin && "animate-spin"
                )} />
              )}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
