import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface DatePreset {
  label: string;
  days: number;
}

interface DateRangePresetsProps {
  presets: DatePreset[];
  activePreset: number | null;
  onPresetClick: (days: number) => void;
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
  className,
  buttonClassName,
  fontSize = "sm",
  buttonHeight = "md",
  gap = "normal",
}: DateRangePresetsProps) {
  return (
    <div className={cn("flex flex-col justify-between", gapClasses[gap], className)}>
      {presets.map((preset) => (
        <Button
          key={preset.days}
          variant={activePreset === preset.days ? "default" : "outline"}
          size="sm"
          onClick={() => onPresetClick(preset.days)}
          className={cn(
            fontSizeClasses[fontSize],
            buttonHeightClasses[buttonHeight],
            "px-3 min-w-[70px]",
            activePreset === preset.days && "bg-primary text-primary-foreground",
            buttonClassName
          )}
          data-testid={`button-preset-${preset.days}`}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
