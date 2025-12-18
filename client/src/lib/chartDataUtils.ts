import type { TabType, ReportSelections } from "@/store/slices/reportsSlice";
import type { DateRange } from "react-day-picker";
import type { AnalyticsDataView, AnalyticsDateRow } from "@/hooks/useAnalyticsDataView";
import { sanitizeMetricValue } from "@/lib/metricSanitizer";

export interface ChartDataPoint {
  date: string;
  period: 'A' | 'B'; // К какому периоду относится точка
  [key: string]: string | number;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  percentage: number;
  [key: string]: unknown; // индексная сигнатура для совместимости с recharts
}

// Парсинг даты формата DD.MM.YYYY
const parseDate = (d: string): number => {
  const [day, month, year] = d.split('.').map(Number);
  return new Date(year, month - 1, day).getTime();
};

function calculateMetricsForDateRow(
  dateRow: AnalyticsDateRow,
  metricIds: string[],
  suffix: string = ''
): Record<string, number> {
  const result: Record<string, number> = {};
  metricIds.forEach(metricId => {
    const key = suffix ? `${metricId}${suffix}` : metricId;
    result[key] = sanitizeMetricValue(dateRow.metrics[metricId]);
  });
  return result;
}

/**
 * Подготовка данных для графиков временных рядов.
 * 
 * При сравнении периодов (periodB существует):
 * - Данные ВЫРАВНИВАЮТСЯ по индексу дня (день 1, день 2, ...)
 * - Period A = основные метрики (spend, clicks, ...)
 * - Period B = метрики с суффиксом _prev (spend_prev, clicks_prev, ...)
 * - Ось X показывает даты Period A
 * - Линии накладываются друг на друга для сравнения
 */
export function prepareTimeSeriesData(
  selections: ReportSelections,
  activeTab: TabType,
  metricIds: string[],
  periodA?: DateRange,
  periodB?: DateRange,
  alignment: string = "previous",
  dataView?: AnalyticsDataView
): ChartDataPoint[] {
  if (!dataView) return [];

  const rowsA = dataView.filteredTableData;
  const rowsB = dataView.filteredPreviousPeriodData || [];

  // Сортируем по дате
  const sortedRowsA = [...rowsA].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const sortedRowsB = [...rowsB].sort((a, b) => parseDate(a.date) - parseDate(b.date));

  const dataPoints: ChartDataPoint[] = [];

  // Создаём точки данных с выравниванием по индексу
  for (let i = 0; i < sortedRowsA.length; i++) {
    const rowA = sortedRowsA[i];
    const rowB = sortedRowsB[i]; // Может быть undefined если периоды разной длины
    
    const dataPoint: ChartDataPoint = { 
      date: rowA.date, // Показываем дату Period A на оси X
      period: 'A',
    };
    
    // Метрики Period A (основные)
    metricIds.forEach(metricId => {
      dataPoint[metricId] = sanitizeMetricValue(rowA.metrics[metricId]);
    });
    
    // Метрики Period B (с суффиксом _prev) - если есть данные
    if (rowB) {
      metricIds.forEach(metricId => {
        dataPoint[`${metricId}_prev`] = sanitizeMetricValue(rowB.metrics[metricId]);
      });
    }
    
    dataPoints.push(dataPoint);
  }

  return dataPoints;
}

export function preparePieChartData(
  selections: ReportSelections,
  activeTab: TabType,
  metricIds: string[],
  metricLabels: Record<string, string>,
  period?: DateRange,
  dataView?: AnalyticsDataView
): PieChartDataPoint[] {
  if (!dataView) return [];

  // Use aggregatedMetrics from dataView which already sums up filtered items
  const aggregated = dataView.aggregatedMetrics;
  
  // Calculate total for percentage
  let total = 0;
  metricIds.forEach(metricId => {
    total += sanitizeMetricValue(aggregated[metricId]?.total);
  });

  if (total === 0) return [];

  return metricIds
    .map(metricId => ({
      name: metricLabels[metricId] || metricId,
      value: sanitizeMetricValue(aggregated[metricId]?.total),
      percentage: total === 0 ? 0 : (sanitizeMetricValue(aggregated[metricId]?.total) / total) * 100,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function calculateMetricChange(
  selections: ReportSelections,
  activeTab: TabType,
  metricId: string,
  periodA?: DateRange,
  periodB?: DateRange,
  dataView?: AnalyticsDataView
): { current: number; previous: number; percentChange: number } {
  if (!dataView) return { current: 0, previous: 0, percentChange: 0 };

  const metricData = dataView.aggregatedMetrics[metricId];
  if (!metricData) return { current: 0, previous: 0, percentChange: 0 };

  return {
    current: sanitizeMetricValue(metricData.total),
    previous: sanitizeMetricValue(metricData.total) - sanitizeMetricValue(metricData.change || 0),
    percentChange: sanitizeMetricValue(metricData.changePercent || 0)
  };
}
