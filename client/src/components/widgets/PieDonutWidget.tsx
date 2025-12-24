/**
 * PieDonutWidget — Pie/Donut chart для распределения
 * 
 * Показывает % от целого:
 * - Spend by Objective
 * - Spend by Placement
 * - Touch Frequency distribution
 * - Attribution Model comparison
 * 
 * ECharts: https://echarts.apache.org/examples/en/editor.html?c=pie-doughnut
 */

import { memo, useState, useMemo } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetRequest } from '@/hooks/useWidgetCache';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/formatters';

// Breakdown варианты
const BREAKDOWN_OPTIONS = [
  { id: 'placement', label: 'By Placement' },
  { id: 'objective', label: 'By Objective' },
  { id: 'budget_type', label: 'By Budget Type' },
  { id: 'platform', label: 'By Platform' },
];

// Метрики для распределения
const METRIC_OPTIONS = [
  { id: 'spend', label: 'Spend' },
  { id: 'impressions', label: 'Impressions' },
  { id: 'clicks', label: 'Clicks' },
  { id: 'conversions', label: 'Conversions' },
];

// Цвета
const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
  '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#06b6d4',
];

interface PieDonutWidgetProps {
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  accountIds: string[];
  attribution?: string;
  currencyCode?: string;
  breakdown?: string;
  metric?: string;
  title?: string;
  variant?: 'pie' | 'donut';
}

export const PieDonutWidget = memo(function PieDonutWidget({
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  accountIds,
  attribution = '7d_click_1d_view',
  currencyCode = 'USD',
  breakdown = 'placement',
  metric = 'spend',
  title,
  variant = 'donut',
}: PieDonutWidgetProps) {
  const [selectedBreakdown, setSelectedBreakdown] = useState(breakdown);
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [chartVariant, setChartVariant] = useState(variant);
  
  const widgetId = `pie-donut-${reportId}-${dateFrom}-${dateTo}-${selectedBreakdown}-${selectedMetric}`;
  
  // Запрос данных
  const request: WidgetRequest = {
    widgetId,
    widgetType: 'pie' as any,
    entityType: 'campaign',
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
    metricIds: [selectedMetric],
    filters: {
      breakdown: selectedBreakdown,
    } as any,
  };
  
  const { data, isLoading, error, refetch } = useWidgetCache(request, {
    enabled: Boolean(workspaceId && reportId && accountIds.length > 0),
  });
  
  // Обработка данных
  const chartData = useMemo(() => {
    if (!data?.segments) {
      // Mock data
      return [
        { name: 'Instagram Feed', value: 4500, percent: 35 },
        { name: 'Facebook Feed', value: 3200, percent: 25 },
        { name: 'Instagram Stories', value: 2560, percent: 20 },
        { name: 'Audience Network', value: 1280, percent: 10 },
        { name: 'Facebook Reels', value: 1280, percent: 10 },
      ];
    }
    
    const total = data.segments.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
    return data.segments.map((segment: any) => ({
      name: segment.name || segment.label,
      value: segment.value || 0,
      percent: total > 0 ? ((segment.value || 0) / total) * 100 : 0,
    }));
  }, [data]);
  
  // Форматирование значения
  const formatValue = (value: number): string => {
    if (selectedMetric === 'spend') {
      return formatCurrency(value, currencyCode);
    }
    return formatNumber(value);
  };
  
  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    
    return (
      <Card className="p-2 shadow-lg">
        <p className="font-medium text-sm">{d.name}</p>
        <p className="text-xs">
          {formatValue(d.value)} ({d.percent.toFixed(1)}%)
        </p>
      </Card>
    );
  };
  
  // Custom Label
  const renderCustomLabel = ({ name, percent }: any) => {
    if (percent < 5) return null;
    return `${percent.toFixed(0)}%`;
  };
  
  const displayTitle = title || `${METRIC_OPTIONS.find(m => m.id === selectedMetric)?.label} ${BREAKDOWN_OPTIONS.find(b => b.id === selectedBreakdown)?.label}`;
  
  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={displayTitle}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      headerAction={
        <div className="flex items-center gap-2">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedBreakdown} onValueChange={setSelectedBreakdown}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BREAKDOWN_OPTIONS.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={chartVariant === 'donut' ? 50 : 0}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={COLORS[index % COLORS.length]}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value, entry: any) => (
                <span className="text-xs">
                  {value} ({entry.payload.percent.toFixed(0)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
});

export default PieDonutWidget;
