/**
 * Formula definitions for calculating derived metrics
 * Base (summable) metrics can be added directly
 * Derived metrics need to be recalculated using formulas
 * 
 * ВАЖНО: Метрики с preserveApiValue=true НЕ должны пересчитываться для единичных строк,
 * т.к. Facebook уже вернул готовое значение с учётом attribution window.
 * Пересчёт нужен только при агрегации нескольких строк.
 */

export type MetricAggregationType = 'sum' | 'weighted_avg' | 'calculated';

export interface MetricFormula {
  type: MetricAggregationType;
  numerator?: string;        // numerator for calculated metrics
  denominator?: string;      // denominator for calculated metrics
  multiplier?: number;       // multiplier (e.g., 100 for percentages, 1000 for CPM)
  dependencies?: string[];   // dependent metrics that need to be calculated first
  preserveApiValue?: boolean; // true = use FB value for single rows, recalculate only for aggregation
}

/**
 * Formulas for all metrics in the system
 * - sum: simple addition (impressions, clicks, spend)
 * - weighted_avg: weighted average (deprecated, not used)
 * - calculated: calculated by formula from other metrics
 */
export const METRIC_FORMULAS: Record<string, MetricFormula> = {
  // === BASE METRICS (can be summed) ===
  
  // Traffic
  impressions: { type: 'sum' },
  reach: { type: 'sum' },
  clicks: { type: 'sum' },
  unique_clicks: { type: 'sum' },
  inline_link_clicks: { type: 'sum' },
  unique_inline_link_clicks: { type: 'sum' },
  outbound_clicks: { type: 'sum' },
  unique_outbound_clicks: { type: 'sum' },
  full_view_impressions: { type: 'sum' },
  full_view_reach: { type: 'sum' },
  
  // Spend & Revenue
  spend: { type: 'sum' },
  social_spend: { type: 'sum' },
  revenue: { type: 'sum' },
  
  // Conversions
  conversions: { type: 'sum' },
  unique_conversions: { type: 'sum' },
  conversion_values: { type: 'sum' },
  actions: { type: 'sum' },
  unique_actions: { type: 'sum' },
  action_values: { type: 'sum' },
  
  // Results
  results: { type: 'sum' },
  objective_results: { type: 'sum' },
  
  // Leads
  conversion_leads: { type: 'sum' },
  
  // DDA
  dda_countby_convs: { type: 'sum' },
  dda_results: { type: 'sum' },
  
  // Video
  video_play_actions: { type: 'sum' },
  video_p25_watched_actions: { type: 'sum' },
  video_p50_watched_actions: { type: 'sum' },
  video_p75_watched_actions: { type: 'sum' },
  video_p95_watched_actions: { type: 'sum' },
  video_p100_watched_actions: { type: 'sum' },
  video_time_watched_actions: { type: 'sum' },
  video_15_sec_watched_actions: { type: 'sum' },
  unique_video_view_15_sec: { type: 'sum' },
  video_30_sec_watched_actions: { type: 'sum' },
  video_continuous_2_sec_watched_actions: { type: 'sum' },
  unique_video_continuous_2_sec_watched_actions: { type: 'sum' },
  video_thruplay_watched_actions: { type: 'sum' },
  video_play_curve_actions: { type: 'sum' },
  video_play_retention_graph_actions: { type: 'sum' },
  video_play_retention_0_to_15s_actions: { type: 'sum' },
  video_play_retention_20_to_60s_actions: { type: 'sum' },
  
  // Engagement
  inline_post_engagement: { type: 'sum' },
  ad_click_actions: { type: 'sum' },
  interactive_component_tap: { type: 'sum' },
  instagram_upcoming_event_reminders_set: { type: 'sum' },
  
  // Products
  product_views: { type: 'sum' },
  converted_product_quantity: { type: 'sum' },
  converted_product_value: { type: 'sum' },
  
  // Converted Products - Mobile
  converted_product_app_custom_event_fb_mobile_purchase: { type: 'sum' },
  converted_product_app_custom_event_fb_mobile_purchase_value: { type: 'sum' },
  
  // Converted Products - Website
  converted_product_website_pixel_purchase: { type: 'sum' },
  converted_product_website_pixel_purchase_value: { type: 'sum' },
  
  // Converted Products - Offline
  converted_product_offline_purchase: { type: 'sum' },
  converted_product_offline_purchase_value: { type: 'sum' },
  
  // Converted Products - Omni
  converted_product_omni_purchase: { type: 'sum' },
  converted_product_omni_purchase_values: { type: 'sum' },
  
  // Promoted Products - Mobile
  converted_promoted_product_app_custom_event_fb_mobile_purchase: { type: 'sum' },
  converted_promoted_product_app_custom_event_fb_mobile_purchase_value: { type: 'sum' },
  
  // Promoted Products - Website
  converted_promoted_product_website_pixel_purchase: { type: 'sum' },
  converted_promoted_product_website_pixel_purchase_value: { type: 'sum' },
  
  // Promoted Products - Offline
  converted_promoted_product_offline_purchase: { type: 'sum' },
  converted_promoted_product_offline_purchase_value: { type: 'sum' },
  
  // Promoted Products - Omni
  converted_promoted_product_omni_purchase: { type: 'sum' },
  converted_promoted_product_omni_purchase_values: { type: 'sum' },
  
  // Promoted Products - General
  converted_promoted_product_quantity: { type: 'sum' },
  converted_promoted_product_value: { type: 'sum' },
  
  // Shops
  shops_assisted_purchases: { type: 'sum' },
  
  // Catalog
  catalog_segment_actions: { type: 'sum' },
  catalog_segment_value: { type: 'sum' },
  
  // Quality
  estimated_ad_recallers: { type: 'sum' },
  estimated_ad_recallers_lower_bound: { type: 'sum' },
  estimated_ad_recallers_upper_bound: { type: 'sum' },
  
  // Landing Page Views
  landing_page_views: { type: 'sum' },
  
  // Messaging
  marketing_messages_sent: { type: 'sum' },
  marketing_messages_delivered: { type: 'sum' },
  marketing_messages_read: { type: 'sum' },
  marketing_messages_link_btn_click: { type: 'sum' },
  marketing_messages_quick_reply_btn_click: { type: 'sum' },
  marketing_messages_spend: { type: 'sum' },
  marketing_messages_website_add_to_cart: { type: 'sum' },
  marketing_messages_website_initiate_checkout: { type: 'sum' },
  marketing_messages_website_purchase: { type: 'sum' },
  marketing_messages_website_purchase_values: { type: 'sum' },
  onsite_conversion_messaging_detected_purchase_deduped: { type: 'sum' },
  
  // Instant Experience
  instant_experience_clicks_to_open: { type: 'sum' },
  instant_experience_clicks_to_start: { type: 'sum' },
  instant_experience_outbound_clicks: { type: 'sum' },
  
  // Canvas
  canvas_avg_view_time: { type: 'sum' },
  
  // Other
  total_card_view: { type: 'sum' },
  
  // Attribution
  ad_impression_actions: { type: 'sum' },
  total_postbacks: { type: 'sum' },
  total_postbacks_detailed: { type: 'sum' },
  total_postbacks_detailed_v4: { type: 'sum' },
  
  // Rankings (text values, but included for completeness - will be skipped in sum)
  quality_ranking: { type: 'sum' },
  engagement_rate_ranking: { type: 'sum' },
  conversion_rate_ranking: { type: 'sum' },
  result_values_performance_indicator: { type: 'sum' },
  
  // === DERIVED METRICS (need to be calculated) ===
  
  // CTR Metrics (clicks / impressions * 100)
  // preserveApiValue: true — FB уже посчитал с учётом attribution, пересчитываем только при агрегации
  ctr: {
    type: 'calculated',
    numerator: 'clicks',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['clicks', 'impressions'],
    preserveApiValue: true
  },
  unique_ctr: {
    type: 'calculated',
    numerator: 'unique_clicks',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['unique_clicks', 'impressions'],
    preserveApiValue: true
  },
  inline_link_click_ctr: {
    type: 'calculated',
    numerator: 'inline_link_clicks',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['inline_link_clicks', 'impressions'],
    preserveApiValue: true
  },
  unique_inline_link_click_ctr: {
    type: 'calculated',
    numerator: 'unique_inline_link_clicks',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['unique_inline_link_clicks', 'impressions'],
    preserveApiValue: true
  },
  outbound_clicks_ctr: {
    type: 'calculated',
    numerator: 'outbound_clicks',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['outbound_clicks', 'impressions'],
    preserveApiValue: true
  },
  unique_outbound_clicks_ctr: {
    type: 'calculated',
    numerator: 'unique_outbound_clicks',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['unique_outbound_clicks', 'impressions'],
    preserveApiValue: true
  },
  website_ctr: {
    type: 'calculated',
    numerator: 'clicks',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['clicks', 'impressions'],
    preserveApiValue: true
  },
  unique_link_clicks_ctr: {
    type: 'calculated',
    numerator: 'unique_inline_link_clicks',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['unique_inline_link_clicks', 'impressions'],
    preserveApiValue: true
  },
  
  // Frequency (impressions / reach)
  frequency: {
    type: 'calculated',
    numerator: 'impressions',
    denominator: 'reach',
    dependencies: ['impressions', 'reach'],
    preserveApiValue: true
  },
  
  // Cost Per Metrics (preserveApiValue для всех — FB вернул готовые)
  cpc: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'clicks',
    dependencies: ['spend', 'clicks'],
    preserveApiValue: true
  },
  cost_per_unique_click: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'unique_clicks',
    dependencies: ['spend', 'unique_clicks'],
    preserveApiValue: true
  },
  cost_per_inline_link_click: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'inline_link_clicks',
    dependencies: ['spend', 'inline_link_clicks'],
    preserveApiValue: true
  },
  cost_per_unique_inline_link_click: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'unique_inline_link_clicks',
    dependencies: ['spend', 'unique_inline_link_clicks'],
    preserveApiValue: true
  },
  cost_per_outbound_click: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'outbound_clicks',
    dependencies: ['spend', 'outbound_clicks'],
    preserveApiValue: true
  },
  cost_per_unique_outbound_click: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'unique_outbound_clicks',
    dependencies: ['spend', 'unique_outbound_clicks'],
    preserveApiValue: true
  },
  cost_per_ad_click: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'ad_click_actions',
    dependencies: ['spend', 'ad_click_actions'],
    preserveApiValue: true
  },
  
  // CPM (cost per 1000 impressions)
  cpm: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'impressions',
    multiplier: 1000,
    dependencies: ['spend', 'impressions'],
    preserveApiValue: true
  },
  cpp: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'reach',
    multiplier: 1000,
    dependencies: ['spend', 'reach'],
    preserveApiValue: true
  },
  
  // Conversion Metrics
  cost_per_conversion: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'conversions',
    dependencies: ['spend', 'conversions'],
    preserveApiValue: true
  },
  cost_per_unique_conversion: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'unique_conversions',
    dependencies: ['spend', 'unique_conversions'],
    preserveApiValue: true
  },
  conversion_rate: {
    type: 'calculated',
    numerator: 'conversions',
    denominator: 'clicks',
    multiplier: 100,
    dependencies: ['conversions', 'clicks'],
    preserveApiValue: true
  },
  
  // Result Metrics
  cost_per_result: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'results',
    dependencies: ['spend', 'results'],
    preserveApiValue: true
  },
  cost_per_objective_result: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'objective_results',
    dependencies: ['spend', 'objective_results'],
    preserveApiValue: true
  },
  result_rate: {
    type: 'calculated',
    numerator: 'results',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['results', 'impressions'],
    preserveApiValue: true
  },
  objective_result_rate: {
    type: 'calculated',
    numerator: 'objective_results',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['objective_results', 'impressions'],
    preserveApiValue: true
  },
  
  // Lead Metrics
  cost_per_conversion_lead: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'conversion_leads',
    dependencies: ['spend', 'conversion_leads'],
    preserveApiValue: true
  },
  conversion_lead_rate: {
    type: 'calculated',
    numerator: 'conversion_leads',
    denominator: 'clicks',
    multiplier: 100,
    dependencies: ['conversion_leads', 'clicks'],
    preserveApiValue: true
  },
  
  // DDA Metrics
  cost_per_dda_countby_convs: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'dda_countby_convs',
    dependencies: ['spend', 'dda_countby_convs'],
    preserveApiValue: true
  },
  
  // Action Metrics
  cost_per_action_type: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'actions',
    dependencies: ['spend', 'actions'],
    preserveApiValue: true
  },
  cost_per_unique_action_type: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'unique_actions',
    dependencies: ['spend', 'unique_actions'],
    preserveApiValue: true
  },
  
  // ROAS Metrics
  purchase_roas: {
    type: 'calculated',
    numerator: 'revenue',
    denominator: 'spend',
    dependencies: ['revenue', 'spend'],
    preserveApiValue: true
  },
  roas: {
    type: 'calculated',
    numerator: 'revenue',
    denominator: 'spend',
    dependencies: ['revenue', 'spend'],
    preserveApiValue: true
  },
  mobile_app_purchase_roas: {
    type: 'calculated',
    numerator: 'revenue',
    denominator: 'spend',
    dependencies: ['revenue', 'spend'],
    preserveApiValue: true
  },
  website_purchase_roas: {
    type: 'calculated',
    numerator: 'revenue',
    denominator: 'spend',
    dependencies: ['revenue', 'spend'],
    preserveApiValue: true
  },
  
  // Video Metrics
  cost_per_15_sec_video_view: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'video_15_sec_watched_actions',
    dependencies: ['spend', 'video_15_sec_watched_actions'],
    preserveApiValue: true
  },
  cost_per_2_sec_continuous_video_view: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'video_continuous_2_sec_watched_actions',
    dependencies: ['spend', 'video_continuous_2_sec_watched_actions'],
    preserveApiValue: true
  },
  cost_per_thruplay: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'video_thruplay_watched_actions',
    dependencies: ['spend', 'video_thruplay_watched_actions'],
    preserveApiValue: true
  },
  video_view_per_impression: {
    type: 'calculated',
    numerator: 'video_play_actions',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['video_play_actions', 'impressions'],
    preserveApiValue: true
  },
  video_avg_time_watched_actions: {
    type: 'calculated',
    numerator: 'video_time_watched_actions',
    denominator: 'video_play_actions',
    dependencies: ['video_time_watched_actions', 'video_play_actions'],
    preserveApiValue: true
  },
  
  // Engagement Metrics
  cost_per_inline_post_engagement: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'inline_post_engagement',
    dependencies: ['spend', 'inline_post_engagement'],
    preserveApiValue: true
  },
  
  // Landing Page Metrics
  cost_per_landing_page_view: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'landing_page_views',
    dependencies: ['spend', 'landing_page_views'],
    preserveApiValue: true
  },
  
  // Quality Metrics
  cost_per_estimated_ad_recallers: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'estimated_ad_recallers',
    dependencies: ['spend', 'estimated_ad_recallers'],
    preserveApiValue: true
  },
  
  // Attribution Metrics
  cost_per_one_thousand_ad_impression: {
    type: 'calculated',
    numerator: 'spend',
    denominator: 'ad_impression_actions',
    multiplier: 1000,
    dependencies: ['spend', 'ad_impression_actions'],
    preserveApiValue: true
  },
  
  // Catalog ROAS Metrics
  catalog_segment_value_mobile_purchase_roas: {
    type: 'calculated',
    numerator: 'catalog_segment_value',
    denominator: 'spend',
    dependencies: ['catalog_segment_value', 'spend'],
    preserveApiValue: true
  },
  catalog_segment_value_omni_purchase_roas: {
    type: 'calculated',
    numerator: 'catalog_segment_value',
    denominator: 'spend',
    dependencies: ['catalog_segment_value', 'spend'],
    preserveApiValue: true
  },
  catalog_segment_value_website_purchase_roas: {
    type: 'calculated',
    numerator: 'catalog_segment_value',
    denominator: 'spend',
    dependencies: ['catalog_segment_value', 'spend'],
    preserveApiValue: true
  },
  
  // Landing Page Derived Metrics
  landing_page_view_actions_per_link_click: {
    type: 'calculated',
    numerator: 'landing_page_views',
    denominator: 'inline_link_clicks',
    dependencies: ['landing_page_views', 'inline_link_clicks'],
    preserveApiValue: true
  },
  landing_page_view_per_link_click: {
    type: 'calculated',
    numerator: 'landing_page_views',
    denominator: 'inline_link_clicks',
    multiplier: 100,
    dependencies: ['landing_page_views', 'inline_link_clicks'],
    preserveApiValue: true
  },
  landing_page_view_per_purchase_rate: {
    type: 'calculated',
    numerator: 'conversions',
    denominator: 'landing_page_views',
    multiplier: 100,
    dependencies: ['conversions', 'landing_page_views'],
    preserveApiValue: true
  },
  purchase_per_landing_page_view: {
    type: 'calculated',
    numerator: 'conversions',
    denominator: 'landing_page_views',
    dependencies: ['conversions', 'landing_page_views'],
    preserveApiValue: true
  },
  link_clicks_per_results: {
    type: 'calculated',
    numerator: 'inline_link_clicks',
    denominator: 'results',
    dependencies: ['inline_link_clicks', 'results'],
    preserveApiValue: true
  },
  purchases_per_link_click: {
    type: 'calculated',
    numerator: 'conversions',
    denominator: 'inline_link_clicks',
    dependencies: ['conversions', 'inline_link_clicks'],
    preserveApiValue: true
  },
  average_purchases_conversion_value: {
    type: 'calculated',
    numerator: 'conversion_values',
    denominator: 'conversions',
    dependencies: ['conversion_values', 'conversions'],
    preserveApiValue: true
  },
  
  // Messaging Derived Metrics
  marketing_messages_delivery_rate: {
    type: 'calculated',
    numerator: 'marketing_messages_delivered',
    denominator: 'marketing_messages_sent',
    multiplier: 100,
    dependencies: ['marketing_messages_delivered', 'marketing_messages_sent'],
    preserveApiValue: true
  },
  marketing_messages_cost_per_delivered: {
    type: 'calculated',
    numerator: 'marketing_messages_spend',
    denominator: 'marketing_messages_delivered',
    dependencies: ['marketing_messages_spend', 'marketing_messages_delivered'],
    preserveApiValue: true
  },
  marketing_messages_read_rate: {
    type: 'calculated',
    numerator: 'marketing_messages_read',
    denominator: 'marketing_messages_delivered',
    multiplier: 100,
    dependencies: ['marketing_messages_read', 'marketing_messages_delivered'],
    preserveApiValue: true
  },
  marketing_messages_link_btn_click_rate: {
    type: 'calculated',
    numerator: 'marketing_messages_link_btn_click',
    denominator: 'marketing_messages_delivered',
    multiplier: 100,
    dependencies: ['marketing_messages_link_btn_click', 'marketing_messages_delivered'],
    preserveApiValue: true
  },
  marketing_messages_cost_per_link_btn_click: {
    type: 'calculated',
    numerator: 'marketing_messages_spend',
    denominator: 'marketing_messages_link_btn_click',
    dependencies: ['marketing_messages_spend', 'marketing_messages_link_btn_click'],
    preserveApiValue: true
  },
  marketing_messages_quick_reply_btn_click_rate: {
    type: 'calculated',
    numerator: 'marketing_messages_quick_reply_btn_click',
    denominator: 'marketing_messages_delivered',
    multiplier: 100,
    dependencies: ['marketing_messages_quick_reply_btn_click', 'marketing_messages_delivered'],
    preserveApiValue: true
  },
  marketing_messages_media_view_rate: {
    type: 'calculated',
    numerator: 'marketing_messages_read',
    denominator: 'marketing_messages_delivered',
    multiplier: 100,
    dependencies: ['marketing_messages_read', 'marketing_messages_delivered'],
    preserveApiValue: true
  },
  marketing_messages_phone_call_btn_click_rate: {
    type: 'calculated',
    numerator: 'marketing_messages_quick_reply_btn_click',
    denominator: 'marketing_messages_delivered',
    multiplier: 100,
    dependencies: ['marketing_messages_quick_reply_btn_click', 'marketing_messages_delivered'],
    preserveApiValue: true
  },
  
  // Ad Recall Derived Metrics
  estimated_ad_recall_rate: {
    type: 'calculated',
    numerator: 'estimated_ad_recallers',
    denominator: 'reach',
    multiplier: 100,
    dependencies: ['estimated_ad_recallers', 'reach'],
    preserveApiValue: true
  },
  estimated_ad_recall_rate_lower_bound: {
    type: 'calculated',
    numerator: 'estimated_ad_recallers_lower_bound',
    denominator: 'reach',
    multiplier: 100,
    dependencies: ['estimated_ad_recallers_lower_bound', 'reach'],
    preserveApiValue: true
  },
  estimated_ad_recall_rate_upper_bound: {
    type: 'calculated',
    numerator: 'estimated_ad_recallers_upper_bound',
    denominator: 'reach',
    multiplier: 100,
    dependencies: ['estimated_ad_recallers_upper_bound', 'reach'],
    preserveApiValue: true
  },
  
  // Canvas Derived Metrics
  canvas_avg_view_percent: {
    type: 'calculated',
    numerator: 'canvas_avg_view_time',
    denominator: 'impressions',
    multiplier: 100,
    dependencies: ['canvas_avg_view_time', 'impressions'],
    preserveApiValue: true
  },
  
  // Benchmark metrics (these come from API as-is, not calculated)
  marketing_messages_read_rate_benchmark: { type: 'sum' },
  marketing_messages_click_rate_benchmark: { type: 'sum' },
  marketing_messages_spend_currency: { type: 'sum' },
};

/**
 * Calculates derived metric value using formula
 */
export function calculateDerivedMetric(
  metricId: string,
  baseMetrics: Record<string, number>
): number | null {
  const formula = METRIC_FORMULAS[metricId];
  
  if (!formula || formula.type !== 'calculated') {
    return null;
  }
  
  const numeratorValue = baseMetrics[formula.numerator!] || 0;
  const denominatorValue = baseMetrics[formula.denominator!] || 0;
  
  // Protection against division by zero
  if (denominatorValue === 0) {
    return 0;
  }
  
  const result = numeratorValue / denominatorValue;
  const multiplier = formula.multiplier || 1;
  
  return result * multiplier;
}

/**
 * Checks if metric is base (can be summed)
 */
export function isSummableMetric(metricId: string): boolean {
  const formula = METRIC_FORMULAS[metricId];
  return !formula || formula.type === 'sum';
}

/**
 * Checks if metric is derived (needs to be recalculated)
 */
export function isDerivedMetric(metricId: string): boolean {
  const formula = METRIC_FORMULAS[metricId];
  return formula?.type === 'calculated';
}

/**
 * Returns all metric dependencies (metrics needed for its calculation)
 */
export function getMetricDependencies(metricId: string): string[] {
  const formula = METRIC_FORMULAS[metricId];
  return formula?.dependencies || [];
}
