import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Plus, X, Pin, ChevronLeft, ChevronRight } from "lucide-react";
import type { ChartSlotConfig, Report, ChartType } from "@/store/slices/reportsSlice";
import { updateChartBrushRange } from "@/store/slices/reportsSlice";
import { 
  LineChartWidget, 
  BarChartWidget, 
  AreaChartWidget, 
  PieChartWidget,
  MixedChartWidget,
  ScatterChartWidget,
  RadarChartWidget,
  FunnelChartWidget
} from "@/components/ChartWidgets";
import { prepareTimeSeriesData, preparePieChartData } from "@/lib/chartDataUtils";
import { metricCategories, formatMetricName } from "@/data/metrics";
import type { DateRange } from "react-day-picker";
import type { AnalyticsDataView } from "@/hooks/useAnalyticsDataView";
import type { KommoCrmMetrics } from "@/api/kommo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { validateMetricsForChart } from "@/lib/chartValidationRules";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectAvailableMetricIds } from "@/store/selectors";
import { resolveMetrics, filterResolvableMetrics } from "@/lib/resolveMetrics";

const CHART_TYPES: ChartType[] = ['line', 'bar', 'area', 'pie', 'mixed', 'scatter', 'radar', 'funnel'];
const CHART_TYPE_LABELS: Record<ChartType, string> = {
  line: 'Line Chart',
  bar: 'Bar Chart',
  area: 'Area Chart',
  pie: 'Pie Chart',
  mixed: 'Mixed Chart',
  scatter: 'Scatter Plot',
  radar: 'Radar Chart',
  funnel: 'Funnel Chart',
};

// Мемоизированные лейблы метрик — создаются один раз
const metricLabels = metricCategories.reduce((acc, category) => {
  if (category.metrics) {
    category.metrics.forEach(metric => {
      acc[metric.id] = metric.name;
    });
  }
  if (category.subcategories) {
    category.subcategories.forEach(subcategory => {
      subcategory.metrics.forEach(metric => {
        acc[metric.id] = metric.name;
      });
    });
  }
  return acc;
}, {} as Record<string, string>);

// Получить имя метрики с fallback на formatMetricName для динамических
const getMetricLabel = (metricId: string): string => {
  return metricLabels[metricId] || formatMetricName(metricId);
};

interface ChartSlotProps {
  slotIndex: number;
  slotConfig: ChartSlotConfig | null;
  report: Report;
  periodA?: DateRange;
  periodB?: DateRange;
  alignment?: string;
  dataView?: AnalyticsDataView;
  crmMetrics?: KommoCrmMetrics | null;
  crmName?: string;
  onConfigure: () => void;
  onRemove: () => void;
  onChartTypeChange: (chartType: ChartType | undefined) => void;
}

function ChartSlotInner({
  slotIndex,
  slotConfig,
  report,
  periodA,
  periodB,
  alignment = "previous",
  dataView,
  crmMetrics,
  crmName,
  onConfigure,
  onRemove,
  onChartTypeChange,
}: ChartSlotProps) {
  const dispatch = useAppDispatch();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const availableMetricIds = useAppSelector(selectAvailableMetricIds);
  
  // Callback for brush changes - saves to Redux for instant responsiveness
  const handleBrushChange = useCallback((startIndex: number, endIndex: number) => {
    dispatch(updateChartBrushRange({
      projectId: report.projectId,
      reportId: report.id,
      slotIndex,
      brushStartIndex: startIndex,
      brushEndIndex: endIndex,
    }));
  }, [dispatch, report.projectId, report.id, slotIndex]);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

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

  // Резолвим generic метрики (conversions → conversions_purchase и т.д.)
  // Теперь выбирает вариант с наибольшим количеством выполнений
  const resolvedMetrics = useMemo(() => {
    if (!slotConfig?.metrics) return [];
    // Фильтруем метрики, которых нет в данных
    // Но всегда оставляем conversions/results чтобы график показывался (даже с 0)
    const filtered = availableMetricIds.length > 0 
      ? slotConfig.metrics.filter(m => 
          m === 'conversions' || m === 'results' || 
          filterResolvableMetrics([m], availableMetricIds).length > 0
        )
      : slotConfig.metrics;
    return resolveMetrics(filtered, availableMetricIds, metricsDataFromView);
  }, [slotConfig?.metrics, availableMetricIds, metricsDataFromView]);

  // Динамические лейблы с учётом резолва
  const resolvedMetricLabels = useMemo(() => {
    const labels: Record<string, string> = { ...metricLabels };
    resolvedMetrics.forEach(id => {
      if (!labels[id]) {
        labels[id] = getMetricLabel(id);
      }
    });
    return labels;
  }, [resolvedMetrics]);

  // Мемоизация данных для графиков — пересчёт только при изменении зависимостей
  const chartData = useMemo(() => {
    if (!slotConfig || !dataView) return null;
    
    const metrics = resolvedMetrics;
    if (metrics.length === 0) return null;

    return {
      timeSeriesData: prepareTimeSeriesData(
        report.selections, 
        report.activeTab, 
        metrics, 
        periodA, 
        periodB, 
        alignment, 
        dataView
      ),
      pieData: preparePieChartData(
        report.selections, 
        report.activeTab, 
        metrics, 
        resolvedMetricLabels, 
        periodA, 
        dataView
      ),
    };
  }, [
    resolvedMetrics.join(','),
    report.selections,
    report.activeTab,
    periodA?.from?.getTime(),
    periodA?.to?.getTime(),
    periodB?.from?.getTime(),
    periodB?.to?.getTime(),
    alignment,
    dataView?.filteredTableData?.length,
    dataView?.filteredPreviousPeriodData?.length,
    resolvedMetricLabels,
  ]);

  if (!slotConfig) {
    return (
      <Card 
        className="p-4 border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors flex flex-col items-center justify-center min-h-[300px] w-full lg:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.667rem)]"
        data-testid={`chart-slot-empty-${slotIndex}`}
      >
        <Plus className="w-12 h-12 text-muted-foreground/40 mb-2" />
        <p className="text-muted-foreground text-sm mb-4">Drag a chart here</p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onConfigure}
          data-testid={`button-add-chart-${slotIndex}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Chart
        </Button>
      </Card>
    );
  }

  const renderSingleChart = (chartType: ChartType) => {
    const { showLegend = true, showGrid = true } = slotConfig;

    const validation = validateMetricsForChart(chartType, resolvedMetrics);
    const validatedMetrics = validation.filteredMetrics;

    if (!validation.isValid || validatedMetrics.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-center p-8">
          <div>
            <p className="text-muted-foreground font-medium mb-2">{validation.reason}</p>
            <p className="text-sm text-muted-foreground/80">{validation.warning}</p>
          </div>
        </div>
      );
    }

    // Используем мемоизированные данные
    const timeSeriesData = chartData?.timeSeriesData || [];
    const pieData = chartData?.pieData || [];

    switch (chartType) {
      case 'line': {
        return (
          <LineChartWidget
            data={timeSeriesData}
            metricKeys={validatedMetrics}
            metricLabels={resolvedMetricLabels}
            showLegend={showLegend}
            showGrid={showGrid}
            showComparison={!!periodB}
            warning={validation.warning}
            warningReason={validation.reason}
            initialBrushStart={slotConfig?.brushStartIndex}
            initialBrushEnd={slotConfig?.brushEndIndex}
            onBrushChange={handleBrushChange}
          />
        );
      }

      case 'bar': {
        return (
          <BarChartWidget
            data={timeSeriesData}
            metricKeys={validatedMetrics}
            metricLabels={resolvedMetricLabels}
            showLegend={showLegend}
            showGrid={showGrid}
            showComparison={!!periodB}
            warning={validation.warning}
            warningReason={validation.reason}
            initialBrushStart={slotConfig?.brushStartIndex}
            initialBrushEnd={slotConfig?.brushEndIndex}
            onBrushChange={handleBrushChange}
          />
        );
      }

      case 'area': {
        return (
          <AreaChartWidget
            data={timeSeriesData}
            metricKeys={validatedMetrics}
            metricLabels={resolvedMetricLabels}
            showLegend={showLegend}
            showGrid={showGrid}
            showComparison={!!periodB}
            warning={validation.warning}
            warningReason={validation.reason}
            initialBrushStart={slotConfig?.brushStartIndex}
            initialBrushEnd={slotConfig?.brushEndIndex}
            onBrushChange={handleBrushChange}
          />
        );
      }

      case 'pie': {
        return (
          <PieChartWidget
            data={pieData}
            showLegend={showLegend}
            warning={validation.warning}
            warningReason={validation.reason}
          />
        );
      }

      case 'mixed': {
        const midPoint = validatedMetrics.length === 1 ? 1 : Math.ceil(validatedMetrics.length / 2);
        const lineMetrics = validatedMetrics.slice(0, midPoint);
        const barMetrics = validatedMetrics.slice(midPoint);
        return (
          <MixedChartWidget
            data={timeSeriesData}
            lineMetrics={lineMetrics}
            barMetrics={barMetrics}
            metricLabels={resolvedMetricLabels}
            showLegend={showLegend}
            showGrid={showGrid}
            showComparison={!!periodB}
            warning={validation.warning}
            initialBrushStart={slotConfig?.brushStartIndex}
            initialBrushEnd={slotConfig?.brushEndIndex}
            onBrushChange={handleBrushChange}
            warningReason={validation.reason}
          />
        );
      }

      case 'scatter': {
        const xKey = validatedMetrics[0] || 'impressions';
        const yKey = validatedMetrics[1] || 'clicks';
        const zKey = validatedMetrics[2];
        return (
          <ScatterChartWidget
            data={timeSeriesData}
            xKey={xKey}
            yKey={yKey}
            zKey={zKey}
            metricLabels={resolvedMetricLabels}
            showLegend={showLegend}
            showGrid={showGrid}
            showComparison={!!periodB}
            warning={validation.warning}
            warningReason={validation.reason}
          />
        );
      }

      case 'radar': {
        // Calculate average values for each metric across time period
        const avgValues: Record<string, number> = {};
        const avgValuesPrev: Record<string, number> = {};
        
        validatedMetrics.forEach(metric => {
          const sum = timeSeriesData.reduce((acc, row) => acc + ((row[metric] as number) || 0), 0);
          avgValues[metric] = timeSeriesData.length > 0 ? sum / timeSeriesData.length : 0;
          
          if (periodB) {
            const sumPrev = timeSeriesData.reduce((acc, row) => acc + ((row[`${metric}_prev`] as number) || 0), 0);
            avgValuesPrev[metric] = timeSeriesData.length > 0 ? sumPrev / timeSeriesData.length : 0;
          }
        });
        
        const radarFormattedData = validatedMetrics.map(metric => ({
          subject: metricLabels[metric] || metric,
          value: avgValues[metric],
          ...(periodB && { value_prev: avgValuesPrev[metric] }),
        }));
        
        return (
          <RadarChartWidget
            data={radarFormattedData}
            metrics={periodB ? ['value', 'value_prev'] : ['value']}
            metricLabels={{ value: 'Current', value_prev: 'Prev.' }}
            showLegend={showLegend}
            showComparison={!!periodB}
            warning={validation.warning}
            warningReason={validation.reason}
          />
        );
      }

      case 'funnel': {
        // CRM метрики для funnel — берём из crmMetrics.totals
        const CRM_METRIC_IDS = new Set([
          'crm_leads', 'crm_leads_unique', 'cpl',
          'crm_deals', 'crm_deals_won', 'crm_conversion_rate', 'crm_win_rate',
          'crm_revenue', 'crm_avg_deal_value', 'crm_roi', 'crm_roas',
          'crm_match_rate', 'crm_matched_leads', 'crm_unmatched_leads',
          'crm_leads_fb_lead_ads', 'crm_leads_fbclid', 'crm_leads_utm',
        ]);
        
        const isCrmMetric = (id: string) => CRM_METRIC_IDS.has(id) || id.startsWith('crm_');
        
        // Prepare funnel data: each metric becomes a funnel stage with average value
        const funnelData = validatedMetrics.map(metric => {
          let value = 0;
          let valuePrev = 0;
          
          if (isCrmMetric(metric) && crmMetrics?.totals) {
            // CRM метрики — берём из totals
            value = crmMetrics.totals[metric as keyof typeof crmMetrics.totals] ?? 0;
            // TODO: для сравнения периодов нужен отдельный запрос
          } else {
            // FB метрики — считаем среднее из timeseries
            const sum = timeSeriesData.reduce((acc, row) => acc + ((row[metric] as number) || 0), 0);
            value = timeSeriesData.length > 0 ? sum / timeSeriesData.length : 0;
            
            if (periodB) {
              const sumPrev = timeSeriesData.reduce((acc, row) => acc + ((row[`${metric}_prev`] as number) || 0), 0);
              valuePrev = timeSeriesData.length > 0 ? sumPrev / timeSeriesData.length : 0;
            }
          }
          
          return {
            name: metricLabels[metric] || metric,
            value,
            ...(periodB && !isCrmMetric(metric) && { valuePrev }),
          };
        });
        return (
          <FunnelChartWidget
            data={funnelData}
            showLegend={showLegend}
            showComparison={!!periodB}
            warning={validation.warning}
            warningReason={validation.reason}
          />
        );
      }

      default:
        return null;
    }
  };

  const { metrics } = slotConfig;

  if (metrics.length === 0) {
    return (
      <Card 
        className="p-4 min-h-[300px] flex flex-col w-full lg:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.667rem)]"
        data-testid={`chart-slot-${slotIndex}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground" data-testid={`chart-title-${slotIndex}`}>
            {slotConfig.title || `Chart ${slotIndex + 1}`}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onConfigure}
              data-testid={`button-configure-chart-${slotIndex}`}
              className="h-8 w-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              data-testid={`button-remove-chart-${slotIndex}`}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No metrics selected. Click settings to configure.
        </div>
      </Card>
    );
  }

  const pinnedChartType = slotConfig.chartType;

  return (
    <Card 
      className="p-4 flex flex-col overflow-hidden w-full lg:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.667rem)]"
      data-testid={`chart-slot-${slotIndex}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground" data-testid={`chart-title-${slotIndex}`}>
            {slotConfig.title || `Chart ${slotIndex + 1}`}
          </h3>
          {pinnedChartType && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {CHART_TYPE_LABELS[pinnedChartType]}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => pinnedChartType ? onChartTypeChange(undefined) : onChartTypeChange(CHART_TYPES[current])}
            data-testid={`button-pin-chart-${slotIndex}`}
            className="h-8 w-8"
            title={pinnedChartType ? "Unpin chart" : "Pin current chart type"}
          >
            <Pin className={`w-4 h-4 ${pinnedChartType ? 'text-blue-500 fill-blue-500' : 'text-muted-foreground'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onConfigure}
            data-testid={`button-configure-chart-${slotIndex}`}
            className="h-8 w-8"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            data-testid={`button-remove-chart-${slotIndex}`}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {pinnedChartType ? (
        <div className="flex-1 h-[400px] w-full">
          {renderSingleChart(pinnedChartType)}
        </div>
      ) : (
        <Carousel
          setApi={setApi}
          className="w-full"
          opts={{
            align: "start",
            loop: false,
            watchDrag: false,
            watchResize: false,
            watchSlides: false,
          }}
        >
          <CarouselContent>
            {CHART_TYPES.map((chartType) => (
              <CarouselItem 
                key={chartType}
                data-testid={`chart-slide-${chartType}-${slotIndex}`}
              >
                <div className="h-[400px] w-full">
                  {renderSingleChart(chartType)}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => api?.scrollPrev()}
              disabled={current === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              data-testid={`carousel-prev-${slotIndex}`}
              aria-label="Previous chart"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {CHART_TYPES.map((chartType, index) => (
                <button
                  key={chartType}
                  onClick={() => api?.scrollTo(index)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    current === index 
                      ? 'bg-primary w-6' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  data-testid={`dot-navigation-${chartType}-${slotIndex}`}
                  aria-label={`Go to ${CHART_TYPE_LABELS[chartType]}`}
                />
              ))}
            </div>
            <button
              onClick={() => api?.scrollNext()}
              disabled={current === CHART_TYPES.length - 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              data-testid={`carousel-next-${slotIndex}`}
              aria-label="Next chart"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </Carousel>
      )}
    </Card>
  );
}

// Мемоизированный компонент для предотвращения лишних ререндеров
const ChartSlot = memo(ChartSlotInner);
export default ChartSlot;