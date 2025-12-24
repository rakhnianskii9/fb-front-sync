/**
 * Экспорт всех виджетов
 * 
 * Базовые виджеты:
 * - WidgetWrapper — обёртка с loading/error
 * - MetricCardWidget — карточка метрики
 * - MetricCardsGroup — группа карточек KPI
 * - LineChartWidget — линейный график
 * - BarChartWidget — столбчатый график
 * - DataTableWidget — таблица с фильтрами
 * 
 * Специфические виджеты (из документации):
 * - FunnelGaugeWidget — воронка FB→CRM + Plan/Fact (Workspace 1: Overview)
 * - TreemapTreeWidget — Treemap/Tree attribution paths (Workspace 2: Attribution)
 * - CompareBarWidget — Grouped/Stacked bar N×M (Workspace 3: Compare)
 * - ROMIByCreativeWidget — ROMI by Creative таблица
 * - ScatterBubbleWidget — корреляция метрик (CPR vs Spend)
 * - HistogramWidget — распределение (Time to Convert)
 * - PieDonutWidget — Pie/Donut распределение
 */

// Базовые
export { WidgetWrapper, type WidgetWrapperProps } from './WidgetWrapper';
export { MetricCardWidget, type MetricCardWidgetProps } from './MetricCardWidget';
export { MetricCardsGroup, type MetricCardsGroupProps, type MetricConfig } from './MetricCardsGroup';
export { LineChartWidget, type LineChartWidgetProps } from './LineChartWidget';
export { BarChartWidget, type BarChartWidgetProps } from './BarChartWidget';
export { DataTableWidget, type DataTableWidgetProps } from './DataTableWidget';

// Специфические (ECharts-based из документации)
export { FunnelGaugeWidget } from './FunnelGaugeWidget';
export { TreemapTreeWidget } from './TreemapTreeWidget';
export { CompareBarWidget } from './CompareBarWidget';
export { ROMIByCreativeWidget } from './ROMIByCreativeWidget';
export { ScatterBubbleWidget } from './ScatterBubbleWidget';
export { HistogramWidget } from './HistogramWidget';
export { PieDonutWidget } from './PieDonutWidget';

