/**
 * LineChartWidget — виджет линейного графика
 * 
 * Использует useWidgetCache для независимого кэширования
 * Использует Recharts для отрисовки
 */

import { memo, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetEntityType } from '@/hooks/useWidgetCache';
import { formatMetricValue } from '@/lib/formatters';
import { formatMetricName } from '@/data/metrics';

// Цвета для линий
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export interface LineChartWidgetProps {
  /** Заголовок графика */
  title: string;
  
  /** ID метрик для отображения */
  metricIds: string[];
  
  /** Тип сущности */
  entityType: WidgetEntityType;
  
  /** ID конкретных сущностей (опционально) */
  entityIds?: string[];
  
  /** Параметры контекста */
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  attribution: string;
  accountIds: string[];
  
  /** Код валюты */
  currencyCode?: string;
  
  /** Высота графика */
  height?: 'sm' | 'md' | 'lg';
  
  /** Показывать легенду */
  showLegend?: boolean;
  
  /** Показывать сетку */
  showGrid?: boolean;
  
  /** Классы */
  className?: string;
}

export const LineChartWidget = memo(function LineChartWidget({
  title,
  metricIds,
  entityType,
  entityIds,
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  attribution,
  accountIds,
  currencyCode = 'USD',
  height = 'md',
  showLegend = true,
  showGrid = true,
  className,
}: LineChartWidgetProps) {
  const widgetId = `line-chart-${metricIds.join('-')}-${entityType}`;
  
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useWidgetCache({
    widgetId,
    widgetType: 'chart-line',
    entityType,
    metricIds,
    entityIds,
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
  });

  // Преобразуем данные для Recharts
  const chartData = useMemo(() => {
    if (!data?.byDate) return [];
    
    return Object.entries(data.byDate)
      .map(([date, metrics]) => ({
        date,
        ...metrics,
      }))
      .sort((a, b) => {
        // Сортировка по дате (формат DD.MM.YYYY)
        const [aD, aM, aY] = a.date.split('.').map(Number);
        const [bD, bM, bY] = b.date.split('.').map(Number);
        return new Date(aY, aM - 1, aD).getTime() - new Date(bY, bM - 1, bD).getTime();
      });
  }, [data?.byDate]);

  // Форматтер для tooltip
  const tooltipFormatter = (value: number, name: string) => {
    return [formatMetricValue(value, name, currencyCode), formatMetricName(name)];
  };

  const heightClass = height === 'sm' ? 'h-[200px]' : height === 'lg' ? 'h-[400px]' : 'h-[300px]';

  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={title}
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      onRefresh={() => refetch()}
      className={className}
      height={height}
    >
      <div className={heightClass}>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toString();
                }}
              />
              
              <Tooltip 
                formatter={tooltipFormatter}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              
              {showLegend && (
                <Legend 
                  formatter={(value) => formatMetricName(value)}
                  wrapperStyle={{ fontSize: 12 }}
                />
              )}
              
              {metricIds.map((metricId, index) => (
                <Line
                  key={metricId}
                  type="monotone"
                  dataKey={metricId}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetWrapper>
  );
});

export default LineChartWidget;
