/**
 * Конфигурация полярности метрик Facebook Ads
 * 
 * Определяет, что для каждой метрики означает "хорошо" — рост или падение.
 * Используется для правильной цветовой индикации изменений:
 * - 'up' = рост — хорошо (зелёный ↑), падение — плохо (красный ↓)
 * - 'down' = падение — хорошо (зелёный ↓), рост — плохо (красный ↑)
 * - 'neutral' = изменение нейтрально, не окрашивается
 * 
 * ВНИМАНИЕ: Частота (frequency) — особый случай:
 * - Умеренная частота (1.5-3) — хорошо
 * - Слишком высокая (>5-7) — плохо (ad fatigue)
 * - Но как отдельное изменение — нейтральна, т.к. зависит от контекста
 */

export type MetricPolarity = 'up' | 'down' | 'neutral';

export interface MetricPolarityConfig {
  id: string;
  name: string;
  goodDirection: MetricPolarity;
  comment?: string;
}

/**
 * Полный список метрик с указанием полярности
 */
export const metricPolarityConfig: MetricPolarityConfig[] = [
  // ============================================
  // PERFORMANCE > Delivery
  // ============================================
  { id: 'impressions', name: 'Impressions', goodDirection: 'up', comment: 'Больше показов = больше охват' },
  { id: 'reach', name: 'Reach', goodDirection: 'up', comment: 'Больше уникальных пользователей' },
  { id: 'frequency', name: 'Frequency', goodDirection: 'neutral', comment: 'Зависит от контекста: слишком высокая — плохо (ad fatigue)' },
  { id: 'full_view_impressions', name: 'Full View Impressions', goodDirection: 'up' },
  { id: 'full_view_reach', name: 'Full View Reach', goodDirection: 'up' },

  // ============================================
  // PERFORMANCE > Spend & Costs
  // ============================================
  { id: 'spend', name: 'Spend', goodDirection: 'down', comment: 'Меньше затрат при том же результате — лучше' },
  { id: 'social_spend', name: 'Social Spend', goodDirection: 'down' },
  { id: 'cpm', name: 'CPM', goodDirection: 'down', comment: 'Меньше стоимость за 1000 показов' },
  { id: 'cpp', name: 'CPP', goodDirection: 'down', comment: 'Меньше стоимость за единицу охвата' },
  { id: 'cpc', name: 'CPC', goodDirection: 'down', comment: 'Меньше стоимость за клик' },

  // ============================================
  // PERFORMANCE > Results
  // ============================================
  { id: 'results', name: 'Results', goodDirection: 'up', comment: 'Больше результатов' },
  { id: 'objective_results', name: 'Objective Results', goodDirection: 'up' },
  { id: 'result_rate', name: 'Result Rate', goodDirection: 'up', comment: 'Выше конверсия' },
  { id: 'objective_result_rate', name: 'Objective Result Rate', goodDirection: 'up' },
  { id: 'cost_per_result', name: 'Cost per Result', goodDirection: 'down', comment: 'Дешевле результат' },
  { id: 'cost_per_objective_result', name: 'Cost per Objective Result', goodDirection: 'down' },

  // ============================================
  // CLICKS & TRAFFIC > All Clicks
  // ============================================
  { id: 'clicks', name: 'Clicks', goodDirection: 'up' },
  { id: 'unique_clicks', name: 'Unique Clicks', goodDirection: 'up' },
  { id: 'ctr', name: 'CTR', goodDirection: 'up', comment: 'Выше кликабельность' },
  { id: 'unique_ctr', name: 'Unique CTR', goodDirection: 'up' },
  { id: 'cost_per_unique_click', name: 'Cost per Unique Click', goodDirection: 'down' },
  { id: 'ad_click_actions', name: 'Ad Click Actions', goodDirection: 'up' },
  { id: 'cost_per_ad_click', name: 'Cost per Ad Click', goodDirection: 'down' },

  // ============================================
  // CLICKS & TRAFFIC > Link Clicks
  // ============================================
  { id: 'inline_link_clicks', name: 'Inline Link Clicks', goodDirection: 'up' },
  { id: 'unique_inline_link_clicks', name: 'Unique Inline Link Clicks', goodDirection: 'up' },
  { id: 'inline_link_click_ctr', name: 'Inline Link Click CTR', goodDirection: 'up' },
  { id: 'unique_inline_link_click_ctr', name: 'Unique Inline Link Click CTR', goodDirection: 'up' },
  { id: 'cost_per_inline_link_click', name: 'Cost per Inline Link Click', goodDirection: 'down' },
  { id: 'cost_per_unique_inline_link_click', name: 'Cost per Unique Inline Link Click', goodDirection: 'down' },
  { id: 'unique_link_clicks_ctr', name: 'Unique Link Clicks CTR', goodDirection: 'up' },
  { id: 'link_clicks_per_results', name: 'Link Clicks per Results', goodDirection: 'down', comment: 'Меньше кликов на результат = выше конверсия' },

  // ============================================
  // CLICKS & TRAFFIC > Outbound Clicks
  // ============================================
  { id: 'outbound_clicks', name: 'Outbound Clicks', goodDirection: 'up' },
  { id: 'unique_outbound_clicks', name: 'Unique Outbound Clicks', goodDirection: 'up' },
  { id: 'outbound_clicks_ctr', name: 'Outbound Clicks CTR', goodDirection: 'up' },
  { id: 'unique_outbound_clicks_ctr', name: 'Unique Outbound Clicks CTR', goodDirection: 'up' },
  { id: 'cost_per_outbound_click', name: 'Cost per Outbound Click', goodDirection: 'down' },
  { id: 'cost_per_unique_outbound_click', name: 'Cost per Unique Outbound Click', goodDirection: 'down' },

  // ============================================
  // CLICKS & TRAFFIC > Landing Pages
  // ============================================
  { id: 'landing_page_view_actions_per_link_click', name: 'Landing Page Views per Link Click', goodDirection: 'up', comment: 'Больше людей дождались загрузки' },
  { id: 'landing_page_view_per_link_click', name: 'Landing Page View Rate', goodDirection: 'up' },
  { id: 'cost_per_landing_page_view', name: 'Cost per Landing Page View', goodDirection: 'down' },
  { id: 'landing_page_view_per_purchase_rate', name: 'LPV to Purchase Rate', goodDirection: 'up' },
  { id: 'purchase_per_landing_page_view', name: 'Purchases per Landing Page View', goodDirection: 'up' },

  // ============================================
  // CLICKS & TRAFFIC > Website
  // ============================================
  { id: 'website_ctr', name: 'Website CTR', goodDirection: 'up' },

  // ============================================
  // CONVERSIONS > General
  // ============================================
  { id: 'conversions', name: 'Conversions', goodDirection: 'up' },
  { id: 'unique_conversions', name: 'Unique Conversions', goodDirection: 'up' },
  { id: 'conversion_values', name: 'Conversion Values', goodDirection: 'up', comment: 'Больше денег от конверсий' },
  { id: 'cost_per_conversion', name: 'Cost per Conversion', goodDirection: 'down' },
  { id: 'cost_per_unique_conversion', name: 'Cost per Unique Conversion', goodDirection: 'down' },
  { id: 'conversion_rate_ranking', name: 'Conversion Rate Ranking', goodDirection: 'up', comment: 'Лучший рейтинг' },

  // ============================================
  // CONVERSIONS > Actions
  // ============================================
  { id: 'actions', name: 'Actions', goodDirection: 'up' },
  { id: 'unique_actions', name: 'Unique Actions', goodDirection: 'up' },
  { id: 'action_values', name: 'Action Values', goodDirection: 'up' },
  { id: 'cost_per_action_type', name: 'Cost per Action Type', goodDirection: 'down' },
  { id: 'cost_per_unique_action_type', name: 'Cost per Unique Action Type', goodDirection: 'down' },

  // ============================================
  // CONVERSIONS > Leads
  // ============================================
  { id: 'conversion_leads', name: 'Conversion Leads', goodDirection: 'up' },
  { id: 'conversion_lead_rate', name: 'Conversion Lead Rate', goodDirection: 'up' },
  { id: 'cost_per_conversion_lead', name: 'Cost per Conversion Lead', goodDirection: 'down' },

  // ============================================
  // CONVERSIONS > DDA
  // ============================================
  { id: 'dda_countby_convs', name: 'DDA Conversions Count', goodDirection: 'up' },
  { id: 'cost_per_dda_countby_convs', name: 'Cost per DDA Conversion', goodDirection: 'down' },
  { id: 'dda_results', name: 'DDA Results', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Purchases
  // ============================================
  { id: 'purchase_roas', name: 'Purchase ROAS', goodDirection: 'up', comment: 'Выше возврат на рекламу' },
  { id: 'mobile_app_purchase_roas', name: 'Mobile App Purchase ROAS', goodDirection: 'up' },
  { id: 'website_purchase_roas', name: 'Website Purchase ROAS', goodDirection: 'up' },
  { id: 'purchases_per_link_click', name: 'Purchases per Link Click', goodDirection: 'up' },
  { id: 'average_purchases_conversion_value', name: 'Avg Purchase Conversion Value', goodDirection: 'up', comment: 'Выше средний чек' },

  // ============================================
  // E-COMMERCE > Catalog
  // ============================================
  { id: 'catalog_segment_actions', name: 'Catalog Segment Actions', goodDirection: 'up' },
  { id: 'catalog_segment_value', name: 'Catalog Segment Value', goodDirection: 'up' },
  { id: 'catalog_segment_value_mobile_purchase_roas', name: 'Catalog Mobile ROAS', goodDirection: 'up' },
  { id: 'catalog_segment_value_omni_purchase_roas', name: 'Catalog Omni ROAS', goodDirection: 'up' },
  { id: 'catalog_segment_value_website_purchase_roas', name: 'Catalog Website ROAS', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Product Performance
  // ============================================
  { id: 'product_views', name: 'Product Views', goodDirection: 'up' },
  { id: 'converted_product_quantity', name: 'Converted Product Quantity', goodDirection: 'up' },
  { id: 'converted_product_value', name: 'Converted Product Value', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Converted Products - Mobile
  // ============================================
  { id: 'converted_product_app_custom_event_fb_mobile_purchase', name: 'Mobile Purchases', goodDirection: 'up' },
  { id: 'converted_product_app_custom_event_fb_mobile_purchase_value', name: 'Mobile Purchase Value', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Converted Products - Website
  // ============================================
  { id: 'converted_product_website_pixel_purchase', name: 'Website Purchases', goodDirection: 'up' },
  { id: 'converted_product_website_pixel_purchase_value', name: 'Website Purchase Value', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Converted Products - Offline
  // ============================================
  { id: 'converted_product_offline_purchase', name: 'Offline Purchases', goodDirection: 'up' },
  { id: 'converted_product_offline_purchase_value', name: 'Offline Purchase Value', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Converted Products - Omni
  // ============================================
  { id: 'converted_product_omni_purchase', name: 'Omni Purchases', goodDirection: 'up' },
  { id: 'converted_product_omni_purchase_values', name: 'Omni Purchase Values', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Promoted Products - Mobile
  // ============================================
  { id: 'converted_promoted_product_app_custom_event_fb_mobile_purchase', name: 'Mobile Purchases', goodDirection: 'up' },
  { id: 'converted_promoted_product_app_custom_event_fb_mobile_purchase_value', name: 'Mobile Purchase Value', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Promoted Products - Website
  // ============================================
  { id: 'converted_promoted_product_website_pixel_purchase', name: 'Website Purchases', goodDirection: 'up' },
  { id: 'converted_promoted_product_website_pixel_purchase_value', name: 'Website Purchase Value', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Promoted Products - Offline
  // ============================================
  { id: 'converted_promoted_product_offline_purchase', name: 'Offline Purchases', goodDirection: 'up' },
  { id: 'converted_promoted_product_offline_purchase_value', name: 'Offline Purchase Value', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Promoted Products - Omni
  // ============================================
  { id: 'converted_promoted_product_omni_purchase', name: 'Omni Purchases', goodDirection: 'up' },
  { id: 'converted_promoted_product_omni_purchase_values', name: 'Omni Purchase Values', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Promoted Products - General
  // ============================================
  { id: 'converted_promoted_product_quantity', name: 'Promoted Product Quantity', goodDirection: 'up' },
  { id: 'converted_promoted_product_value', name: 'Promoted Product Value', goodDirection: 'up' },

  // ============================================
  // E-COMMERCE > Shops
  // ============================================
  { id: 'shops_assisted_purchases', name: 'Shops Assisted Purchases', goodDirection: 'up' },

  // ============================================
  // ENGAGEMENT > Post Engagement
  // ============================================
  { id: 'inline_post_engagement', name: 'Inline Post Engagement', goodDirection: 'up' },
  { id: 'cost_per_inline_post_engagement', name: 'Cost per Inline Post Engagement', goodDirection: 'down' },

  // ============================================
  // ENGAGEMENT > Interactive
  // ============================================
  { id: 'interactive_component_tap', name: 'Interactive Component Taps', goodDirection: 'up' },

  // ============================================
  // ENGAGEMENT > Instagram
  // ============================================
  { id: 'instagram_upcoming_event_reminders_set', name: 'Instagram Event Reminders', goodDirection: 'up' },

  // ============================================
  // VIDEO > Video Views
  // ============================================
  { id: 'video_play_actions', name: 'Video Plays', goodDirection: 'up' },
  { id: 'video_view_per_impression', name: 'Video Views per Impression', goodDirection: 'up' },

  // ============================================
  // VIDEO > Watch Time
  // ============================================
  { id: 'video_avg_time_watched_actions', name: 'Avg Time Watched', goodDirection: 'up', comment: 'Дольше смотрят = лучше контент' },
  { id: 'video_time_watched_actions', name: 'Total Time Watched', goodDirection: 'up' },

  // ============================================
  // VIDEO > Video Completion
  // ============================================
  { id: 'video_p25_watched_actions', name: 'Watched to 25%', goodDirection: 'up' },
  { id: 'video_p50_watched_actions', name: 'Watched to 50%', goodDirection: 'up' },
  { id: 'video_p75_watched_actions', name: 'Watched to 75%', goodDirection: 'up' },
  { id: 'video_p95_watched_actions', name: 'Watched to 95%', goodDirection: 'up' },
  { id: 'video_p100_watched_actions', name: 'Watched to 100%', goodDirection: 'up' },

  // ============================================
  // VIDEO > Video Engagement
  // ============================================
  { id: 'video_15_sec_watched_actions', name: '15 Sec Watched', goodDirection: 'up' },
  { id: 'unique_video_view_15_sec', name: 'Unique 15 Sec Views', goodDirection: 'up' },
  { id: 'cost_per_15_sec_video_view', name: 'Cost per 15 Sec View', goodDirection: 'down' },
  { id: 'video_30_sec_watched_actions', name: '30 Sec Watched', goodDirection: 'up' },

  // ============================================
  // VIDEO > Continuous Views
  // ============================================
  { id: 'video_continuous_2_sec_watched_actions', name: '2 Sec Continuous Views', goodDirection: 'up' },
  { id: 'unique_video_continuous_2_sec_watched_actions', name: 'Unique 2 Sec Continuous Views', goodDirection: 'up' },
  { id: 'cost_per_2_sec_continuous_video_view', name: 'Cost per 2 Sec View', goodDirection: 'down' },

  // ============================================
  // VIDEO > ThruPlay
  // ============================================
  { id: 'video_thruplay_watched_actions', name: 'ThruPlays', goodDirection: 'up' },
  { id: 'cost_per_thruplay', name: 'Cost per ThruPlay', goodDirection: 'down' },

  // ============================================
  // VIDEO > Retention Analytics
  // ============================================
  { id: 'video_play_curve_actions', name: 'Video Play Curve', goodDirection: 'neutral', comment: 'Это график, не число' },
  { id: 'video_play_retention_graph_actions', name: 'Retention Graph', goodDirection: 'neutral', comment: 'Это график, не число' },
  { id: 'video_play_retention_0_to_15s_actions', name: 'Retention 0-15s', goodDirection: 'up' },
  { id: 'video_play_retention_20_to_60s_actions', name: 'Retention 20-60s', goodDirection: 'up' },

  // ============================================
  // CREATIVE FORMATS > Instant Experience
  // ============================================
  { id: 'instant_experience_clicks_to_open', name: 'Clicks to Open', goodDirection: 'up' },
  { id: 'instant_experience_clicks_to_start', name: 'Clicks to Start', goodDirection: 'up' },
  { id: 'instant_experience_outbound_clicks', name: 'Outbound Clicks', goodDirection: 'up' },

  // ============================================
  // CREATIVE FORMATS > Canvas
  // ============================================
  { id: 'canvas_avg_view_time', name: 'Avg View Time', goodDirection: 'up' },
  { id: 'canvas_avg_view_percent', name: 'Avg View Percent', goodDirection: 'up' },

  // ============================================
  // CREATIVE FORMATS > Other
  // ============================================
  { id: 'total_card_view', name: 'Total Card Views', goodDirection: 'up' },

  // ============================================
  // MESSAGING > Delivery
  // ============================================
  { id: 'marketing_messages_sent', name: 'Messages Sent', goodDirection: 'up' },
  { id: 'marketing_messages_delivered', name: 'Messages Delivered', goodDirection: 'up' },
  { id: 'marketing_messages_delivery_rate', name: 'Delivery Rate', goodDirection: 'up' },
  { id: 'marketing_messages_cost_per_delivered', name: 'Cost per Delivered', goodDirection: 'down' },

  // ============================================
  // MESSAGING > Engagement
  // ============================================
  { id: 'marketing_messages_read', name: 'Messages Read', goodDirection: 'up' },
  { id: 'marketing_messages_read_rate', name: 'Read Rate', goodDirection: 'up' },
  { id: 'marketing_messages_read_rate_benchmark', name: 'Read Rate Benchmark', goodDirection: 'neutral', comment: 'Это бенчмарк, не целевая метрика' },
  { id: 'marketing_messages_media_view_rate', name: 'Media View Rate', goodDirection: 'up' },

  // ============================================
  // MESSAGING > Link Clicks
  // ============================================
  { id: 'marketing_messages_link_btn_click', name: 'Link Button Clicks', goodDirection: 'up' },
  { id: 'marketing_messages_link_btn_click_rate', name: 'Link Click Rate', goodDirection: 'up' },
  { id: 'marketing_messages_click_rate_benchmark', name: 'Click Rate Benchmark', goodDirection: 'neutral', comment: 'Это бенчмарк, не целевая метрика' },
  { id: 'marketing_messages_cost_per_link_btn_click', name: 'Cost per Link Click', goodDirection: 'down' },

  // ============================================
  // MESSAGING > Quick Replies
  // ============================================
  { id: 'marketing_messages_quick_reply_btn_click', name: 'Quick Reply Clicks', goodDirection: 'up' },
  { id: 'marketing_messages_quick_reply_btn_click_rate', name: 'Quick Reply Rate', goodDirection: 'up' },
  { id: 'marketing_messages_phone_call_btn_click_rate', name: 'Phone Call Button Rate', goodDirection: 'up' },

  // ============================================
  // MESSAGING > Conversions
  // ============================================
  { id: 'marketing_messages_website_add_to_cart', name: 'Add to Cart', goodDirection: 'up' },
  { id: 'marketing_messages_website_initiate_checkout', name: 'Initiate Checkout', goodDirection: 'up' },
  { id: 'marketing_messages_website_purchase', name: 'Purchases', goodDirection: 'up' },
  { id: 'marketing_messages_website_purchase_values', name: 'Purchase Values', goodDirection: 'up' },

  // ============================================
  // MESSAGING > Spend
  // ============================================
  { id: 'marketing_messages_spend', name: 'Messaging Spend', goodDirection: 'down' },
  { id: 'marketing_messages_spend_currency', name: 'Spend Currency', goodDirection: 'neutral', comment: 'Это не числовая метрика' },

  // ============================================
  // MESSAGING > On-Site
  // ============================================
  { id: 'onsite_conversion_messaging_detected_purchase_deduped', name: 'On-Site Purchases (Deduped)', goodDirection: 'up' },

  // ============================================
  // QUALITY & RANKINGS > Quality Scores
  // ============================================
  { id: 'quality_ranking', name: 'Quality Ranking', goodDirection: 'up', comment: 'Лучший рейтинг качества' },
  { id: 'engagement_rate_ranking', name: 'Engagement Rate Ranking', goodDirection: 'up' },

  // ============================================
  // QUALITY & RANKINGS > Ad Recall
  // ============================================
  { id: 'estimated_ad_recallers', name: 'Estimated Ad Recallers', goodDirection: 'up' },
  { id: 'estimated_ad_recallers_lower_bound', name: 'Est. Recallers (Lower)', goodDirection: 'up' },
  { id: 'estimated_ad_recallers_upper_bound', name: 'Est. Recallers (Upper)', goodDirection: 'up' },
  { id: 'cost_per_estimated_ad_recallers', name: 'Cost per Ad Recaller', goodDirection: 'down' },
  { id: 'estimated_ad_recall_rate', name: 'Est. Ad Recall Rate', goodDirection: 'up' },
  { id: 'estimated_ad_recall_rate_lower_bound', name: 'Est. Recall Rate (Lower)', goodDirection: 'up' },
  { id: 'estimated_ad_recall_rate_upper_bound', name: 'Est. Recall Rate (Upper)', goodDirection: 'up' },

  // ============================================
  // QUALITY & RANKINGS > Performance Indicators
  // ============================================
  { id: 'result_values_performance_indicator', name: 'Result Values Indicator', goodDirection: 'up' },

  // ============================================
  // ATTRIBUTION > Impressions
  // ============================================
  { id: 'ad_impression_actions', name: 'Ad Impression Actions', goodDirection: 'up' },
  { id: 'cost_per_one_thousand_ad_impression', name: 'Cost per 1000 Ad Impressions', goodDirection: 'down' },

  // ============================================
  // ATTRIBUTION > Postbacks
  // ============================================
  { id: 'total_postbacks', name: 'Total Postbacks', goodDirection: 'up' },
  { id: 'total_postbacks_detailed', name: 'Total Postbacks (Detailed)', goodDirection: 'up' },
  { id: 'total_postbacks_detailed_v4', name: 'Total Postbacks V4', goodDirection: 'up' },
];

/**
 * Быстрый поиск полярности по ID метрики
 */
const polarityMap = new Map<string, MetricPolarity>(
  metricPolarityConfig.map(m => [m.id, m.goodDirection])
);

/**
 * Получить полярность метрики (что хорошо — рост или падение)
 * @param metricId ID метрики
 * @returns 'up' | 'down' | 'neutral'
 */
export function getMetricPolarity(metricId: string): MetricPolarity {
  // Проверяем точное совпадение
  const polarity = polarityMap.get(metricId);
  if (polarity) return polarity;
  
  // Эвристика для неизвестных метрик по паттернам
  const id = metricId.toLowerCase();
  
  // Cost-метрики: падение — хорошо
  if (id.includes('cost') || id.includes('cpm') || id.includes('cpc') || id.includes('cpp') || id.includes('spend')) {
    return 'down';
  }
  
  // Rate/CTR/ROAS метрики: рост — хорошо
  if (id.includes('rate') || id.includes('ctr') || id.includes('roas') || id.includes('ranking')) {
    return 'up';
  }
  
  // По умолчанию: рост — хорошо (для количественных метрик)
  return 'up';
}

/**
 * Определить CSS-класс цвета для изменения метрики
 * @param metricId ID метрики
 * @param percentChange Процент изменения (>0 рост, <0 падение)
 * @returns CSS-класс для цвета
 */
export function getMetricChangeColorClass(metricId: string, percentChange: number): string {
  if (percentChange === 0) {
    return 'text-muted-foreground';
  }
  
  const polarity = getMetricPolarity(metricId);
  
  if (polarity === 'neutral') {
    return 'text-muted-foreground';
  }
  
  const isPositiveChange = percentChange > 0;
  const isGoodChange = (polarity === 'up' && isPositiveChange) || (polarity === 'down' && !isPositiveChange);
  
  return isGoodChange
    ? 'text-green-600 dark:text-green-500'
    : 'text-red-600 dark:text-red-500';
}

/**
 * Проверить, является ли изменение "хорошим" для данной метрики
 * @param metricId ID метрики
 * @param percentChange Процент изменения
 * @returns true если изменение хорошее, false если плохое, null если нейтральное
 */
export function isGoodChange(metricId: string, percentChange: number): boolean | null {
  if (percentChange === 0) return null;
  
  const polarity = getMetricPolarity(metricId);
  if (polarity === 'neutral') return null;
  
  const isPositiveChange = percentChange > 0;
  return (polarity === 'up' && isPositiveChange) || (polarity === 'down' && !isPositiveChange);
}
