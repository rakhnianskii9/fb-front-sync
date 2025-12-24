/**
 * ScatterBubbleWidget — Scatter/Bubble chart для Compare workspace
 * 
 * ECharts:
 * - Scatter: https://echarts.apache.org/examples/en/editor.html?c=scatter-simple
 * - Bubble: https://echarts.apache.org/examples/en/editor.html?c=bubble-gradient
 * 
 * Показывает корреляцию между метриками:
 * - X-axis: Spend
 * - Y-axis: CPR (эффективность)
 * - Size: Results (объём)
 * 
 * Примеры:
 * - CPR vs Spend — кто эффективен при большом бюджете
 * - CTR vs CPM — качество аудитории
 * - ROAS vs Spend — масштабируемость
 */

import { memo, useState, useMemo } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetRequest } from '@/hooks/useWidgetCache';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/formatters';

// Метрики для осей
const AXIS_METRICS = [
  { id: 'spend', label: 'Spend', format: 'currency' },
  { id: 'impressions', label: 'Impressions', format: 'number' },
  { id: 'clicks', label: 'Clicks', format: 'number' },
  { id: 'conversions', label: 'Results', format: 'number' },
  { id: 'ctr', label: 'CTR', format: 'percent' },
  { id: 'cpc', label: 'CPC', format: 'currency' },
  { id: 'cpm', label: 'CPM', format: 'currency' },
  { id: 'cpr', label: 'CPR', format: 'currency' },
  { id: 'roas', label: 'ROAS', format: 'percent' },
  { id: 'revenue', label: 'Revenue', format: 'currency' },
];

// Presets для быстрого выбора
const PRESETS = [
  { xAxis: 'spend', yAxis: 'cpr', size: 'conversions', label: 'Efficiency vs Budget' },
  { xAxis: 'cpm', yAxis: 'ctr', size: 'conversions', label: 'Audience Quality' },
  { xAxis: 'spend', yAxis: 'roas', size: 'revenue', label: 'Scalability' },
  { xAxis: 'impressions', yAxis: 'conversions', size: 'spend', label: 'Traffic Conversion' },
];

interface ScatterBubbleWidgetProps {
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  accountIds: string[];
  attribution?: string;
  currencyCode?: string;
  entityType?: 'campaign' | 'adset' | 'ad' | 'creative';
  title?: string;
  onEntityClick?: (entityId: string) => void;
}

export const ScatterBubbleWidget = memo(function ScatterBubbleWidget({
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  accountIds,
  attribution = '7d_click_1d_view',
  currencyCode = 'USD',
  entityType = 'campaign',
  title = 'Correlation Analysis',
  onEntityClick,
}: ScatterBubbleWidgetProps) {
  const [xMetric, setXMetric] = useState('spend');
  const [yMetric, setYMetric] = useState('cpr');
  const [sizeMetric, setSizeMetric] = useState('conversions');
  
  const widgetId = `scatter-${reportId}-${dateFrom}-${dateTo}-${entityType}`;
  
  // Запрос данных
  const request: WidgetRequest = {
    widgetId,
    widgetType: 'scatter' as any,
    entityType,
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
    metricIds: [xMetric, yMetric, sizeMetric],
  };
  
  const { data, isLoading, error, refetch } = useWidgetCache(request, {
    enabled: Boolean(workspaceId && reportId && accountIds.length > 0),
  });
  
  // Обработка данных
  const chartData = useMemo(() => {
    if (!data?.rows) {
      // Mock data
      return [
        { id: '1', name: 'Summer Sale', spend: 2500, cpr: 15, conversions: 167, fill: '#22c55e' },
        { id: '2', name: 'Retargeting', spend: 1800, cpr: 18, conversions: 100, fill: '#84cc16' },
        { id: '3', name: 'Lookalike', spend: 1200, cpr: 22, conversions: 55, fill: '#eab308' },
        { id: '4', name: 'Brand Awareness', spend: 800, cpr: 35, conversions: 23, fill: '#f97316' },
        { id: '5', name: 'Video Promo', spend: 3000, cpr: 50, conversions: 60, fill: '#ef4444' },
      ];
    }
    
    // Рассчитываем цвет на основе эффективности (по Y-метрике)
    const values = data.rows.map((r: any) => r[yMetric] || 0);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const range = maxY - minY || 1;
    
    return data.rows.map((row: any) => {
      const yVal = row[yMetric] || 0;
      const ratio = (yVal - minY) / range;
      
      // Цвет: зелёный для низких (хороших) значений CPR/CPC, красный для высоких
      // Инвертируем для ROAS (больше = лучше)
      const isInverted = ['roas', 'ctr', 'conversions', 'revenue'].includes(yMetric);
      const normalizedRatio = isInverted ? 1 - ratio : ratio;
      
      let fill: string;
      if (normalizedRatio < 0.25) fill = '#22c55e';
      else if (normalizedRatio < 0.5) fill = '#84cc16';
      else if (normalizedRatio < 0.75) fill = '#eab308';
      else fill = '#ef4444';
      
      return {
        id: row.id,
        name: row.name || row.campaignName || 'Unknown',
        [xMetric]: row[xMetric] || 0,
        [yMetric]: row[yMetric] || 0,
        [sizeMetric]: row[sizeMetric] || 0,
        fill,
      };
    });
  }, [data, xMetric, yMetric, sizeMetric]);
  
  // Форматирование значения
  const formatValue = (value: number, metricId: string): string => {
    const metric = AXIS_METRICS.find(m => m.id === metricId);
    if (!metric) return formatNumber(value);
    
    switch (metric.format) {
      case 'currency': return formatCurrency(value, currencyCode);
      case 'percent': return formatPercent(value);
      default: return formatNumber(value);
    }
  };
  
  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    
    return (
      <Card className="p-3 shadow-lg">
        <p className="font-medium mb-2">{d.name}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {AXIS_METRICS.find(m => m.id === xMetric)?.label}:
            </span>
            <span className="font-medium">{formatValue(d[xMetric], xMetric)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {AXIS_METRICS.find(m => m.id === yMetric)?.label}:
            </span>
            <span className="font-medium">{formatValue(d[yMetric], yMetric)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {AXIS_METRICS.find(m => m.id === sizeMetric)?.label}:
            </span>
            <span className="font-medium">{formatValue(d[sizeMetric], sizeMetric)}</span>
          </div>
        </div>
      </Card>
    );
  };
  
  // Применение пресета
  const applyPreset = (preset: typeof PRESETS[0]) => {
    setXMetric(preset.xAxis);
    setYMetric(preset.yAxis);
    setSizeMetric(preset.size);
  };
  
  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={title}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      headerAction={
        <div className="flex items-center gap-2">
          {/* Quick Presets */}
          <Select onValueChange={(v) => applyPreset(PRESETS[parseInt(v)])}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue placeholder="Quick presets" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((preset, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Axis Selectors */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">X:</span>
            <Select value={xMetric} onValueChange={setXMetric}>
              <SelectTrigger className="h-6 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AXIS_METRICS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Y:</span>
            <Select value={yMetric} onValueChange={setYMetric}>
              <SelectTrigger className="h-6 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AXIS_METRICS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Size:</span>
            <Select value={sizeMetric} onValueChange={setSizeMetric}>
              <SelectTrigger className="h-6 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AXIS_METRICS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Chart */}
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                type="number" 
                dataKey={xMetric} 
                name={AXIS_METRICS.find(m => m.id === xMetric)?.label}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => formatValue(v, xMetric)}
              />
              <YAxis 
                type="number" 
                dataKey={yMetric}
                name={AXIS_METRICS.find(m => m.id === yMetric)?.label}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => formatValue(v, yMetric)}
              />
              <ZAxis 
                type="number" 
                dataKey={sizeMetric} 
                range={[50, 400]}
                name={AXIS_METRICS.find(m => m.id === sizeMetric)?.label}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter
                data={chartData}
                onClick={(d: any) => onEntityClick?.(d.id)}
                cursor="pointer"
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.fill} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Best</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-lime-500" />
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Average</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Poor</span>
          </div>
          <span className="text-muted-foreground/50">|</span>
          <span>Size = {AXIS_METRICS.find(m => m.id === sizeMetric)?.label}</span>
        </div>
      </div>
    </WidgetWrapper>
  );
});

export default ScatterBubbleWidget;
