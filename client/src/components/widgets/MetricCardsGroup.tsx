/**
 * MetricCardsGroup — группа карточек метрик
 * 
 * Оптимизированный виджет для отображения нескольких метрик
 * Использует один запрос для всех метрик
 */

import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWidgetCache, type WidgetEntityType } from '@/hooks/useWidgetCache';
import { formatMetricValue } from '@/lib/formatters';
import { formatMetricName } from '@/data/metrics';
import { getMetricChangeColorClass } from '@/data/metricPolarity';
import { cn } from '@/lib/utils';

export interface MetricConfig {
  id: string;
  label?: string;
  previousValue?: number;
}

export interface MetricCardsGroupProps {
  /** Список метрик для отображения */
  metrics: MetricConfig[];
  
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
  
  /** Количество колонок */
  columns?: 2 | 3 | 4 | 5 | 6;
  
  /** Классы */
  className?: string;
}

interface SingleMetricCardProps {
  metricId: string;
  label: string;
  value: number;
  previousValue?: number;
  currencyCode: string;
}

const SingleMetricCard = memo(function SingleMetricCard({
  metricId,
  label,
  value,
  previousValue,
  currencyCode,
}: SingleMetricCardProps) {
  const percentChange = useMemo(() => {
    if (previousValue === undefined || previousValue === 0) {
      return value > 0 ? 100 : 0;
    }
    return ((value - previousValue) / previousValue) * 100;
  }, [value, previousValue]);

  const isPositive = percentChange > 0;
  const isNeutral = percentChange === 0;
  const trendColorClass = getMetricChangeColorClass(metricId, percentChange);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium truncate" title={label}>
          {label}
        </p>
        
        <p className="text-2xl font-bold text-foreground">
          {formatMetricValue(value, metricId, currencyCode)}
        </p>
        
        {previousValue !== undefined && (
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
          </div>
        )}
      </div>
    </Card>
  );
});

const MetricCardSkeleton = memo(function MetricCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-[60%]" />
        <Skeleton className="h-8 w-[80%]" />
        <Skeleton className="h-4 w-[40%]" />
      </div>
    </Card>
  );
});

export const MetricCardsGroup = memo(function MetricCardsGroup({
  metrics,
  entityType,
  entityIds,
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  attribution,
  accountIds,
  currencyCode = 'USD',
  columns = 5,
  className,
}: MetricCardsGroupProps) {
  const widgetId = `metric-cards-group-${entityType}`;
  const metricIds = metrics.map(m => m.id);
  
  const {
    data,
    isLoading,
    isError,
  } = useWidgetCache({
    widgetId,
    widgetType: 'metric-cards',
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

  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }[columns];

  if (isLoading) {
    return (
      <div className={cn(`grid ${gridClass} gap-4`, className)}>
        {metrics.map((m) => (
          <MetricCardSkeleton key={m.id} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={cn(`grid ${gridClass} gap-4`, className)}>
        {metrics.map((m) => (
          <Card key={m.id} className="p-4 text-center text-muted-foreground">
            Error loading
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(`grid ${gridClass} gap-4`, className)}>
      {metrics.map((metric) => (
        <SingleMetricCard
          key={metric.id}
          metricId={metric.id}
          label={metric.label || formatMetricName(metric.id)}
          value={data.totals[metric.id] ?? 0}
          previousValue={metric.previousValue}
          currencyCode={currencyCode}
        />
      ))}
    </div>
  );
});

export default MetricCardsGroup;
