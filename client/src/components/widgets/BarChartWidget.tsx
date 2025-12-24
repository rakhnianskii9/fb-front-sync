/**
 * BarChartWidget — виджет столбчатого графика
 * 
 * Использует useWidgetCache для независимого кэширования
 * Подходит для сравнения значений между сущностями
 */

import { memo, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetEntityType } from '@/hooks/useWidgetCache';
import { formatMetricValue } from '@/lib/formatters';
import { formatMetricName } from '@/data/metrics';

// Цвета для столбцов
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

// Градиентные цвета для рейтинга
const GRADIENT_COLORS = [
  '#22c55e', // green-500
  '#84cc16', // lime-500
  '#eab308', // yellow-500
  '#f97316', // orange-500
  '#ef4444', // red-500
];

export interface BarChartWidgetProps {
  /** Заголовок графика */
  title: string;
  
  /** ID основной метрики для столбцов */
  metricId: string;
  
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
  
  /** Ориентация */
  layout?: 'horizontal' | 'vertical';
  
  /** Показывать сетку */
  showGrid?: boolean;
  
  /** Использовать градиент (для рейтинга) */
  useGradient?: boolean;
  
  /** Максимальное количество элементов */
  maxItems?: number;
  
  /** Сортировка */
  sortOrder?: 'asc' | 'desc' | 'none';
  
  /** Классы */
  className?: string;
}

export const BarChartWidget = memo(function BarChartWidget({
  title,
  metricId,
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
  layout = 'vertical',
  showGrid = true,
  useGradient = false,
  maxItems = 10,
  sortOrder = 'desc',
  className,
}: BarChartWidgetProps) {
  const widgetId = `bar-chart-${metricId}-${entityType}`;
  
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useWidgetCache({
    widgetId,
    widgetType: 'chart-bar',
    entityType,
    metricIds: [metricId],
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
    if (!data?.byEntity) return [];
    
    let items = Object.values(data.byEntity)
      .filter(entity => entity.metrics[metricId] !== undefined)
      .map(entity => ({
        name: entity.name.length > 20 ? entity.name.slice(0, 20) + '...' : entity.name,
        fullName: entity.name,
        value: entity.metrics[metricId] || 0,
        id: entity.id,
      }));
    
    // Сортировка
    if (sortOrder !== 'none') {
      items.sort((a, b) => sortOrder === 'desc' ? b.value - a.value : a.value - b.value);
    }
    
    // Ограничение количества
    if (maxItems > 0) {
      items = items.slice(0, maxItems);
    }
    
    return items;
  }, [data?.byEntity, metricId, sortOrder, maxItems]);

  // Форматтер для tooltip
  const tooltipFormatter = (value: number) => {
    return [formatMetricValue(value, metricId, currencyCode), formatMetricName(metricId)];
  };

  // Получить цвет для столбца
  const getBarColor = (index: number, total: number) => {
    if (useGradient) {
      const gradientIndex = Math.floor((index / Math.max(total - 1, 1)) * (GRADIENT_COLORS.length - 1));
      return GRADIENT_COLORS[gradientIndex];
    }
    return CHART_COLORS[0];
  };

  const heightClass = height === 'sm' ? 'h-[200px]' : height === 'lg' ? 'h-[400px]' : 'h-[300px]';

  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={title}
      subtitle={`Top ${maxItems} by ${formatMetricName(metricId)}`}
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
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={100}
            minHeight={100}
            initialDimension={{ width: 100, height: 100 }}
          >
            <BarChart 
              data={chartData} 
              layout={layout}
              margin={{ top: 5, right: 20, left: layout === 'vertical' ? 80 : 0, bottom: 5 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              
              {layout === 'vertical' ? (
                <>
                  <XAxis 
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value.toString();
                    }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                </>
              ) : (
                <>
                  <XAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value.toString();
                    }}
                  />
                </>
              )}
              
              <Tooltip 
                formatter={tooltipFormatter}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(index, chartData.length)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetWrapper>
  );
});

export default BarChartWidget;
