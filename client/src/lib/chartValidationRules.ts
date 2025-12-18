export type MetricType = 'absolute' | 'ratio' | 'percentage' | 'currency';
export type MetricCategory = 'traffic' | 'money' | 'performance';

export interface MetricDefinition {
  key: string;
  type: MetricType;
  category: MetricCategory;
  isSequential?: boolean;
}

/**
 * Паттерны для распознавания динамических метрик из БД.
 * Метрики типа conversions_purchase, actions_link_click и т.д.
 * определяются по префиксу и получают тип/категорию от базовой метрики.
 */
const DYNAMIC_METRIC_PATTERNS: { prefix: string; baseMetric: string }[] = [
  // Conversions & Results
  { prefix: 'conversions_', baseMetric: 'conversions' },
  { prefix: 'cost_per_conversion_', baseMetric: 'cost_per_conversion' },
  { prefix: 'results_', baseMetric: 'results' },
  { prefix: 'result_rate_', baseMetric: 'result_rate' },
  { prefix: 'cost_per_result_', baseMetric: 'cost_per_result' },
  // Actions
  { prefix: 'actions_', baseMetric: 'actions' },
  { prefix: 'unique_actions_', baseMetric: 'unique_actions' },
  { prefix: 'cost_per_action_type_', baseMetric: 'cost_per_action_type' },
  { prefix: 'cost_per_unique_action_type_', baseMetric: 'cost_per_unique_action_type' },
  // Video
  { prefix: 'video_play_actions_', baseMetric: 'video_play_actions' },
  { prefix: 'video_p25_watched_actions_', baseMetric: 'video_p25_watched_actions' },
  { prefix: 'video_p50_watched_actions_', baseMetric: 'video_p50_watched_actions' },
  { prefix: 'video_p75_watched_actions_', baseMetric: 'video_p75_watched_actions' },
  { prefix: 'video_p95_watched_actions_', baseMetric: 'video_p95_watched_actions' },
  { prefix: 'video_p100_watched_actions_', baseMetric: 'video_p100_watched_actions' },
  { prefix: 'video_thruplay_watched_actions_', baseMetric: 'video_thruplay_watched_actions' },
  { prefix: 'video_30_sec_watched_actions_', baseMetric: 'video_30_sec_watched_actions' },
  { prefix: 'video_avg_time_watched_actions_', baseMetric: 'video_avg_time_watched_actions' },
  { prefix: 'cost_per_thruplay_', baseMetric: 'cost_per_thruplay' },
  { prefix: 'cost_per_15_sec_video_view_', baseMetric: 'cost_per_15_sec_video_view' },
  // Outbound clicks
  { prefix: 'outbound_clicks_', baseMetric: 'outbound_clicks' },
  { prefix: 'unique_outbound_clicks_', baseMetric: 'unique_outbound_clicks' },
  // Products
  { prefix: 'converted_product_', baseMetric: 'converted_product_quantity' },
];

/**
 * Получить определение метрики (статическое или динамическое).
 * Для динамических метрик (conversions_purchase и т.д.) возвращает определение базовой метрики.
 */
export function getMetricDefinition(metricId: string): MetricDefinition | undefined {
  // Сначала проверяем статические определения
  if (METRIC_DEFINITIONS[metricId]) {
    return METRIC_DEFINITIONS[metricId];
  }
  
  // Ищем по паттернам динамических метрик
  for (const pattern of DYNAMIC_METRIC_PATTERNS) {
    if (metricId.startsWith(pattern.prefix)) {
      const baseDef = METRIC_DEFINITIONS[pattern.baseMetric];
      if (baseDef) {
        // Возвращаем определение с ключом динамической метрики
        return { ...baseDef, key: metricId };
      }
    }
  }
  
  return undefined;
}

/**
 * Проверяет, является ли метрика известной (статической или динамической).
 */
export function isKnownMetric(metricId: string): boolean {
  return getMetricDefinition(metricId) !== undefined;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // Traffic & Delivery
  impressions: { key: 'impressions', type: 'absolute', category: 'traffic', isSequential: true },
  reach: { key: 'reach', type: 'absolute', category: 'traffic', isSequential: true },
  frequency: { key: 'frequency', type: 'ratio', category: 'performance' },
  full_view_impressions: { key: 'full_view_impressions', type: 'absolute', category: 'traffic' },
  full_view_reach: { key: 'full_view_reach', type: 'absolute', category: 'traffic' },
  
  // Spend & Costs
  spend: { key: 'spend', type: 'currency', category: 'money' },
  social_spend: { key: 'social_spend', type: 'currency', category: 'money' },
  cpm: { key: 'cpm', type: 'currency', category: 'performance' },
  cpp: { key: 'cpp', type: 'currency', category: 'performance' },
  cpc: { key: 'cpc', type: 'currency', category: 'performance' },
  
  // Results
  results: { key: 'results', type: 'absolute', category: 'traffic' },
  objective_results: { key: 'objective_results', type: 'absolute', category: 'traffic' },
  result_rate: { key: 'result_rate', type: 'percentage', category: 'performance' },
  objective_result_rate: { key: 'objective_result_rate', type: 'percentage', category: 'performance' },
  cost_per_result: { key: 'cost_per_result', type: 'currency', category: 'performance' },
  cost_per_objective_result: { key: 'cost_per_objective_result', type: 'currency', category: 'performance' },
  
  // All Clicks
  clicks: { key: 'clicks', type: 'absolute', category: 'traffic', isSequential: true },
  unique_clicks: { key: 'unique_clicks', type: 'absolute', category: 'traffic', isSequential: true },
  ctr: { key: 'ctr', type: 'percentage', category: 'performance' },
  unique_ctr: { key: 'unique_ctr', type: 'percentage', category: 'performance' },
  cost_per_unique_click: { key: 'cost_per_unique_click', type: 'currency', category: 'performance' },
  ad_click_actions: { key: 'ad_click_actions', type: 'absolute', category: 'traffic' },
  cost_per_ad_click: { key: 'cost_per_ad_click', type: 'currency', category: 'performance' },
  
  // Link Clicks
  inline_link_clicks: { key: 'inline_link_clicks', type: 'absolute', category: 'traffic', isSequential: true },
  unique_inline_link_clicks: { key: 'unique_inline_link_clicks', type: 'absolute', category: 'traffic', isSequential: true },
  inline_link_click_ctr: { key: 'inline_link_click_ctr', type: 'percentage', category: 'performance' },
  unique_inline_link_click_ctr: { key: 'unique_inline_link_click_ctr', type: 'percentage', category: 'performance' },
  cost_per_inline_link_click: { key: 'cost_per_inline_link_click', type: 'currency', category: 'performance' },
  cost_per_unique_inline_link_click: { key: 'cost_per_unique_inline_link_click', type: 'currency', category: 'performance' },
  unique_link_clicks_ctr: { key: 'unique_link_clicks_ctr', type: 'percentage', category: 'performance' },
  link_clicks_per_results: { key: 'link_clicks_per_results', type: 'ratio', category: 'performance' },
  
  // Outbound Clicks
  outbound_clicks: { key: 'outbound_clicks', type: 'absolute', category: 'traffic' },
  unique_outbound_clicks: { key: 'unique_outbound_clicks', type: 'absolute', category: 'traffic' },
  outbound_clicks_ctr: { key: 'outbound_clicks_ctr', type: 'percentage', category: 'performance' },
  unique_outbound_clicks_ctr: { key: 'unique_outbound_clicks_ctr', type: 'percentage', category: 'performance' },
  cost_per_outbound_click: { key: 'cost_per_outbound_click', type: 'currency', category: 'performance' },
  cost_per_unique_outbound_click: { key: 'cost_per_unique_outbound_click', type: 'currency', category: 'performance' },
  
  // Landing Pages
  landing_page_view_actions_per_link_click: { key: 'landing_page_view_actions_per_link_click', type: 'ratio', category: 'performance' },
  landing_page_view_per_link_click: { key: 'landing_page_view_per_link_click', type: 'percentage', category: 'performance' },
  cost_per_landing_page_view: { key: 'cost_per_landing_page_view', type: 'currency', category: 'performance' },
  landing_page_view_per_purchase_rate: { key: 'landing_page_view_per_purchase_rate', type: 'percentage', category: 'performance' },
  purchase_per_landing_page_view: { key: 'purchase_per_landing_page_view', type: 'ratio', category: 'performance' },
  
  // Website
  website_ctr: { key: 'website_ctr', type: 'percentage', category: 'performance' },
  
  // Conversions
  conversions: { key: 'conversions', type: 'absolute', category: 'traffic', isSequential: true },
  unique_conversions: { key: 'unique_conversions', type: 'absolute', category: 'traffic', isSequential: true },
  conversion_values: { key: 'conversion_values', type: 'currency', category: 'money' },
  cost_per_conversion: { key: 'cost_per_conversion', type: 'currency', category: 'performance' },
  cost_per_unique_conversion: { key: 'cost_per_unique_conversion', type: 'currency', category: 'performance' },
  conversion_rate_ranking: { key: 'conversion_rate_ranking', type: 'percentage', category: 'performance' },
  conversion_rate: { key: 'conversion_rate', type: 'percentage', category: 'performance' },
  
  // Actions
  actions: { key: 'actions', type: 'absolute', category: 'traffic' },
  unique_actions: { key: 'unique_actions', type: 'absolute', category: 'traffic' },
  action_values: { key: 'action_values', type: 'currency', category: 'money' },
  cost_per_action_type: { key: 'cost_per_action_type', type: 'currency', category: 'performance' },
  cost_per_unique_action_type: { key: 'cost_per_unique_action_type', type: 'currency', category: 'performance' },
  
  // Leads
  conversion_leads: { key: 'conversion_leads', type: 'absolute', category: 'traffic' },
  conversion_lead_rate: { key: 'conversion_lead_rate', type: 'percentage', category: 'performance' },
  cost_per_conversion_lead: { key: 'cost_per_conversion_lead', type: 'currency', category: 'performance' },
  
  // DDA
  dda_countby_convs: { key: 'dda_countby_convs', type: 'absolute', category: 'traffic' },
  cost_per_dda_countby_convs: { key: 'cost_per_dda_countby_convs', type: 'currency', category: 'performance' },
  dda_results: { key: 'dda_results', type: 'absolute', category: 'traffic' },
  
  // E-commerce & Revenue
  revenue: { key: 'revenue', type: 'currency', category: 'money' },
  purchase_roas: { key: 'purchase_roas', type: 'ratio', category: 'performance' },
  roas: { key: 'roas', type: 'ratio', category: 'performance' },
  mobile_app_purchase_roas: { key: 'mobile_app_purchase_roas', type: 'ratio', category: 'performance' },
  website_purchase_roas: { key: 'website_purchase_roas', type: 'ratio', category: 'performance' },
  purchases_per_link_click: { key: 'purchases_per_link_click', type: 'ratio', category: 'performance' },
  average_purchases_conversion_value: { key: 'average_purchases_conversion_value', type: 'currency', category: 'money' },
  
  // Products
  product_views: { key: 'product_views', type: 'absolute', category: 'traffic' },
  converted_product_quantity: { key: 'converted_product_quantity', type: 'absolute', category: 'traffic' },
  converted_product_value: { key: 'converted_product_value', type: 'currency', category: 'money' },
  
  // Video Metrics - FUNNEL!
  video_play_actions: { key: 'video_play_actions', type: 'absolute', category: 'traffic', isSequential: true },
  video_p25_watched_actions: { key: 'video_p25_watched_actions', type: 'absolute', category: 'traffic', isSequential: true },
  video_p50_watched_actions: { key: 'video_p50_watched_actions', type: 'absolute', category: 'traffic', isSequential: true },
  video_p75_watched_actions: { key: 'video_p75_watched_actions', type: 'absolute', category: 'traffic', isSequential: true },
  video_p95_watched_actions: { key: 'video_p95_watched_actions', type: 'absolute', category: 'traffic', isSequential: true },
  video_p100_watched_actions: { key: 'video_p100_watched_actions', type: 'absolute', category: 'traffic', isSequential: true },
  video_view_per_impression: { key: 'video_view_per_impression', type: 'percentage', category: 'performance' },
  video_avg_time_watched_actions: { key: 'video_avg_time_watched_actions', type: 'ratio', category: 'performance' },
  video_time_watched_actions: { key: 'video_time_watched_actions', type: 'absolute', category: 'traffic' },
  video_15_sec_watched_actions: { key: 'video_15_sec_watched_actions', type: 'absolute', category: 'traffic' },
  unique_video_view_15_sec: { key: 'unique_video_view_15_sec', type: 'absolute', category: 'traffic' },
  cost_per_15_sec_video_view: { key: 'cost_per_15_sec_video_view', type: 'currency', category: 'performance' },
  video_30_sec_watched_actions: { key: 'video_30_sec_watched_actions', type: 'absolute', category: 'traffic' },
  video_continuous_2_sec_watched_actions: { key: 'video_continuous_2_sec_watched_actions', type: 'absolute', category: 'traffic' },
  unique_video_continuous_2_sec_watched_actions: { key: 'unique_video_continuous_2_sec_watched_actions', type: 'absolute', category: 'traffic' },
  cost_per_2_sec_continuous_video_view: { key: 'cost_per_2_sec_continuous_video_view', type: 'currency', category: 'performance' },
  video_thruplay_watched_actions: { key: 'video_thruplay_watched_actions', type: 'absolute', category: 'traffic' },
  cost_per_thruplay: { key: 'cost_per_thruplay', type: 'currency', category: 'performance' },
  
  // Engagement
  inline_post_engagement: { key: 'inline_post_engagement', type: 'absolute', category: 'traffic' },
  cost_per_inline_post_engagement: { key: 'cost_per_inline_post_engagement', type: 'currency', category: 'performance' },
  
  // Quality
  quality_ranking: { key: 'quality_ranking', type: 'percentage', category: 'performance' },
  engagement_rate_ranking: { key: 'engagement_rate_ranking', type: 'percentage', category: 'performance' },
  estimated_ad_recallers: { key: 'estimated_ad_recallers', type: 'absolute', category: 'traffic' },
  cost_per_estimated_ad_recallers: { key: 'cost_per_estimated_ad_recallers', type: 'currency', category: 'performance' },
  estimated_ad_recall_rate: { key: 'estimated_ad_recall_rate', type: 'percentage', category: 'performance' },
};

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'mixed' | 'scatter' | 'radar' | 'funnel';

export interface ChartValidationRule {
  allowedMetricTypes?: MetricType[];
  allowedCategories?: MetricCategory[];
  requireSameCategory?: boolean;
  maxMetrics?: number;
  minMetrics?: number;
  requireSequential?: boolean;
  warningMessage?: string;
}

export const CHART_VALIDATION_RULES: Record<ChartType, ChartValidationRule> = {
  line: {
    warningMessage: 'Recommended to use no more than 4-5 metrics for chart readability',
  },
  bar: {
    warningMessage: 'Recommended to use no more than 4-5 metrics for chart readability',
  },
  area: {
    warningMessage: 'Recommended to use no more than 3-4 metrics for chart readability',
  },
  pie: {
    allowedMetricTypes: ['absolute', 'currency'],
    requireSameCategory: true,
    maxMetrics: 6,
    warningMessage: 'Pie chart requires metrics from ONE category (traffic OR money, but not both). Ratios (CTR, CPC, Frequency) cannot be summed. Only metrics from dominant category are displayed (max. 6).',
  },
  mixed: {
    maxMetrics: 4,
    warningMessage: 'Mixed chart is recommended for 2-4 metrics of different types',
  },
  scatter: {
    minMetrics: 2,
    maxMetrics: 3,
    warningMessage: 'Scatter plot requires 2 metrics (X, Y) or 3 metrics (X, Y, point size). Used for correlation analysis between metrics.',
  },
  radar: {
    minMetrics: 3,
    maxMetrics: 6,
    warningMessage: 'Radar chart is optimal for comparing 3-6 metrics simultaneously. Too many metrics reduce readability.',
  },
  funnel: {
    allowedMetricTypes: ['absolute', 'currency'],
    requireSequential: true,
    minMetrics: 3,
    maxMetrics: 6,
    warningMessage: 'Funnel is suitable only for sequential conversion stages (Impressions → Reach → Clicks → Conversions). Inappropriate or insufficient metrics selected.',
  },
};

export interface ValidationResult {
  isValid: boolean;
  filteredMetrics: string[];
  warning?: string;
  reason?: string;
}

export function validateMetricsForChart(
  chartType: ChartType,
  selectedMetrics: string[]
): ValidationResult {
  const rule = CHART_VALIDATION_RULES[chartType];
  const result: ValidationResult = {
    isValid: true,
    filteredMetrics: [...selectedMetrics],
  };

  // Используем isKnownMetric для проверки и статических, и динамических метрик
  const unknownMetrics = selectedMetrics.filter(m => !isKnownMetric(m));
  if (unknownMetrics.length > 0) {
    console.warn('[Chart Validation] Unknown metrics detected:', unknownMetrics);
    result.filteredMetrics = selectedMetrics.filter(m => isKnownMetric(m));
    if (result.filteredMetrics.length === 0) {
      result.isValid = false;
      result.warning = 'Selected metrics are not defined in the system';
      result.reason = `Unknown metrics: ${unknownMetrics.join(', ')}`;
      return result;
    }
    result.warning = `Some metrics skipped: ${unknownMetrics.join(', ')}`;
    result.reason = 'Metrics not found in validation system';
  }

  if (rule.minMetrics && selectedMetrics.length < rule.minMetrics) {
    result.isValid = false;
    result.warning = rule.warningMessage;
    result.reason = `Minimum ${rule.minMetrics} metrics required for ${getChartTypeName(chartType)}`;
    result.filteredMetrics = [];
    return result;
  }

  if (rule.allowedMetricTypes) {
    result.filteredMetrics = selectedMetrics.filter(metric => {
      const def = getMetricDefinition(metric);
      return def && rule.allowedMetricTypes!.includes(def.type);
    });

    if (result.filteredMetrics.length === 0) {
      result.isValid = false;
      result.warning = rule.warningMessage;
      result.reason = `No suitable metrics for ${getChartTypeName(chartType)}`;
      return result;
    }

    if (result.filteredMetrics.length !== selectedMetrics.length) {
      result.warning = rule.warningMessage;
      result.reason = `Some metrics are not suitable for ${getChartTypeName(chartType)}`;
    }
  }

  if (rule.requireSameCategory && result.filteredMetrics.length > 0) {
    const categoryCounts: Record<MetricCategory, number> = { traffic: 0, money: 0, performance: 0 };
    result.filteredMetrics.forEach(metric => {
      const def = getMetricDefinition(metric);
      if (def) {
        categoryCounts[def.category]++;
      }
    });

    const dominantCategory = (Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0]) as MetricCategory;

    const sameCategory = result.filteredMetrics.filter(metric => {
      const def = getMetricDefinition(metric);
      return def && def.category === dominantCategory;
    });

    if (sameCategory.length !== result.filteredMetrics.length) {
      result.warning = rule.warningMessage;
      result.reason = `Filtered out metrics from other categories. Showing only: ${getCategoryName(dominantCategory)}`;
      result.filteredMetrics = sameCategory;
    }
  }

  if (rule.requireSequential) {
    const sequentialMetrics = result.filteredMetrics.filter(metric => {
      const def = getMetricDefinition(metric);
      return def?.isSequential;
    });

    if (sequentialMetrics.length < (rule.minMetrics || 0)) {
      result.isValid = false;
      result.warning = rule.warningMessage;
      result.reason = `Funnel requires sequential conversion stages`;
      result.filteredMetrics = [];
      return result;
    }

    result.filteredMetrics = sequentialMetrics;
    if (sequentialMetrics.length !== selectedMetrics.length) {
      result.warning = rule.warningMessage;
      result.reason = 'Filtered out metrics that are not funnel stages';
    }
  }

  if (rule.maxMetrics && result.filteredMetrics.length > rule.maxMetrics) {
    result.filteredMetrics = result.filteredMetrics.slice(0, rule.maxMetrics);
    result.warning = rule.warningMessage;
    result.reason = `Displaying only first ${rule.maxMetrics} metrics`;
  }

  return result;
}

function getChartTypeName(chartType: ChartType): string {
  const names: Record<ChartType, string> = {
    line: 'line chart',
    bar: 'bar chart',
    area: 'area chart',
    pie: 'pie chart',
    mixed: 'mixed chart',
    scatter: 'scatter plot',
    radar: 'radar chart',
    funnel: 'conversion funnel',
  };
  return names[chartType] || chartType;
}

function getCategoryName(category: MetricCategory): string {
  const names: Record<MetricCategory, string> = {
    traffic: 'Traffic (Impressions, Clicks, Reach, Conversions)',
    money: 'Money (Spend, Revenue)',
    performance: 'Performance (CTR, CPC, ROAS, Frequency)',
  };
  return names[category] || category;
}

export function getMetricType(metricKey: string): MetricType | undefined {
  return getMetricDefinition(metricKey)?.type;
}

export function isAbsoluteMetric(metricKey: string): boolean {
  const type = getMetricType(metricKey);
  return type === 'absolute' || type === 'currency';
}

export function isSequentialMetric(metricKey: string): boolean {
  return getMetricDefinition(metricKey)?.isSequential || false;
}
