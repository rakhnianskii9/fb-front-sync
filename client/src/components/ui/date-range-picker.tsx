import { useState, useEffect } from "react";
import { format } from "date-fns/format";
import { subDays } from "date-fns/subDays";
import { differenceInDays } from "date-fns/differenceInDays";
import { enUS } from "date-fns/locale/en-US";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { DateRangePresets, type DatePreset } from "@/components/ui/date-range-presets";

interface DateRangePickerProps {
  periodA?: DateRange;
  periodB?: DateRange;
  compareEnabled?: boolean;
  showColor?: boolean;
  alignment?: string;
  showOnlySelected?: boolean;
  onChange?: (data: {
    periodA?: DateRange;
    periodB?: DateRange;
    compareEnabled: boolean;
    showColor: boolean;
    alignment: string;
    showOnlySelected: boolean;
  }) => void;
  className?: string;
}

export function DateRangePicker({
  periodA: initialPeriodA,
  periodB: initialPeriodB,
  compareEnabled: initialCompareEnabled = false,
  showColor: initialShowColor = false,
  alignment: initialAlignment = "previous",
  showOnlySelected: initialShowOnlySelected = true,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  
  // Default period - last 30 days (Report-First Sync Architecture)
  const getDefaultPeriod = () => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = subDays(end, 29);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: end };
  };

  const [mode, setMode] = useState<"single" | "compare">(initialCompareEnabled ? "compare" : "single");
  // ВАЖНО: tempPeriodB = ТЕКУЩИЙ период (periodA из props), tempPeriodA = ПРОШЛЫЙ период (periodB из props)
  // Это потому что handleApply делает: periodA = tempPeriodB, periodB = tempPeriodA
  const [tempPeriodB, setTempPeriodB] = useState<DateRange | undefined>(initialPeriodA || getDefaultPeriod());
  const [tempPeriodA, setTempPeriodA] = useState<DateRange | undefined>(initialPeriodB);
  const [alignmentEnabled, setAlignmentEnabled] = useState(initialAlignment === "by-week");
  const [showOnlySelectedEnabled, setShowOnlySelectedEnabled] = useState(initialShowOnlySelected);
  const [monthB, setMonthB] = useState<Date>(initialPeriodA?.to || new Date());
  const [monthA, setMonthA] = useState<Date>(initialPeriodB?.from || new Date());

  useEffect(() => {
    if (open) {
      const isCompareMode = initialCompareEnabled;
      setMode(isCompareMode ? "compare" : "single");
      const defaultPeriod = getDefaultPeriod();
      
      // ВАЖНО: periodA (props) = ТЕКУЩИЙ период, periodB (props) = ПРОШЛЫЙ период
      // tempPeriodB = ТЕКУЩИЙ период, tempPeriodA = ПРОШЛЫЙ период
      if (isCompareMode) {
        setTempPeriodB(initialPeriodA || defaultPeriod);  // ТЕКУЩИЙ
        setTempPeriodA(initialPeriodB);  // ПРОШЛЫЙ
        setMonthB(initialPeriodA?.to || new Date());
        setMonthA(initialPeriodB?.from || new Date());
      } else {
        // Single mode: use periodA as the displayed period
        setTempPeriodB(initialPeriodA || defaultPeriod);
        setTempPeriodA(undefined);
        setMonthB(initialPeriodA?.to || new Date());
        setMonthA(new Date());
      }
      
      setAlignmentEnabled(initialAlignment === "by-week");
      setShowOnlySelectedEnabled(initialShowOnlySelected);
    }
  }, [open, initialPeriodA, initialPeriodB, initialCompareEnabled, initialAlignment, initialShowOnlySelected]);

  useEffect(() => {
    // Recalculate period A ONLY when alignment is enabled
    if (mode === "compare" && alignmentEnabled && tempPeriodB?.from && tempPeriodB?.to) {
      const periodLength = differenceInDays(tempPeriodB.to, tempPeriodB.from) + 1;
      
      // Align by weeks: subtract multiple of full weeks to match day of week
      const weeks = Math.ceil(periodLength / 7);
      const daysToSubtract = weeks * 7;
      const aStart = subDays(tempPeriodB.from, daysToSubtract);
      const aEnd = subDays(tempPeriodB.to, daysToSubtract);
      
      setTempPeriodA({ from: aStart, to: aEnd });
      setMonthA(aEnd);
    }
    // When alignment is disabled, period A is set manually by user
  }, [alignmentEnabled, mode, tempPeriodB]);

  const presets: DatePreset[] = [
    { label: "3d", days: 3 },
    { label: "7d", days: 7 },
    { label: "14d", days: 14 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "180d", days: 180 },
    { label: "360d", days: 360 },
  ];

  // Determine active preset
  const getActivePreset = () => {
    if (!tempPeriodB?.from || !tempPeriodB?.to) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodEnd = new Date(tempPeriodB.to);
    periodEnd.setHours(0, 0, 0, 0);
    
    // Check if period ends today
    if (periodEnd.getTime() !== today.getTime()) return null;
    
    const periodLength = differenceInDays(tempPeriodB.to, tempPeriodB.from) + 1;
    
    // Find preset with this number of days
    const matchingPreset = presets.find(p => p.days === periodLength);
    return matchingPreset?.days || null;
  };

  const activePreset = getActivePreset();

  const handlePresetClick = (days: number) => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = subDays(end, days - 1);
    start.setHours(0, 0, 0, 0);
    const range = { from: start, to: end };
    setTempPeriodB(range);
    setMonthB(end);
    
    // В режиме сравнения Period A = непрерывный период той же длины ПЕРЕД Period B
    // Это гарантирует одинаковую длину обоих периодов
    if (mode === "compare") {
      // Period A заканчивается за день до начала Period B
      const aEnd = subDays(start, 1);
      aEnd.setHours(0, 0, 0, 0);
      // Period A имеет ту же длину что и Period B
      const aStart = subDays(aEnd, days - 1);
      aStart.setHours(0, 0, 0, 0);
      
      setTempPeriodA({ from: aStart, to: aEnd });
      setMonthA(aEnd);
    }
    
    // Don't close popup - let user see the selection and press Apply
  };

  const handlePeriodBChange = (range: DateRange | undefined) => {
    if (!range) {
      setTempPeriodB(undefined);
      return;
    }
    
    // If user clicks on a date that's already selected or within the range,
    // reset and start a new range from that date
    if (tempPeriodB?.from && tempPeriodB?.to && range.from && !range.to) {
      const clickedDate = range.from.getTime();
      const rangeStart = tempPeriodB.from.getTime();
      const rangeEnd = tempPeriodB.to.getTime();
      
      if (clickedDate >= rangeStart && clickedDate <= rangeEnd) {
        // User clicked within existing range, start fresh
        setTempPeriodB({ from: range.from, to: undefined });
        setMonthB(range.from);
        return;
      }
    }
    
    setTempPeriodB(range);
    if (range?.to) {
      setMonthB(range.to);
    }
  };

  const handlePeriodAChange = (range: DateRange | undefined) => {
    if (!range) {
      setTempPeriodA(undefined);
      return;
    }
    
    // If user clicks on a date that's already selected or within the range,
    // reset and start a new range from that date
    if (tempPeriodA?.from && tempPeriodA?.to && range.from && !range.to) {
      const clickedDate = range.from.getTime();
      const rangeStart = tempPeriodA.from.getTime();
      const rangeEnd = tempPeriodA.to.getTime();
      
      if (clickedDate >= rangeStart && clickedDate <= rangeEnd) {
        // User clicked within existing range, start fresh
        setTempPeriodA({ from: range.from, to: undefined });
        setMonthA(range.from);
        return;
      }
    }
    
    setTempPeriodA(range);
    if (range?.from) {
      setMonthA(range.from);
    }
  };

  const handleApply = () => {
    const isComparing = mode === "compare";
    // ИСПРАВЛЕНО: Period A = ТЕКУЩИЙ период (tempPeriodB), Period B = ПРОШЛЫЙ период (tempPeriodA)
    // Это соответствует ожиданиям пользователя: A = то что анализируем, B = для сравнения
    onChange?.({
      periodA: tempPeriodB,  // ТЕКУЩИЙ период (последние N дней)
      periodB: isComparing ? tempPeriodA : undefined,  // ПРОШЛЫЙ период (N дней до текущего)
      compareEnabled: isComparing,
      showColor: false,
      alignment: alignmentEnabled ? "by-week" : "previous",
      showOnlySelected: showOnlySelectedEnabled,
    });
    setOpen(false);
  };

  const handleClear = () => {
    // Clear dates only, keep calendar open and mode unchanged
    setTempPeriodB(undefined);
    setTempPeriodA(undefined);
  };

  const formatDateRange = (range?: DateRange) => {
    if (!range?.from) return "";
    
    if (!range.to || range.from.getTime() === range.to.getTime()) {
      return format(range.from, "d MMM yyyy", { locale: enUS });
    }
    
    if (range.from.getFullYear() === range.to.getFullYear()) {
      return `${format(range.from, "d MMM", { locale: enUS })} — ${format(range.to, "d MMM yyyy", { locale: enUS })}`;
    }
    
    return `${format(range.from, "d MMM yyyy", { locale: enUS })} — ${format(range.to, "d MMM yyyy", { locale: enUS })}`;
  };

  const getButtonText = () => {
    if (!initialCompareEnabled) {
      // Single period mode - use periodA
      if (!initialPeriodA?.from) {
        return "Period";
      }
      return formatDateRange(initialPeriodA);
    }

    // Compare mode - show both periods
    if (!initialPeriodA?.from || !initialPeriodB?.from) {
      return "Period";
    }

    return (
      <div className="flex items-center gap-2">
        <span>B: {formatDateRange(initialPeriodB)}</span>
        <span className="text-muted-foreground">·</span>
        <span>A: {formatDateRange(initialPeriodA)}</span>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal h-10",
            !initialPeriodB && "text-muted-foreground",
            className
          )}
          data-testid="button-date-range-picker"
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          {getButtonText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-5 bg-background" align="start" side="bottom">
        <div className="flex flex-col gap-4">
          {/* Mode selection */}
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "single" | "compare")} className="flex items-center gap-6 justify-start w-full">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="mode-single" />
              <Label htmlFor="mode-single" className="font-normal cursor-pointer text-sm">
                Single period
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="compare" id="mode-compare" />
              <Label htmlFor="mode-compare" className="font-normal cursor-pointer text-sm">
                Compare periods
              </Label>
            </div>
          </RadioGroup>

          {/* Calendar and presets */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 w-full">
              {mode === "single" && (
                <div className="space-y-2">
                  <Calendar
                    mode="range"
                    month={monthB}
                    onMonthChange={setMonthB}
                    selected={tempPeriodB}
                    onSelect={handlePeriodBChange}
                    numberOfMonths={1}
                    fixedWeeks
                    locale={enUS}
                    className={cn("p-0 w-fit", "period-b")}
                    disabled={{ after: new Date() }}
                  />
                </div>
              )}

              {mode === "compare" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Calendar
                      mode="range"
                      month={monthA}
                      onMonthChange={setMonthA}
                      selected={tempPeriodA}
                      onSelect={handlePeriodAChange}
                      numberOfMonths={1}
                      fixedWeeks
                      locale={enUS}
                      className={cn("p-0 w-fit", "period-a")}
                      disabled={{ after: new Date() }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Calendar
                      mode="range"
                      month={monthB}
                      onMonthChange={setMonthB}
                      selected={tempPeriodB}
                      onSelect={handlePeriodBChange}
                      numberOfMonths={1}
                      fixedWeeks
                      locale={enUS}
                      className={cn("p-0 w-fit", "period-b")}
                      disabled={{ after: new Date() }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 min-w-[70px]">
              {presets.map((preset) => (
                <Button
                  key={preset.days}
                  variant={activePreset === preset.days ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetClick(preset.days)}
                  className={cn(
                    "text-sm h-8 px-3",
                    activePreset === preset.days && "bg-primary text-primary-foreground"
                  )}
                  data-testid={`button-preset-${preset.days}`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Show only selected toggle */}
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <Label className="text-sm font-normal">Show only selected rows in charts</Label>
            <Switch
              checked={showOnlySelectedEnabled}
              onCheckedChange={setShowOnlySelectedEnabled}
              data-testid="switch-show-only-selected"
            />
          </div>

          {/* Alignment and buttons */}
          {mode === "compare" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-normal">Align periods</Label>
                <Switch
                  checked={alignmentEnabled}
                  onCheckedChange={setAlignmentEnabled}
                  data-testid="switch-alignment"
                />
                <span className="text-sm text-muted-foreground">By day of week</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  size="sm"
                  className="h-9"
                  data-testid="button-clear"
                >
                  Clear
                </Button>
                <Button
                  onClick={handleApply}
                  size="sm"
                  className="h-9"
                  data-testid="button-apply"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Buttons for single mode */}
          {mode === "single" && (
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleClear}
                size="sm"
                className="h-9"
                data-testid="button-clear"
              >
                Clear
              </Button>
              <Button
                onClick={handleApply}
                size="sm"
                className="h-9"
                data-testid="button-apply"
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
