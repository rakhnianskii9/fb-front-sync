/**
 * MetricCardWidget — виджет карточки с одной метрикой
 * 
 * Использует useWidgetCache для независимого кэширования
 */

import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetEntityType } from '@/hooks/useWidgetCache';
import { formatMetricValue } from '@/lib/formatters';
import { formatMetricName } from '@/data/metrics';
import { getMetricChangeColorClass } from '@/data/metricPolarity';
import { cn } from '@/lib/utils';

export interface MetricCardWidgetProps {
  /** ID метрики для отображения */
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
  
  /** Данные предыдущего периода для сравнения */
  previousPeriodValue?: number;
  
  /** Название метрики (опционально, иначе берётся из metricId) */
  label?: string;
  
  /** Классы */
  className?: string;
  
  /** Показывать заголовок карточки */
  showHeader?: boolean;
}

export const MetricCardWidget = memo(function MetricCardWidget({
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
  previousPeriodValue,
  label,
  className,
  showHeader = false,
}: MetricCardWidgetProps) {
  const widgetId = `metric-card-${metricId}-${entityType}`;
  
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useWidgetCache({
    widgetId,
    widgetType: 'metric-card',
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

  // Текущее значение метрики
  const currentValue = data?.totals[metricId] ?? 0;
  
  // Название метрики
  const metricName = label || formatMetricName(metricId);
  
  // Расчёт изменения (если есть предыдущий период)
  const percentChange = useMemo(() => {
    if (previousPeriodValue === undefined || previousPeriodValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }
    return ((currentValue - previousPeriodValue) / previousPeriodValue) * 100;
  }, [currentValue, previousPeriodValue]);

  const isPositive = percentChange > 0;
  const isNeutral = percentChange === 0;
  const trendColorClass = getMetricChangeColorClass(metricId, percentChange);

  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={metricName}
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      onRefresh={() => refetch()}
      className={className}
      showHeader={showHeader}
      height="auto"
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">
          {metricName}
        </p>
        
        <p className="text-2xl font-bold text-foreground">
          {formatMetricValue(currentValue, metricId, currencyCode)}
        </p>
        
        {previousPeriodValue !== undefined && (
          <div className="flex items-center gap-1">
            {isNeutral ? (
              <Minus className="w-4 h-4 text-muted-foreground" />
            ) : isPositive ? (
              <TrendingUp className={cn('w-4 h-4', trendColorClass)} />
            ) : (
              <TrendingDown className={cn('w-4 h-4', trendColorClass)} />
            )}
            <span className={cn('text-sm font-medium', trendColorClass)}>
              {Math.abs(percentChange).toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              vs previous
            </span>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
});

export default MetricCardWidget;
