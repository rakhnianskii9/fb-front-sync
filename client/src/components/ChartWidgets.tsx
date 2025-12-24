import { useState, useMemo, useEffect, memo, useRef, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  Brush,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartDataPoint, PieChartDataPoint } from "@/lib/chartDataUtils";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartWarning } from "./ChartWarning";
import { SmartTooltip } from "./SmartTooltip";
import { CustomChartLegend } from "./CustomChartLegend";

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Минимальное количество точек для показа Brush (прокрутки)
const BRUSH_THRESHOLD = 60;
// Размер окна по умолчанию для больших датасетов
const DEFAULT_VIEWPORT_SIZE = 30;

// Format numbers with separators
const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

// Format for tooltip with standard thousands separators
const formatTooltipNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
};

interface BaseChartProps {
  data: ChartDataPoint[];
  metricKeys: string[];
  metricLabels: Record<string, string>;
  showLegend?: boolean;
  showGrid?: boolean;
  showComparison?: boolean;
  warning?: string;
  warningReason?: string;
  // Brush range from Redux - for instant responsiveness
  initialBrushStart?: number;
  initialBrushEnd?: number;
  onBrushChange?: (startIndex: number, endIndex: number) => void;
}

interface PieChartProps {
  data: PieChartDataPoint[];
  showLegend?: boolean;
  warning?: string;
  warningReason?: string;
}

function LineChartWidgetInner({
  data,
  metricKeys,
  metricLabels,
  showLegend = true,
  showGrid = true,
  showComparison = false,
  warning,
  warningReason,
  initialBrushStart,
  initialBrushEnd,
  onBrushChange,
}: BaseChartProps) {
  const [refAreaLeft, setRefAreaLeft] = useState<string>('');
  const [refAreaRight, setRefAreaRight] = useState<string>('');
  const [left, setLeft] = useState<string | number>('dataMin');
  const [right, setRight] = useState<string | number>('dataMax');
  
  // Показывать Brush только для больших датасетов
  const showBrush = data.length > BRUSH_THRESHOLD;
  
  // Инициализация Brush — используем значения из Redux если есть, иначе дефолты
  const getInitialStartIndex = () => {
    if (initialBrushStart !== undefined && initialBrushStart >= 0 && initialBrushStart < data.length) {
      return initialBrushStart;
    }
    return showBrush ? Math.max(0, data.length - DEFAULT_VIEWPORT_SIZE) : 0;
  };
  
  const getInitialEndIndex = () => {
    if (initialBrushEnd !== undefined && initialBrushEnd >= 0 && initialBrushEnd < data.length) {
      return initialBrushEnd;
    }
    return data.length - 1;
  };
  
  const [brushStartIndex, setBrushStartIndex] = useState(getInitialStartIndex);
  const [brushEndIndex, setBrushEndIndex] = useState(getInitialEndIndex);
  
  // Track if user is dragging to prevent data-change resets
  const isDraggingRef = useRef(false);
  const dataLengthRef = useRef(data.length);
  
  // Sync with Redux values when they change (e.g., on report switch)
  useEffect(() => {
    if (initialBrushStart !== undefined && initialBrushEnd !== undefined) {
      if (initialBrushStart >= 0 && initialBrushStart < data.length &&
          initialBrushEnd >= 0 && initialBrushEnd < data.length &&
          !isDraggingRef.current) {
        setBrushStartIndex(initialBrushStart);
        setBrushEndIndex(initialBrushEnd);
      }
    }
  }, [initialBrushStart, initialBrushEnd, data.length]);
  
  // Обновляем при изменении данных, но только если не перетаскиваем
  useEffect(() => {
    // Skip if data length hasn't changed
    if (dataLengthRef.current === data.length) return;
    dataLengthRef.current = data.length;
    
    // Don't reset during drag
    if (isDraggingRef.current) return;
    
    const newEndIndex = data.length - 1;
    const newStartIndex = showBrush 
      ? Math.max(0, data.length - DEFAULT_VIEWPORT_SIZE)
      : 0;
    setBrushStartIndex(newStartIndex);
    setBrushEndIndex(newEndIndex);
  }, [data.length, showBrush]);

  // Мемоизация конфигурации графика
  const chartConfig = useMemo<ChartConfig>(() => {
    return metricKeys.reduce((acc, key, idx) => {
      acc[key] = {
        label: metricLabels[key] || key,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
      if (showComparison) {
        acc[`${key}_prev`] = {
          label: `${metricLabels[key] || key} (Prev.)`,
          color: CHART_COLORS[idx % CHART_COLORS.length],
        };
      }
      return acc;
    }, {} as ChartConfig);
  }, [metricKeys, metricLabels, showComparison]);

  if (data.length === 0 || metricKeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    let [refLeft, refRight] = [refAreaLeft, refAreaRight];
    if (refAreaLeft > refAreaRight) {
      [refLeft, refRight] = [refAreaRight, refAreaLeft];
    }

    setLeft(refLeft);
    setRight(refRight);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const zoomOut = () => {
    setLeft('dataMin');
    setRight('dataMax');
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const viewportSize = brushEndIndex - brushStartIndex;
  
  const handleBrushLeft = useCallback(() => {
    const step = Math.max(1, Math.floor(viewportSize / 5));
    const newStart = Math.max(0, brushStartIndex - step);
    const newEnd = Math.min(newStart + viewportSize, data.length - 1);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
    // Save to Redux for persistence
    onBrushChange?.(newStart, newEnd);
  }, [viewportSize, brushStartIndex, data.length, onBrushChange]);

  const handleBrushRight = useCallback(() => {
    const step = Math.max(1, Math.floor(viewportSize / 5));
    const newEnd = Math.min(data.length - 1, brushEndIndex + step);
    const newStart = Math.max(0, newEnd - viewportSize);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
    // Save to Redux for persistence
    onBrushChange?.(newStart, newEnd);
  }, [viewportSize, brushEndIndex, data.length, onBrushChange]);

  // Throttled brush change handler to prevent excessive re-renders
  const lastBrushUpdateRef = useRef(0);
  const pendingBrushRef = useRef<{startIndex: number, endIndex: number} | null>(null);
  
  const handleBrushChange = useCallback((brushData: any) => {
    if (!brushData || brushData.startIndex === undefined || brushData.endIndex === undefined) {
      isDraggingRef.current = false;
      return;
    }
    
    isDraggingRef.current = true;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastBrushUpdateRef.current;
    
    // Throttle updates to max 60fps (16ms)
    if (timeSinceLastUpdate < 16) {
      pendingBrushRef.current = { startIndex: brushData.startIndex, endIndex: brushData.endIndex };
      return;
    }
    
    lastBrushUpdateRef.current = now;
    pendingBrushRef.current = null;
    
    setBrushStartIndex(brushData.startIndex);
    setBrushEndIndex(brushData.endIndex);
  }, []);
  
  // Apply pending brush update when drag ends and save to Redux
  useEffect(() => {
    const handleMouseUp = () => {
      let finalStart = brushStartIndex;
      let finalEnd = brushEndIndex;
      
      if (pendingBrushRef.current) {
        finalStart = pendingBrushRef.current.startIndex;
        finalEnd = pendingBrushRef.current.endIndex;
        setBrushStartIndex(finalStart);
        setBrushEndIndex(finalEnd);
        pendingBrushRef.current = null;
      }
      
      // Save final position to Redux when drag ends
      if (isDraggingRef.current) {
        onBrushChange?.(finalStart, finalEnd);
      }
      
      // Delay clearing isDragging to prevent immediate data-change reset
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [brushStartIndex, brushEndIndex, onBrushChange]);

  return (
    <div className="h-full w-full min-h-[16rem] relative flex flex-col">
      {warning && <ChartWarning message={warning} reason={warningReason} />}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
          data={data} 
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          onMouseDown={(e: any) => e && e.activeLabel && setRefAreaLeft(e.activeLabel)}
          onMouseMove={(e: any) => refAreaLeft && e && e.activeLabel && setRefAreaRight(e.activeLabel)}
          onMouseUp={zoom}
          onDoubleClick={zoomOut}
        >
          {showGrid && <CartesianGrid strokeDasharray="2 2" stroke="#999999" opacity={1} syncWithTicks={true} />}
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickMargin={8}
            minTickGap={50}
            interval="preserveStartEnd"
            domain={[left, right]}
            allowDataOverflow
            type="category"
          />
          <YAxis 
            tickFormatter={formatNumber}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickMargin={8}
            tickCount={15}
            width={50}
            interval={0}
          />
          <Tooltip 
            cursor={{ stroke: 'hsl(0, 84%, 60%)', strokeWidth: 3 }}
            content={(props) => <SmartTooltip {...props} formatNumber={formatTooltipNumber} />}
          />
          {metricKeys.map((key, idx) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={3}
              dot={false}
              activeDot={{ fill: 'hsl(0, 84%, 60%)', r: 6 }}
              name={metricLabels[key] || key}
              isAnimationActive={false}
            />
          ))}
          {showComparison && metricKeys.map((key, idx) => (
            <Line
              key={`${key}_prev`}
              type="monotone"
              dataKey={`${key}_prev`}
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ fill: 'hsl(0, 84%, 60%)', r: 6 }}
              name={`${metricLabels[key] || key} (Prev.)`}
              isAnimationActive={false}
            />
          ))}
          {refAreaLeft && refAreaRight && (
            <ReferenceArea
              x1={refAreaLeft}
              x2={refAreaRight}
              strokeOpacity={0.3}
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
            />
          )}
          {showBrush && (
            <Brush
              dataKey="date"
              height={20}
              stroke="hsl(var(--border))"
              fill="hsl(var(--muted)/60)"
              travellerWidth={10}
              tickFormatter={(value) => value}
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
              onChange={handleBrushChange}
            />
          )}
        </LineChart>
        </ResponsiveContainer>
      </div>
      {showBrush && data.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-2 mt-1">
          <button
            onClick={handleBrushLeft}
            disabled={brushStartIndex === 0}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            data-testid="brush-left"
            title="Scroll left"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 12L6 8l4-4v8z"/>
            </svg>
          </button>
          <button
            onClick={handleBrushRight}
            disabled={brushEndIndex >= data.length - 1}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            data-testid="brush-right"
            title="Scroll right"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4V4z"/>
            </svg>
          </button>
        </div>
      )}
      {showLegend && (
        <CustomChartLegend 
          metricKeys={metricKeys}
          metricLabels={metricLabels}
          showComparison={showComparison}
        />
      )}
    </div>
  );
}

export const LineChartWidget = memo(LineChartWidgetInner);

function BarChartWidgetInner({
  data,
  metricKeys,
  metricLabels,
  showLegend = true,
  showGrid = true,
  showComparison = false,
  warning,
  warningReason,
}: BaseChartProps) {
  // Показывать Brush только для больших датасетов (> 60 точек)
  const showBrush = data.length > BRUSH_THRESHOLD;
  const viewportSize = Math.min(DEFAULT_VIEWPORT_SIZE, data.length);
  
  // Brush navigation state - для больших датасетов показываем последние N точек
  const [brushStartIndex, setBrushStartIndex] = useState(() => 
    showBrush ? Math.max(0, data.length - viewportSize) : 0
  );
  const [brushEndIndex, setBrushEndIndex] = useState(data.length - 1);
  
  // Сбрасываем индексы при изменении данных
  useEffect(() => {
    if (showBrush) {
      setBrushStartIndex(Math.max(0, data.length - viewportSize));
      setBrushEndIndex(data.length - 1);
    } else {
      setBrushStartIndex(0);
      setBrushEndIndex(data.length - 1);
    }
  }, [data.length, showBrush, viewportSize]);

  const handleBrushLeft = () => {
    const step = Math.max(1, Math.floor(viewportSize / 5));
    const newStart = Math.max(0, brushStartIndex - step);
    const newEnd = Math.max(viewportSize - 1, brushEndIndex - step);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  };

  const handleBrushRight = () => {
    const step = Math.max(1, Math.floor(viewportSize / 5));
    const newStart = Math.min(data.length - viewportSize, brushStartIndex + step);
    const newEnd = Math.min(data.length - 1, brushEndIndex + step);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  };

  const handleBrushChange = (brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      setBrushStartIndex(brushData.startIndex);
      setBrushEndIndex(brushData.endIndex);
    }
  };

  // Мемоизация конфигурации графика
  const chartConfig = useMemo<ChartConfig>(() => {
    return metricKeys.reduce((acc, key, idx) => {
      acc[key] = {
        label: metricLabels[key] || key,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
      if (showComparison) {
        acc[`${key}_prev`] = {
          label: `${metricLabels[key] || key} (Prev.)`,
          color: CHART_COLORS[idx % CHART_COLORS.length],
        };
      }
      return acc;
    }, {} as ChartConfig);
  }, [metricKeys, metricLabels, showComparison]);

  if (data.length === 0 || metricKeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[16rem] relative flex flex-col">
      {warning && <ChartWarning message={warning} reason={warningReason} />}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="2 2" stroke="#999999" opacity={1} syncWithTicks={true} />}
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickMargin={8}
            minTickGap={50}
            interval="preserveStartEnd"
          />
          <YAxis 
            tickFormatter={formatNumber}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickMargin={8}
            tickCount={15}
            width={50}
            interval={0}
          />
          <Tooltip 
            cursor={{ stroke: 'hsl(0, 84%, 60%)', strokeWidth: 3 }}
            content={(props) => <SmartTooltip {...props} formatNumber={formatTooltipNumber} />}
          />
          {metricKeys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              fill={CHART_COLORS[idx % CHART_COLORS.length]}
              name={metricLabels[key] || key}
              isAnimationActive={false}
            />
          ))}
          {showComparison && metricKeys.map((key, idx) => (
            <Bar
              key={`${key}_prev`}
              dataKey={`${key}_prev`}
              fill={CHART_COLORS[idx % CHART_COLORS.length]}
              fillOpacity={0.5}
              name={`${metricLabels[key] || key} (Prev.)`}
              isAnimationActive={false}
            />
          ))}
          {showBrush && (
            <Brush
              dataKey="date"
              height={20}
              stroke="hsl(var(--border))"
              fill="hsl(var(--muted)/60)"
              travellerWidth={10}
              tickFormatter={(value) => value}
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
              onChange={handleBrushChange}
            />
          )}
        </BarChart>
        </ResponsiveContainer>
      </div>
      {showBrush && data.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-2 mt-1">
          <button
            onClick={handleBrushLeft}
            disabled={brushStartIndex === 0}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            data-testid="brush-left"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 12L6 8l4-4v8z"/>
            </svg>
          </button>
          <button
            onClick={handleBrushRight}
            disabled={brushEndIndex >= data.length - 1}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            data-testid="brush-right"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4V4z"/>
            </svg>
          </button>
        </div>
      )}
      {showLegend && (
        <CustomChartLegend 
          metricKeys={metricKeys}
          metricLabels={metricLabels}
          showComparison={showComparison}
        />
      )}
    </div>
  );
}

export const BarChartWidget = memo(BarChartWidgetInner);

function AreaChartWidgetInner({
  data,
  metricKeys,
  metricLabels,
  showLegend = true,
  showGrid = true,
  showComparison = false,
  warning,
  warningReason,
}: BaseChartProps) {
  // Показывать Brush только для больших датасетов (> 60 точек)
  const showBrush = data.length > BRUSH_THRESHOLD;
  const viewportSize = Math.min(DEFAULT_VIEWPORT_SIZE, data.length);
  
  // Brush navigation state - для больших датасетов показываем последние N точек
  const [brushStartIndex, setBrushStartIndex] = useState(() => 
    showBrush ? Math.max(0, data.length - viewportSize) : 0
  );
  const [brushEndIndex, setBrushEndIndex] = useState(data.length - 1);
  
  // Сбрасываем индексы при изменении данных
  useEffect(() => {
    if (showBrush) {
      setBrushStartIndex(Math.max(0, data.length - viewportSize));
      setBrushEndIndex(data.length - 1);
    } else {
      setBrushStartIndex(0);
      setBrushEndIndex(data.length - 1);
    }
  }, [data.length, showBrush, viewportSize]);

  const handleBrushLeft = () => {
    const step = Math.max(1, Math.floor(viewportSize / 5));
    const newStart = Math.max(0, brushStartIndex - step);
    const newEnd = Math.max(viewportSize - 1, brushEndIndex - step);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  };

  const handleBrushRight = () => {
    const step = Math.max(1, Math.floor(viewportSize / 5));
    const newStart = Math.min(data.length - viewportSize, brushStartIndex + step);
    const newEnd = Math.min(data.length - 1, brushEndIndex + step);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  };

  const handleBrushChange = (brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      setBrushStartIndex(brushData.startIndex);
      setBrushEndIndex(brushData.endIndex);
    }
  };

  // Мемоизация конфигурации графика
  const chartConfig = useMemo<ChartConfig>(() => {
    return metricKeys.reduce((acc, key, idx) => {
      acc[key] = {
        label: metricLabels[key] || key,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
      if (showComparison) {
        acc[`${key}_prev`] = {
          label: `${metricLabels[key] || key} (Prev.)`,
          color: CHART_COLORS[idx % CHART_COLORS.length],
        };
      }
      return acc;
    }, {} as ChartConfig);
  }, [metricKeys, metricLabels, showComparison]);

  if (data.length === 0 || metricKeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[16rem] relative flex flex-col">
      {warning && <ChartWarning message={warning} reason={warningReason} />}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="2 2" stroke="#999999" opacity={1} syncWithTicks={true} />}
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickMargin={8}
            minTickGap={50}
            interval="preserveStartEnd"
          />
          <YAxis 
            tickFormatter={formatNumber}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickMargin={8}
            tickCount={15}
            width={50}
            interval={0}
          />
          <Tooltip 
            cursor={{ stroke: 'hsl(0, 84%, 60%)', strokeWidth: 3 }}
            content={(props) => <SmartTooltip {...props} formatNumber={formatTooltipNumber} />}
          />
          {metricKeys.map((key, idx) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={2}
              fill={CHART_COLORS[idx % CHART_COLORS.length]}
              fillOpacity={0.6}
              activeDot={{ fill: 'hsl(0, 84%, 60%)', r: 6 }}
              name={metricLabels[key] || key}
              isAnimationActive={false}
            />
          ))}
          {showComparison && metricKeys.map((key, idx) => (
            <Area
              key={`${key}_prev`}
              type="monotone"
              dataKey={`${key}_prev`}
              stackId="2"
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={2}
              fill={CHART_COLORS[idx % CHART_COLORS.length]}
              fillOpacity={0.3}
              strokeDasharray="5 5"
              activeDot={{ fill: 'hsl(0, 84%, 60%)', r: 6 }}
              name={`${metricLabels[key] || key} (Prev.)`}
              isAnimationActive={false}
            />
          ))}
          {showBrush && (
            <Brush
              dataKey="date"
              height={20}
              stroke="hsl(var(--border))"
              fill="hsl(var(--muted)/60)"
              travellerWidth={10}
              tickFormatter={(value) => value}
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
              onChange={handleBrushChange}
            />
          )}
        </AreaChart>
        </ResponsiveContainer>
      </div>
      {showBrush && data.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-2 mt-1">
          <button
            onClick={handleBrushLeft}
            disabled={brushStartIndex === 0}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            data-testid="brush-left"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 12L6 8l4-4v8z"/>
            </svg>
          </button>
          <button
            onClick={handleBrushRight}
            disabled={brushEndIndex >= data.length - 1}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            data-testid="brush-right"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4V4z"/>
            </svg>
          </button>
        </div>
      )}
      {showLegend && (
        <CustomChartLegend 
          metricKeys={metricKeys}
          metricLabels={metricLabels}
          showComparison={showComparison}
        />
      )}
    </div>
  );
}

export const AreaChartWidget = memo(AreaChartWidgetInner);

function PieChartWidgetInner({ data, showLegend = true, warning, warningReason }: PieChartProps) {
  const chartConfig = useMemo<ChartConfig>(() => {
    return data.reduce((acc, item, idx) => {
      acc[item.name] = {
        label: item.name,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {warning && <ChartWarning message={warning} reason={warningReason} />}
      <ChartContainer config={chartConfig} className="h-full w-full">
        <PieChart>
          <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;
            const data = payload[0].payload;
            return (
              <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                    {data.name}
                  </span>
                  <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {data.value.toFixed(0)} ({data.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          }}
        />
        {showLegend && <Legend align="left" />}
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={(props) => {
            const percent = props.percent as number | undefined;
            return percent !== undefined ? `${(percent * 100).toFixed(1)}%` : '';
          }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
      </PieChart>
      </ChartContainer>
    </div>
  );
}

export const PieChartWidget = memo(PieChartWidgetInner);

interface MixedChartProps {
  data: ChartDataPoint[];
  lineMetrics: string[];
  barMetrics: string[];
  metricLabels: Record<string, string>;
  showLegend?: boolean;
  showGrid?: boolean;
  showComparison?: boolean;
  warning?: string;
  warningReason?: string;
}

function MixedChartWidgetInner({
  data,
  lineMetrics,
  barMetrics,
  metricLabels,
  showLegend = true,
  showGrid = true,
  showComparison = false,
  warning,
  warningReason,
}: MixedChartProps) {
  // Показывать Brush только для больших датасетов (> 60 точек)
  const showBrush = data.length > BRUSH_THRESHOLD;
  const viewportSize = Math.min(DEFAULT_VIEWPORT_SIZE, data.length);
  
  // Brush navigation state - для больших датасетов показываем последние N точек
  const [brushStartIndex, setBrushStartIndex] = useState(() => 
    showBrush ? Math.max(0, data.length - viewportSize) : 0
  );
  const [brushEndIndex, setBrushEndIndex] = useState(data.length - 1);
  
  // Сбрасываем индексы при изменении данных
  useEffect(() => {
    if (showBrush) {
      setBrushStartIndex(Math.max(0, data.length - viewportSize));
      setBrushEndIndex(data.length - 1);
    } else {
      setBrushStartIndex(0);
      setBrushEndIndex(data.length - 1);
    }
  }, [data.length, showBrush, viewportSize]);

  const handleBrushLeft = () => {
    const step = Math.max(1, Math.floor(viewportSize / 5));
    const newStart = Math.max(0, brushStartIndex - step);
    const newEnd = Math.max(viewportSize - 1, brushEndIndex - step);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  };

  const handleBrushRight = () => {
    const step = Math.max(1, Math.floor(viewportSize / 5));
    const newStart = Math.min(data.length - viewportSize, brushStartIndex + step);
    const newEnd = Math.min(data.length - 1, brushEndIndex + step);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  };

  const handleBrushChange = (brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      setBrushStartIndex(brushData.startIndex);
      setBrushEndIndex(brushData.endIndex);
    }
  };

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    
    barMetrics.forEach((key, idx) => {
      config[key] = {
        label: metricLabels[key] || key,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
      if (showComparison) {
        config[`${key}_prev`] = {
          label: `${metricLabels[key] || key} (Prev.)`,
          color: CHART_COLORS[idx % CHART_COLORS.length],
        };
      }
    });
    
    lineMetrics.forEach((key, idx) => {
      const colorIdx = (barMetrics.length + idx) % CHART_COLORS.length;
      config[key] = {
        label: metricLabels[key] || key,
        color: CHART_COLORS[colorIdx],
      };
      if (showComparison) {
        config[`${key}_prev`] = {
          label: `${metricLabels[key] || key} (Prev.)`,
          color: CHART_COLORS[colorIdx],
        };
      }
    });
    
    return config;
  }, [barMetrics, lineMetrics, metricLabels, showComparison]);

  if (data.length === 0 || (lineMetrics.length === 0 && barMetrics.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[16rem] relative flex flex-col">
      {warning && <ChartWarning message={warning} reason={warningReason} />}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="2 2" stroke="#999999" opacity={1} syncWithTicks={true} />}
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickMargin={8}
            minTickGap={50}
            interval="preserveStartEnd"
          />
          <YAxis 
            tickFormatter={formatNumber}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickMargin={8}
            tickCount={15}
            width={50}
            interval={0}
          />
          <Tooltip 
            cursor={{ stroke: 'hsl(0, 84%, 60%)', strokeWidth: 3 }}
            content={(props) => <SmartTooltip {...props} formatNumber={formatTooltipNumber} />}
          />
          {barMetrics.map((key, idx) => (
            <Bar
              key={`bar-${key}`}
              dataKey={key}
              fill={CHART_COLORS[idx % CHART_COLORS.length]}
              name={metricLabels[key] || key}
              isAnimationActive={false}
            />
          ))}
          {showComparison && barMetrics.map((key, idx) => (
            <Bar
              key={`bar-${key}_prev`}
              dataKey={`${key}_prev`}
              fill={CHART_COLORS[idx % CHART_COLORS.length]}
              fillOpacity={0.5}
              name={`${metricLabels[key] || key} (Prev.)`}
              isAnimationActive={false}
            />
          ))}
          {lineMetrics.map((key, idx) => (
            <Line
              key={`line-${key}`}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[(barMetrics.length + idx) % CHART_COLORS.length]}
              strokeWidth={3}
              dot={false}
              activeDot={{ fill: 'hsl(0, 84%, 60%)', r: 6 }}
              name={metricLabels[key] || key}
              isAnimationActive={false}
            />
          ))}
          {showComparison && lineMetrics.map((key, idx) => (
            <Line
              key={`line-${key}_prev`}
              type="monotone"
              dataKey={`${key}_prev`}
              stroke={CHART_COLORS[(barMetrics.length + idx) % CHART_COLORS.length]}
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ fill: 'hsl(0, 84%, 60%)', r: 6 }}
              name={`${metricLabels[key] || key} (Prev.)`}
              isAnimationActive={false}
            />
          ))}
          {showBrush && (
            <Brush
              dataKey="date"
              height={20}
              stroke="hsl(var(--border))"
              fill="hsl(var(--muted)/60)"
              travellerWidth={10}
              tickFormatter={(value) => value}
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
              onChange={handleBrushChange}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      {showBrush && data.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-2 mt-1">
          <button
            onClick={handleBrushLeft}
            disabled={brushStartIndex === 0}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            data-testid="brush-left"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 12L6 8l4-4v8z"/>
            </svg>
          </button>
          <button
            onClick={handleBrushRight}
            disabled={brushEndIndex >= data.length - 1}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            data-testid="brush-right"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4V4z"/>
            </svg>
          </button>
        </div>
      )}
      {showLegend && (
        <CustomChartLegend 
          metricKeys={[...barMetrics, ...lineMetrics]}
          metricLabels={metricLabels}
          showComparison={showComparison}
        />
      )}
    </div>
  );
}

export const MixedChartWidget = memo(MixedChartWidgetInner);

// Scatter Chart (Bubble Chart) Widget
interface ScatterChartProps {
  data: ChartDataPoint[];
  xKey: string;
  yKey: string;
  zKey?: string;
  metricLabels: Record<string, string>;
  showLegend?: boolean;
  showGrid?: boolean;
  showComparison?: boolean;
  warning?: string;
  warningReason?: string;
}

function ScatterChartWidgetInner({
  data,
  xKey,
  yKey,
  zKey,
  metricLabels,
  showLegend = true,
  showGrid = true,
  showComparison = false,
  warning,
  warningReason,
}: ScatterChartProps) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      [xKey]: {
        label: metricLabels[xKey] || xKey,
        color: CHART_COLORS[0],
      },
      [yKey]: {
        label: metricLabels[yKey] || yKey,
        color: CHART_COLORS[1],
      },
    };

    if (zKey) {
      config[zKey] = {
        label: metricLabels[zKey] || zKey,
        color: CHART_COLORS[2],
      };
    }
    
    return config;
  }, [xKey, yKey, zKey, metricLabels]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  // Create separate datasets for current and previous periods
  const currentData = data.map(row => ({
    [xKey]: row[xKey],
    [yKey]: row[yKey],
    ...(zKey && { [zKey]: row[zKey] }),
    date: row.date,
  }));

  const prevData = showComparison 
    ? data
        .filter(row => row[`${xKey}_prev`] !== undefined)
        .map(row => ({
          [xKey]: row[`${xKey}_prev`],
          [yKey]: row[`${yKey}_prev`],
          ...(zKey && { [zKey]: row[`${zKey}_prev`] }),
          date: row.date,
        }))
    : [];

  return (
    <div className="h-full w-full relative">
      {warning && <ChartWarning message={warning} reason={warningReason} />}
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ScatterChart>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#999999" opacity={1} syncWithTicks={true} />}
        <XAxis 
          type="number" 
          dataKey={xKey} 
          name={metricLabels[xKey] || xKey}
        />
        <YAxis 
          type="number" 
          dataKey={yKey} 
          name={metricLabels[yKey] || yKey}
        />
        {zKey && <ZAxis type="number" dataKey={zKey} range={[50, 400]} name={metricLabels[zKey] || zKey} />}
        <ChartTooltip cursor={{ stroke: 'hsl(0, 84%, 60%)', strokeWidth: 3 }} content={<ChartTooltipContent />} />
        {showLegend && <Legend align="left" />}
        <Scatter
          name={metricLabels[yKey] || yKey}
          data={currentData}
          fill={CHART_COLORS[0]}
        />
        {showComparison && prevData.length > 0 && (
          <Scatter
            name={`${metricLabels[yKey] || yKey} (Prev.)`}
            data={prevData}
            fill={CHART_COLORS[1]}
            shape="cross"
          />
        )}
      </ScatterChart>
      </ChartContainer>
    </div>
  );
}

export const ScatterChartWidget = memo(ScatterChartWidgetInner);

// Radar Chart Widget
interface RadarChartProps {
  data: any[];
  metrics: string[];
  metricLabels: Record<string, string>;
  showLegend?: boolean;
  showComparison?: boolean;
  warning?: string;
  warningReason?: string;
}

function RadarChartWidgetInner({
  data,
  metrics,
  metricLabels,
  showLegend = true,
  showComparison = false,
  warning,
  warningReason,
}: RadarChartProps) {
  const chartConfig = useMemo(() => {
    return metrics.reduce((acc, key, idx) => {
      acc[key] = {
        label: metricLabels[key] || key,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);
  }, [metrics, metricLabels]);

  if (data.length === 0 || metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {warning && <ChartWarning message={warning} reason={warningReason} />}
      <ChartContainer config={chartConfig} className="h-full w-full">
        <RadarChart data={data}>
          <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis />
        <ChartTooltip cursor={{ stroke: 'hsl(0, 84%, 60%)', strokeWidth: 3 }} content={<ChartTooltipContent />} />
        {showLegend && <Legend align="left" />}
        {metrics.map((key, idx) => (
          <Radar
            key={key}
            name={metricLabels[key] || key}
            dataKey={key}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            fill={CHART_COLORS[idx % CHART_COLORS.length]}
            fillOpacity={key.includes('prev') ? 0.3 : 0.6}
            strokeDasharray={key.includes('prev') ? '5 5' : '0'}
          />
        ))}
      </RadarChart>
      </ChartContainer>
    </div>
  );
}

export const RadarChartWidget = memo(RadarChartWidgetInner);

// Funnel Chart Widget (Custom implementation)
interface FunnelChartProps {
  data: { name: string; value: number; valuePrev?: number }[];
  showLegend?: boolean;
  showComparison?: boolean;
  warning?: string;
  warningReason?: string;
}

function FunnelChartWidgetInner({ data, showLegend = true, showComparison = false, warning, warningReason }: FunnelChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), ...(showComparison ? data.map(d => d.valuePrev || 0) : []));
  const total = data[0]?.value || 1;
  const totalPrev = data[0]?.valuePrev || 1;

  return (
    <div className="h-full w-full p-8 flex flex-col relative">
      {warning && <ChartWarning message={warning} reason={warningReason} />}
      <div className="flex-1 flex flex-col justify-center">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const width = (item.value / maxValue) * 100;
          const dropoff = index > 0 ? ((data[index - 1].value - item.value) / data[index - 1].value) * 100 : 0;
          
          const percentagePrev = item.valuePrev ? (item.valuePrev / totalPrev) * 100 : 0;
          const widthPrev = item.valuePrev ? (item.valuePrev / maxValue) * 100 : 0;

          return (
            <div key={item.name} className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>
                    {item.value.toLocaleString()} ({percentage.toFixed(1)}%)
                    {index > 0 && ` • -${dropoff.toFixed(1)}%`}
                  </span>
                  {showComparison && item.valuePrev !== undefined && (
                    <span className="opacity-70">
                      Prev: {item.valuePrev.toLocaleString()} ({percentagePrev.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-12 flex items-center gap-1">
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${width}%`,
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                {showComparison && item.valuePrev !== undefined && (
                  <div
                    className="h-full rounded transition-all opacity-50 border-2 border-dashed"
                    style={{
                      width: `${widthPrev}%`,
                      borderColor: CHART_COLORS[index % CHART_COLORS.length],
                      backgroundColor: 'transparent',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          {data.map((item, index) => (
            <div key={`legend-${item.name}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
          {showComparison && (
            <div className="flex items-center gap-2 ml-4">
              <div className="w-3 h-3 rounded border-2 border-dashed border-muted-foreground" />
              <span className="text-xs text-muted-foreground">Previous period</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const FunnelChartWidget = memo(FunnelChartWidgetInner);