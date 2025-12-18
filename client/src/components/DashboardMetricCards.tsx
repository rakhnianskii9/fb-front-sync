import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Users } from "lucide-react";
import { calculateMetricChange } from "@/lib/chartDataUtils";
import type { Report } from "@/store/slices/reportsSlice";
import { formatMetricValue } from "@/lib/formatters";
import type { DateRange } from "react-day-picker";
import { metricCategories, formatMetricName } from "@/data/metrics";
import { getMetricChangeColorClass } from "@/data/metricPolarity";
import type { AnalyticsDataView } from "@/hooks/useAnalyticsDataView";
import { useAppSelector } from "@/store/hooks";
import { selectAvailableMetricIds } from "@/store/selectors";
import { resolveMetric, isMetricResolvable, getAllConversionVariants } from "@/lib/resolveMetrics";
import type { KommoCrmMetrics } from "@/api/kommo";

interface DashboardMetricCardsProps {
  report: Report;
  periodA?: DateRange;
  periodB?: DateRange;
  dataView?: AnalyticsDataView;
  currencyCode?: string | null;
  crmMetrics?: KommoCrmMetrics | null;
  crmName?: string;
}

const DEFAULT_METRICS = [
  { id: 'impressions', name: 'Impressions', format: 'number' },
  { id: 'unique_clicks', name: 'Unique Clicks', format: 'number', pairedWith: 'cost_per_unique_click' },
  { id: 'unique_ctr', name: 'Unique CTR', format: 'percentage' },
  { id: 'conversions', name: 'Conversions', format: 'number', pairedWith: 'cost_per_result' },
  { id: 'spend', name: 'Spend', format: 'currency' },
];

// Helper function to get metric name from ID
const getMetricName = (metricId: string): string => {
  for (const category of metricCategories) {
    if (category.metrics) {
      const metric = category.metrics.find(m => m.id === metricId);
      if (metric) return metric.name;
    }
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        const metric = subcategory.metrics.find(m => m.id === metricId);
        if (metric) return metric.name;
      }
    }
  }
  // Для динамических метрик используем formatMetricName
  return formatMetricName(metricId);
};

// Мемоизированная карточка метрики
interface MetricCardProps {
  metricId: string;
  metricName: string;
  current: number;
  percentChange: number;
  currencyCode?: string | null;
}

const MetricCard = memo(function MetricCard({ metricId, metricName, current, percentChange, currencyCode }: MetricCardProps) {
  const isPositive = percentChange > 0;
  const isNeutral = percentChange === 0;
  const trendColor = getMetricChangeColorClass(metricId, percentChange);

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow h-full flex flex-col justify-center"
      data-testid={`metric-card-${metricId}`}
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium" data-testid={`metric-label-${metricId}`}>
          {metricName}
        </p>
        <p className="text-2xl font-bold text-foreground" data-testid={`metric-value-${metricId}`}>
          {formatMetricValue(current, metricId, currencyCode)}
        </p>
        <div className="flex items-center gap-1" data-testid={`metric-trend-${metricId}`}>
          {isNeutral ? (
            <Minus className="w-4 h-4 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className={`w-4 h-4 ${trendColor}`} />
          ) : (
            <TrendingDown className={`w-4 h-4 ${trendColor}`} />
          )}
          <span className={`text-sm font-medium ${trendColor}`}>
            {Math.abs(percentChange).toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            vs previous period
          </span>
        </div>
      </div>
    </Card>
  );
});

// Спаренная карточка — основная метрика сверху, производная (cost) снизу
interface PairedMetricCardProps {
  primaryId: string;
  primaryName: string;
  primaryValue: number;
  primaryChange: number;
  secondaryId: string;
  secondaryName: string;
  secondaryValue: number;
  secondaryChange: number;
  currencyCode?: string | null;
}

const PairedMetricCard = memo(function PairedMetricCard({
  primaryId,
  primaryName,
  primaryValue,
  primaryChange,
  secondaryId,
  secondaryName,
  secondaryValue,
  secondaryChange,
  currencyCode
}: PairedMetricCardProps) {
  const primaryTrendColor = getMetricChangeColorClass(primaryId, primaryChange);
  const secondaryTrendColor = getMetricChangeColorClass(secondaryId, secondaryChange);
  const isPrimaryPositive = primaryChange > 0;
  const isPrimaryNeutral = primaryChange === 0;
  const isSecondaryPositive = secondaryChange > 0;
  const isSecondaryNeutral = secondaryChange === 0;

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow"
      data-testid={`metric-card-paired-${primaryId}`}
    >
      <div className="space-y-3">
        {/* Основная метрика (count) */}
        <div>
          <p className="text-sm text-muted-foreground font-medium">
            {primaryName}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground">
              {formatMetricValue(primaryValue, primaryId, currencyCode)}
            </p>
            <div className="flex items-center gap-0.5">
              {isPrimaryNeutral ? (
                <Minus className="w-3 h-3 text-muted-foreground" />
              ) : isPrimaryPositive ? (
                <TrendingUp className={`w-3 h-3 ${primaryTrendColor}`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${primaryTrendColor}`} />
              )}
              <span className={`text-xs font-medium ${primaryTrendColor}`}>
                {Math.abs(primaryChange).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Разделитель — белый, толстый */}
        <div className="h-[3px] bg-white rounded-full" />
        
        {/* Производная метрика (cost per) — выравнивание по правому краю */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {secondaryName}
          </p>
          <div className="flex items-baseline gap-2 justify-end">
            <p className="text-lg font-semibold text-foreground">
              {formatMetricValue(secondaryValue, secondaryId, currencyCode)}
            </p>
            <div className="flex items-center gap-0.5">
              {isSecondaryNeutral ? (
                <Minus className="w-2.5 h-2.5 text-muted-foreground" />
              ) : isSecondaryPositive ? (
                <TrendingUp className={`w-2.5 h-2.5 ${secondaryTrendColor}`} />
              ) : (
                <TrendingDown className={`w-2.5 h-2.5 ${secondaryTrendColor}`} />
              )}
              <span className={`text-xs ${secondaryTrendColor}`}>
                {Math.abs(secondaryChange).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

// Карточка конверсий — показывает все типы конверсий с опциональным CPA
interface ConversionsCardProps {
  variants: Array<{ metricId: string; value: number; changePercent: number | null }>;
  currencyCode?: string | null;
  cpaMetricId?: string;
  cpaValue?: number;
  cpaChange?: number;
}

const ConversionsCard = memo(function ConversionsCard({ 
  variants, 
  currencyCode,
  cpaMetricId,
  cpaValue = 0,
  cpaChange = 0
}: ConversionsCardProps) {
  const hasCpa = !!cpaMetricId;
  const cpaTrendColor = getMetricChangeColorClass(cpaMetricId || 'cost_per_result', cpaChange);
  const isCpaPositive = cpaChange > 0;
  const isCpaNeutral = cpaChange === 0;
  
  // Если нет вариантов - показываем карточку с 0
  if (variants.length === 0) {
    return (
      <Card
        className="p-4 hover:shadow-md transition-shadow"
        data-testid="metric-card-conversions"
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">
            Conversions
          </p>
          <p className="text-2xl font-bold text-foreground">
            0
          </p>
          {hasCpa && (
            <>
              <div className="h-[3px] bg-white rounded-full" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Cost per Result
                </p>
                <div className="flex items-baseline gap-2 justify-end">
                  <p className="text-lg font-semibold text-foreground">
                    {formatMetricValue(cpaValue, cpaMetricId!, currencyCode)}
                  </p>
                  <div className="flex items-center gap-0.5">
                    {isCpaNeutral ? (
                      <Minus className="w-2.5 h-2.5 text-muted-foreground" />
                    ) : isCpaPositive ? (
                      <TrendingUp className={`w-2.5 h-2.5 ${cpaTrendColor}`} />
                    ) : (
                      <TrendingDown className={`w-2.5 h-2.5 ${cpaTrendColor}`} />
                    )}
                    <span className={`text-xs ${cpaTrendColor}`}>
                      {Math.abs(cpaChange).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          {!hasCpa && (
            <>
              <div className="h-[3px] bg-white rounded-full" />
              <div className="text-xs text-muted-foreground text-right">
                No conversion data
              </div>
            </>
          )}
        </div>
      </Card>
    );
  }
  
  // Главная конверсия (с максимальным значением)
  const main = variants[0];
  const mainTrendColor = getMetricChangeColorClass(main.metricId, main.changePercent || 0);
  const isPositive = (main.changePercent || 0) > 0;
  const isNeutral = (main.changePercent || 0) === 0;
  
  // Сумма всех конверсий
  const totalConversions = variants.reduce((sum, v) => sum + v.value, 0);
  
  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow"
      data-testid="metric-card-conversions"
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">
          Conversions
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-foreground">
            {totalConversions.toLocaleString()}
          </p>
          {/* Тренд основной конверсии */}
          <div className="flex items-center gap-0.5">
            {isNeutral ? (
              <Minus className="w-3 h-3 text-muted-foreground" />
            ) : isPositive ? (
              <TrendingUp className={`w-3 h-3 ${mainTrendColor}`} />
            ) : (
              <TrendingDown className={`w-3 h-3 ${mainTrendColor}`} />
            )}
            <span className={`text-xs font-medium ${mainTrendColor}`}>
              {Math.abs(main.changePercent || 0).toFixed(1)}%
            </span>
          </div>
        </div>
        
        {/* CPA секция если есть */}
        {hasCpa && (
          <>
            <div className="h-[3px] bg-white rounded-full" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Cost per Result
              </p>
              <div className="flex items-baseline gap-2 justify-end">
                <p className="text-lg font-semibold text-foreground">
                  {formatMetricValue(cpaValue, cpaMetricId!, currencyCode)}
                </p>
                <div className="flex items-center gap-0.5">
                  {isCpaNeutral ? (
                    <Minus className="w-2.5 h-2.5 text-muted-foreground" />
                  ) : isCpaPositive ? (
                    <TrendingUp className={`w-2.5 h-2.5 ${cpaTrendColor}`} />
                  ) : (
                    <TrendingDown className={`w-2.5 h-2.5 ${cpaTrendColor}`} />
                  )}
                  <span className={`text-xs ${cpaTrendColor}`}>
                    {Math.abs(cpaChange).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Детализация по типам конверсий (показываем только если нет CPA или много типов) */}
        {(!hasCpa || variants.length > 1) && (
          <div className="space-y-1 pt-1 border-t border-border/50">
            {variants.slice(0, hasCpa ? 2 : 4).map((v) => {
              const name = formatMetricName(v.metricId);
              return (
                <div key={v.metricId} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground truncate max-w-[120px]" title={name}>
                    {name}
                  </span>
                  <span className="font-medium text-foreground">
                    {v.value.toLocaleString()}
                  </span>
                </div>
              );
            })}
            {variants.length > (hasCpa ? 2 : 4) && (
              <div className="text-xs text-muted-foreground">
                +{variants.length - (hasCpa ? 2 : 4)} more
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

function DashboardMetricCardsInner({ report, periodA, periodB, dataView, currencyCode, crmMetrics, crmName }: DashboardMetricCardsProps) {
  const availableMetricIds = useAppSelector(selectAvailableMetricIds);

  // Расширяем availableMetricIds с CRM метриками
  const extendedAvailableMetricIds = useMemo(() => {
    const crmMetricIds = [
      'crm_leads', 'crm_leads_unique', 'cpl',
      'crm_deals', 'crm_deals_won', 'crm_conversion_rate', 'crm_win_rate',
      'crm_revenue', 'crm_avg_deal_value', 'crm_roi', 'crm_roas',
      'crm_match_rate', 'crm_matched_leads', 'crm_unmatched_leads',
      'crm_leads_fb_lead_ads', 'crm_leads_fbclid', 'crm_leads_utm'
    ];
    return [...availableMetricIds, ...crmMetricIds];
  }, [availableMetricIds]);

  // Извлекаем metricsData из dataView для выбора метрики с наибольшим количеством выполнений
  const metricsDataFromView = useMemo(() => {
    if (!dataView?.filteredTableData) return undefined;
    
    const result: Record<string, Record<string, Record<string, number>>> = {};
    dataView.filteredTableData.forEach(row => {
      result[row.date] = {};
      row.items.forEach(item => {
        result[row.date][item.id] = item.metrics;
      });
    });
    return result;
  }, [dataView?.filteredTableData]);

  // Мемоизируем список метрик для отображения с автоподстановкой релевантных
  const metricsToDisplay = useMemo(() => {
    const sourceMetrics = (report.metricCards && report.metricCards.length > 0)
      ? [...report.metricCards]
          .sort((a, b) => a.order - b.order)
          .map(mc => ({ id: mc.metricId, format: 'number', pairedWith: undefined as string | undefined }))
      : DEFAULT_METRICS.map(m => ({ id: m.id, format: m.format, pairedWith: m.pairedWith }));

    // Собираем set метрик которые являются pairedWith (их не рендерим отдельно)
    const pairedMetricIds = new Set(sourceMetrics.map(m => m.pairedWith).filter(Boolean));

    // Фильтруем и резолвим generic метрики на реальные из БД
    return sourceMetrics
      .filter(metric => {
        // Не рендерим pairedWith метрики отдельно
        if (pairedMetricIds.has(metric.id)) {
          return false;
        }
        // CRM метрики всегда доступны если crmMetrics передан
        if (metric.id.startsWith('crm_') || metric.id === 'cpl') {
          return !!crmMetrics;
        }
        // Conversions всегда показываем (даже с 0)
        if (metric.id === 'conversions' || metric.id === 'results') {
          return true;
        }
        // Если данные не загружены — показываем все
        if (availableMetricIds.length === 0) return true;
        return isMetricResolvable(metric.id, availableMetricIds);
      })
      .map(metric => {
        // CRM метрики не резолвим
        if (metric.id.startsWith('crm_') || metric.id === 'cpl') {
          return {
            id: metric.id,
            name: getMetricName(metric.id),
            format: metric.format,
            pairedWith: metric.pairedWith
          };
        }
        // Conversions/results (количество) НЕ резолвим — используем ConversionsCard
        if (metric.id === 'conversions' || metric.id === 'results') {
          return {
            id: metric.id,
            name: getMetricName(metric.id),
            format: metric.format,
            pairedWith: metric.pairedWith
          };
        }
        const resolvedId = resolveMetric(metric.id, availableMetricIds, metricsDataFromView);
        return {
          id: resolvedId,
          name: getMetricName(resolvedId),
          format: metric.format,
          pairedWith: metric.pairedWith
        };
      });
  }, [report.metricCards, availableMetricIds, metricsDataFromView, crmMetrics]);

  // Получаем все варианты конверсий для карточки Conversions
  const conversionVariants = useMemo(() => {
    if (!dataView?.aggregatedMetrics) return [];
    return getAllConversionVariants(availableMetricIds, dataView.aggregatedMetrics);
  }, [availableMetricIds, dataView?.aggregatedMetrics]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {metricsToDisplay.map((metric) => {
        // Для карточки конверсий показываем специальный компонент со всеми типами
        const isConversionsMetric = 
          metric.id === 'conversions' || 
          metric.id === 'results' || 
          metric.id.startsWith('conversions_') || 
          metric.id.startsWith('results_');
        
        // Conversions с pairedWith (CPA) — используем специальную ConversionsCard с CPA
        if (isConversionsMetric && metric.pairedWith) {
          // Получаем данные для CPA
          let cpaValue = 0;
          let cpaChange = 0;
          if (dataView) {
            // CPR по логической группе конверсий: spend / сумма всех конверсий (conversionVariants)
            const totalConversions = conversionVariants.reduce((sum, v) => sum + v.value, 0);
            const spendTotal = dataView.aggregatedMetrics['spend']?.total || 0;
            if (totalConversions > 0 && spendTotal > 0) {
              cpaValue = spendTotal / totalConversions;
            }

            // changePercent для производной метрики не считаем (нужны totals за Period B);
            // но если есть реальный cost_per_result_* — можем использовать его как индикатор.
            const resolvedCpaMetricId = resolveMetric(metric.pairedWith, availableMetricIds, metricsDataFromView);
            cpaChange = dataView.aggregatedMetrics[resolvedCpaMetricId]?.changePercent || 0;
          }
          
          return (
            <ConversionsCard
              key="conversions-card"
              variants={conversionVariants}
              currencyCode={currencyCode}
              cpaMetricId={metric.pairedWith}
              cpaValue={cpaValue}
              cpaChange={cpaChange}
            />
          );
        }
        
        // Обычная ConversionsCard без CPA
        if (isConversionsMetric) {
          return (
            <ConversionsCard
              key="conversions-card"
              variants={conversionVariants}
              currencyCode={currencyCode}
            />
          );
        }
        
        // CRM метрики получаем из crmMetrics
        const isCrmMetric = metric.id.startsWith('crm_') || metric.id === 'cpl';
        
        let current = 0;
        let percentChange = 0;

        if (isCrmMetric && crmMetrics?.totals) {
          // CRM метрики
          const crmValue = crmMetrics.totals[metric.id as keyof typeof crmMetrics.totals];
          current = typeof crmValue === 'number' ? crmValue : 0;
          // TODO: Для percentChange нужен Period B из CRM
          percentChange = 0;
        } else if (dataView) {
          // FB метрики из dataView
          current = dataView.aggregatedMetrics[metric.id]?.total || 0;
          percentChange = dataView.aggregatedMetrics[metric.id]?.changePercent || 0;
        } else {
          // Fallback для старой логики
          const result = calculateMetricChange(
            report.selections,
            report.activeTab,
            metric.id,
            periodA,
            periodB
          );
          current = result.current;
          percentChange = result.percentChange;
        }

        // Paired metric card (например Clicks + CPC)
        if (metric.pairedWith) {
          let secondaryValue = 0;
          let secondaryChange = 0;
          if (dataView) {
            secondaryValue = dataView.aggregatedMetrics[metric.pairedWith]?.total || 0;
            secondaryChange = dataView.aggregatedMetrics[metric.pairedWith]?.changePercent || 0;
          }
          
          return (
            <PairedMetricCard
              key={metric.id}
              primaryId={metric.id}
              primaryName={metric.name}
              primaryValue={current}
              primaryChange={percentChange}
              secondaryId={metric.pairedWith}
              secondaryName={getMetricName(metric.pairedWith)}
              secondaryValue={secondaryValue}
              secondaryChange={secondaryChange}
              currencyCode={currencyCode}
            />
          );
        }

        return (
          <MetricCard
            key={metric.id}
            metricId={metric.id}
            metricName={metric.name}
            current={current}
            percentChange={percentChange}
            currencyCode={currencyCode}
          />
        );
      })}
    </div>
  );
}

const DashboardMetricCards = memo(DashboardMetricCardsInner);
export default DashboardMetricCards;