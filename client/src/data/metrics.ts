export interface Metric {
  id: string;
  name: string;
  description?: string;
}

export interface MetricSubcategory {
  name: string;
  metrics: Metric[];
  // Паттерны для автоматического добавления метрик из БД
  patterns?: string[];
}

export interface MetricCategory {
  id: string;
  name: string;
  icon: string;
  subcategories?: MetricSubcategory[];
  metrics?: Metric[];
  // Паттерны для автоматического добавления метрик в категорию
  patterns?: string[];
}

/**
 * Категории метрик Facebook Ads.
 * 
 * Структура:
 * - Базовые метрики явно указаны в metrics[]
 * - patterns[] определяют какие динамические метрики (из БД) попадают в группу
 * - Динамические метрики (actions_link_click, cost_per_result_* и т.д.) добавляются автоматически
 */
export const metricCategories: MetricCategory[] = [
  {
    id: 'performance',
    name: 'Performance',
    icon: 'BarChart3',
    subcategories: [
      {
        name: 'Delivery',
        metrics: [
          { id: 'impressions', name: 'Impressions' },
          { id: 'reach', name: 'Reach' },
          { id: 'frequency', name: 'Frequency' },
          { id: 'full_view_impressions', name: 'Full View Impressions' },
          { id: 'full_view_reach', name: 'Full View Reach' },
        ],
      },
      {
        name: 'Spend & Costs',
        metrics: [
          { id: 'spend', name: 'Spend' },
          { id: 'social_spend', name: 'Social Spend' },
          { id: 'cpm', name: 'CPM' },
          { id: 'cpp', name: 'CPP' },
          { id: 'cpc', name: 'CPC' },
        ],
      },
    ],
  },
  {
    id: 'clicks',
    name: 'Clicks & Traffic',
    icon: 'MousePointerClick',
    subcategories: [
      {
        name: 'All Clicks',
        metrics: [
          { id: 'clicks', name: 'Clicks' },
          { id: 'unique_clicks', name: 'Unique Clicks' },
          { id: 'ctr', name: 'CTR' },
          { id: 'unique_ctr', name: 'Unique CTR' },
          { id: 'cost_per_unique_click', name: 'Cost per Unique Click' },
        ],
      },
      {
        name: 'Link Clicks',
        metrics: [
          { id: 'inline_link_clicks', name: 'Inline Link Clicks' },
          { id: 'unique_inline_link_clicks', name: 'Unique Inline Link Clicks' },
          { id: 'inline_link_click_ctr', name: 'Inline Link Click CTR' },
          { id: 'unique_inline_link_click_ctr', name: 'Unique Inline Link Click CTR' },
          { id: 'cost_per_inline_link_click', name: 'Cost per Inline Link Click' },
          { id: 'cost_per_unique_inline_link_click', name: 'Cost per Unique Inline Link Click' },
          { id: 'unique_link_clicks_ctr', name: 'Unique Link Clicks CTR' },
        ],
        // Динамические link_click action метрики
        patterns: [
          'actions_link_click',
          'unique_actions_link_click',
          'cost_per_action_type_link_click',
          'cost_per_unique_action_type_link_click',
        ],
      },
      {
        name: 'Outbound Clicks',
        metrics: [
          { id: 'outbound_clicks', name: 'Outbound Clicks' },
          { id: 'unique_outbound_clicks', name: 'Unique Outbound Clicks' },
          { id: 'outbound_clicks_ctr', name: 'Outbound Clicks CTR' },
          { id: 'unique_outbound_clicks_ctr', name: 'Unique Outbound Clicks CTR' },
          { id: 'cost_per_outbound_click', name: 'Cost per Outbound Click' },
          { id: 'cost_per_unique_outbound_click', name: 'Cost per Unique Outbound Click' },
        ],
        patterns: [
          'outbound_clicks_',
          'unique_outbound_clicks_',
          'outbound_clicks_ctr_',
          'unique_outbound_clicks_ctr_',
          'cost_per_outbound_click_',
          'cost_per_unique_outbound_click_',
        ],
      },
      {
        name: 'Landing Pages',
        metrics: [
          { id: 'landing_page_view_per_link_click', name: 'Landing Page View Rate' },
          { id: 'cost_per_landing_page_view', name: 'Cost per Landing Page View' },
        ],
        // Динамические landing page action метрики
        patterns: [
          'actions_landing_page_view',
          'actions_omni_landing_page_view',
          'unique_actions_landing_page_view',
          'unique_actions_omni_landing_page_view',
          'cost_per_action_type_landing_page_view',
          'cost_per_action_type_omni_landing_page_view',
        ],
      },
      {
        name: 'Website',
        metrics: [
          { id: 'website_ctr', name: 'Website CTR' },
        ],
        patterns: ['website_ctr_'],
      },
    ],
  },
  {
    id: 'conversions',
    name: 'Conversions & Results',
    icon: 'Target',
    subcategories: [
      {
        name: 'Results',
        metrics: [
          { id: 'results', name: 'Results' },
          { id: 'result_rate', name: 'Result Rate' },
          { id: 'cost_per_result', name: 'Cost per Result' },
        ],
        patterns: ['results_', 'result_rate_', 'cost_per_result_'],
      },
      {
        name: 'Conversions',
        metrics: [
          { id: 'conversions', name: 'Conversions' },
          { id: 'conversion_values', name: 'Conversion Values' },
          { id: 'cost_per_conversion', name: 'Cost per Conversion' },
          { id: 'conversion_rate_ranking', name: 'Conversion Rate Ranking' },
        ],
        patterns: ['conversions_', 'cost_per_conversion_'],
      },
      {
        name: 'Leads & Registrations',
        metrics: [
          { id: 'actions', name: 'Actions' },
          { id: 'unique_actions', name: 'Unique Actions' },
          { id: 'action_values', name: 'Action Values' },
          { id: 'cost_per_action_type', name: 'Cost per Action Type' },
          { id: 'cost_per_unique_action_type', name: 'Cost per Unique Action Type' },
        ],
        // ТОЛЬКО реальные конверсии: лиды, регистрации, покупки
        patterns: [
          // Лиды
          'actions_lead',
          'actions_onsite_conversion.lead',
          'actions_onsite_conversion.lead_grouped',
          'actions_onsite_web_lead',
          // Офлайн-конверсии Meta Leads
          'actions_offsite_complete_registration_add_meta_leads',
          'actions_offsite_content_view_add_meta_leads',
          'actions_offsite_search_add_meta_leads',
          // Pixel-конверсии
          'actions_offsite_conversion.',
          // Покупки и E-commerce
          'actions_purchase',
          'actions_add_to_cart',
          'actions_add_to_wishlist',
          'actions_initiate_checkout',
          'actions_add_payment_info',
          'actions_complete_registration',
          // Подписки
          'actions_subscribe',
          'actions_start_trial',
          'actions_app_install',
          'actions_mobile_app_install',
          // Уникальные версии
          'unique_actions_lead',
          'unique_actions_purchase',
          'unique_actions_add_to_cart',
          'unique_actions_complete_registration',
          // Стоимость за действие
          'cost_per_action_type_lead',
          'cost_per_action_type_onsite_conversion.lead',
          'cost_per_action_type_purchase',
          'cost_per_action_type_add_to_cart',
          'cost_per_action_type_complete_registration',
          'cost_per_action_type_offsite_',
          'cost_per_unique_action_type_lead',
          'cost_per_unique_action_type_purchase',
        ],
      },
      {
        name: 'Leads',
        metrics: [
          { id: 'conversion_leads', name: 'Conversion Leads' },
          { id: 'conversion_lead_rate', name: 'Conversion Lead Rate' },
          { id: 'cost_per_conversion_lead', name: 'Cost per Conversion Lead' },
        ],
      },
      {
        name: 'DDA (Data-Driven Attribution)',
        metrics: [
          { id: 'dda_countby_convs', name: 'DDA Conversions Count' },
          { id: 'cost_per_dda_countby_convs', name: 'Cost per DDA Conversion' },
          { id: 'dda_results', name: 'DDA Results' },
        ],
      },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    icon: 'ShoppingCart',
    subcategories: [
      {
        name: 'Purchases',
        metrics: [
          { id: 'purchase_roas', name: 'Purchase ROAS' },
          { id: 'mobile_app_purchase_roas', name: 'Mobile App Purchase ROAS' },
          { id: 'website_purchase_roas', name: 'Website Purchase ROAS' },
        ],
      },
      {
        name: 'Catalog',
        metrics: [
          { id: 'catalog_segment_actions', name: 'Catalog Segment Actions' },
          { id: 'catalog_segment_value', name: 'Catalog Segment Value' },
        ],
      },
      {
        name: 'Products',
        metrics: [
          { id: 'product_views', name: 'Product Views' },
          { id: 'converted_product_quantity', name: 'Converted Product Quantity' },
          { id: 'converted_product_value', name: 'Converted Product Value' },
        ],
        patterns: ['converted_product_', 'converted_promoted_product_'],
      },
      {
        name: 'Shops',
        metrics: [
          { id: 'shops_assisted_purchases', name: 'Shops Assisted Purchases' },
        ],
      },
    ],
  },
  {
    id: 'engagement',
    name: 'Engagement',
    icon: 'Heart',
    subcategories: [
      {
        name: 'Post Engagement',
        metrics: [
          { id: 'inline_post_engagement', name: 'Inline Post Engagement' },
          { id: 'cost_per_inline_post_engagement', name: 'Cost per Inline Post Engagement' },
        ],
        // Динамические engagement action метрики
        patterns: [
          'actions_page_engagement',
          'actions_post_engagement',
          'actions_post_reaction',
          'actions_comment',
          'actions_like',
          'actions_post',
          'actions_post_interaction_gross',
          'actions_post_net_like',
          'actions_post_unlike',
          'actions_photo_view',
          'actions_onsite_conversion.post_save',
          'actions_onsite_conversion.post_net_like',
          'actions_onsite_conversion.post_net_save',
          'actions_onsite_conversion.post_unlike',
          'unique_actions_page_engagement',
          'unique_actions_post_engagement',
          'unique_actions_comment',
          'unique_actions_like',
          'unique_actions_photo_view',
          'cost_per_action_type_page_engagement',
          'cost_per_action_type_post_engagement',
          'cost_per_action_type_comment',
          'cost_per_action_type_like',
        ],
      },
      {
        name: 'Interactive',
        metrics: [
          { id: 'interactive_component_tap', name: 'Interactive Component Taps' },
        ],
        patterns: ['interactive_component_tap_'],
      },
      {
        name: 'Instagram',
        metrics: [
          { id: 'instagram_upcoming_event_reminders_set', name: 'Instagram Event Reminders' },
        ],
      },
    ],
  },
  {
    id: 'video',
    name: 'Video',
    icon: 'Video',
    subcategories: [
      {
        name: 'Video Views',
        metrics: [
          { id: 'video_play_actions', name: 'Video Plays' },
          { id: 'video_view_per_impression', name: 'Video Views per Impression' },
        ],
        patterns: [
          'video_play_actions_',
          'actions_video_view',
          'unique_actions_video_view',
          'cost_per_action_type_video_view',
        ],
      },
      {
        name: 'Watch Time',
        metrics: [
          { id: 'video_avg_time_watched_actions', name: 'Avg Time Watched' },
          { id: 'video_time_watched_actions', name: 'Total Time Watched' },
        ],
        patterns: ['video_avg_time_watched_actions_'],
      },
      {
        name: 'Video Completion',
        metrics: [
          { id: 'video_p25_watched_actions', name: 'Watched to 25%' },
          { id: 'video_p50_watched_actions', name: 'Watched to 50%' },
          { id: 'video_p75_watched_actions', name: 'Watched to 75%' },
          { id: 'video_p95_watched_actions', name: 'Watched to 95%' },
          { id: 'video_p100_watched_actions', name: 'Watched to 100%' },
        ],
        patterns: [
          'video_p25_watched_actions_',
          'video_p50_watched_actions_',
          'video_p75_watched_actions_',
          'video_p95_watched_actions_',
          'video_p100_watched_actions_',
        ],
      },
      {
        name: 'Video Engagement',
        metrics: [
          { id: 'video_15_sec_watched_actions', name: '15 Sec Watched' },
          { id: 'cost_per_15_sec_video_view', name: 'Cost per 15 Sec View' },
          { id: 'video_30_sec_watched_actions', name: '30 Sec Watched' },
        ],
        patterns: ['video_30_sec_watched_actions_', 'cost_per_15_sec_video_view_'],
      },
      {
        name: 'ThruPlay',
        metrics: [
          { id: 'video_thruplay_watched_actions', name: 'ThruPlays' },
          { id: 'cost_per_thruplay', name: 'Cost per ThruPlay' },
        ],
        patterns: ['video_thruplay_watched_actions_', 'cost_per_thruplay_'],
      },
      {
        name: 'Retention',
        metrics: [
          { id: 'video_play_curve_actions', name: 'Video Play Curve' },
          { id: 'video_play_retention_graph_actions', name: 'Retention Graph' },
        ],
        patterns: ['video_play_curve_actions_', 'video_play_retention_'],
      },
    ],
  },
  {
    id: 'creatives',
    name: 'Creative Formats',
    icon: 'Sparkles',
    subcategories: [
      {
        name: 'Instant Experience',
        metrics: [
          { id: 'instant_experience_clicks_to_open', name: 'Clicks to Open' },
          { id: 'instant_experience_clicks_to_start', name: 'Clicks to Start' },
          { id: 'instant_experience_outbound_clicks', name: 'IX Outbound Clicks' },
        ],
      },
      {
        name: 'Canvas',
        metrics: [
          { id: 'canvas_avg_view_time', name: 'Avg View Time' },
          { id: 'canvas_avg_view_percent', name: 'Avg View Percent' },
        ],
      },
    ],
  },
  {
    id: 'messaging',
    name: 'Messaging',
    icon: 'MessageSquare',
    subcategories: [
      {
        name: 'Delivery',
        metrics: [
          { id: 'marketing_messages_sent', name: 'Messages Sent' },
          { id: 'marketing_messages_delivered', name: 'Messages Delivered' },
          { id: 'marketing_messages_delivery_rate', name: 'Delivery Rate' },
          { id: 'marketing_messages_cost_per_delivered', name: 'Cost per Delivered' },
        ],
      },
      {
        name: 'Engagement',
        metrics: [
          { id: 'marketing_messages_read', name: 'Messages Read' },
          { id: 'marketing_messages_read_rate', name: 'Read Rate' },
          { id: 'marketing_messages_link_btn_click', name: 'Link Button Clicks' },
          { id: 'marketing_messages_link_btn_click_rate', name: 'Link Click Rate' },
          { id: 'marketing_messages_cost_per_link_btn_click', name: 'Cost per Link Click' },
          { id: 'marketing_messages_quick_reply_btn_click', name: 'Quick Reply Clicks' },
          { id: 'marketing_messages_quick_reply_btn_click_rate', name: 'Quick Reply Rate' },
        ],
      },
      {
        name: 'Conversions',
        metrics: [
          { id: 'marketing_messages_website_add_to_cart', name: 'Add to Cart' },
          { id: 'marketing_messages_website_initiate_checkout', name: 'Initiate Checkout' },
          { id: 'marketing_messages_website_purchase', name: 'Purchases' },
          { id: 'marketing_messages_website_purchase_values', name: 'Purchase Values' },
        ],
      },
      {
        name: 'Spend',
        metrics: [
          { id: 'marketing_messages_spend', name: 'Messaging Spend' },
        ],
      },
      {
        name: 'Messaging Actions',
        metrics: [],
        // Динамические messaging action метрики (все onsite_conversion.messaging_*)
        patterns: [
          'actions_onsite_conversion.messaging_',
          'actions_onsite_conversion.total_messaging_connection',
          'actions_onsite_conversion.messaging_block',
          'actions_onsite_conversion.messaging_first_reply',
          'actions_onsite_conversion.messaging_conversation_started_7d',
          'actions_onsite_conversion.messaging_conversation_replied_7d',
          'actions_onsite_conversion.messaging_user_depth_2_message_send',
          'actions_onsite_conversion.messaging_user_depth_3_message_send',
          'actions_onsite_conversion.messaging_user_depth_5_message_send',
          'actions_onsite_conversion.messaging_welcome_message_view',
          'actions_onsite_conversion.messaging_order_created_v2',
          'unique_actions_onsite_conversion.messaging_',
          'unique_actions_onsite_conversion.total_messaging_connection',
          'cost_per_action_type_onsite_conversion.messaging_',
          'cost_per_action_type_onsite_conversion.total_messaging_connection',
        ],
      },
    ],
    patterns: ['marketing_messages_'],
  },
  {
    id: 'quality',
    name: 'Quality & Rankings',
    icon: 'Gauge',
    subcategories: [
      {
        name: 'Quality Scores',
        metrics: [
          { id: 'quality_ranking', name: 'Quality Ranking' },
          { id: 'engagement_rate_ranking', name: 'Engagement Rate Ranking' },
        ],
      },
      {
        name: 'Ad Recall',
        metrics: [
          { id: 'estimated_ad_recallers', name: 'Estimated Ad Recallers' },
          { id: 'cost_per_estimated_ad_recallers', name: 'Cost per Ad Recaller' },
          { id: 'estimated_ad_recall_rate', name: 'Est. Ad Recall Rate' },
        ],
      },
      {
        name: 'Auction & Bidding',
        metrics: [
          { id: 'wish_bid', name: 'Wish Bid' },
          { id: 'auction_bid', name: 'Auction Bid' },
          { id: 'auction_competitiveness', name: 'Auction Competitiveness' },
          { id: 'auction_max_competitor_bid', name: 'Max Competitor Bid' },
        ],
      },
      {
        name: 'Performance Indicators',
        metrics: [
          { id: 'result_values_performance_indicator', name: 'Result Values Indicator' },
        ],
      },
    ],
  },
  {
    id: 'attribution',
    name: 'Attribution',
    icon: 'Share2',
    subcategories: [
      {
        name: 'Impressions',
        metrics: [
          { id: 'ad_impression_actions', name: 'Ad Impression Actions' },
          { id: 'cost_per_one_thousand_ad_impression', name: 'Cost per 1000 Ad Impressions' },
        ],
      },
      {
        name: 'Postbacks',
        metrics: [
          { id: 'total_postbacks', name: 'Total Postbacks' },
          { id: 'total_postbacks_detailed', name: 'Total Postbacks (Detailed)' },
        ],
      },
    ],
  },
  {
    id: 'calculated',
    name: 'Calculate Metric',
    icon: 'SquareFunction',
    subcategories: [
      {
        name: 'Create',
        metrics: [],
      },
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: 'Users',
    subcategories: [
      {
        name: 'Leads',
        metrics: [
          { id: 'crm_leads', name: 'Leads', description: 'Total leads from CRM' },
          { id: 'crm_leads_unique', name: 'Unique Leads', description: 'Unique leads by contact' },
          { id: 'cpl', name: 'CPL', description: 'Cost per Lead (Spend / Leads)' },
        ],
      },
      {
        name: 'Deals',
        metrics: [
          { id: 'crm_deals', name: 'Deals', description: 'Total deals created' },
          { id: 'crm_deals_won', name: 'Won Deals', description: 'Successfully closed deals' },
          { id: 'crm_conversion_rate', name: 'Lead → Deal %', description: 'Conversion from lead to deal' },
          { id: 'crm_win_rate', name: 'Win Rate %', description: 'Won deals / Total deals' },
        ],
      },
      {
        name: 'Revenue',
        metrics: [
          { id: 'crm_revenue', name: 'Revenue', description: 'Total revenue from won deals' },
          { id: 'crm_avg_deal_value', name: 'Avg Deal Value', description: 'Average value of won deals' },
          { id: 'crm_roi', name: 'ROI', description: '(Revenue - Spend) / Spend × 100%' },
          { id: 'crm_roas', name: 'ROAS', description: 'Revenue / Spend' },
        ],
      },
      {
        name: 'Attribution',
        metrics: [
          { id: 'crm_match_rate', name: 'Match Rate', description: 'Leads with attribution / Total leads' },
          { id: 'crm_matched_leads', name: 'Matched Leads', description: 'Leads with FB attribution' },
          { id: 'crm_unmatched_leads', name: 'Unmatched Leads', description: 'Leads without attribution' },
          { id: 'crm_leads_fb_lead_ads', name: 'FB Lead Ads', description: 'Leads from FB Lead Ads forms' },
          { id: 'crm_leads_fbclid', name: 'fbclid Matched', description: 'Leads matched via fbclid' },
          { id: 'crm_leads_utm', name: 'UTM Matched', description: 'Leads matched via UTM params' },
        ],
      },
    ],
  },
];

/**
 * Генерирует человекочитаемое название метрики из её ID.
 */
export function formatMetricName(metricId: string): string {
  const prefixes = [
    'cost_per_unique_action_type_',
    'cost_per_action_type_',
    'cost_per_conversion_',
    'cost_per_outbound_click_',
    'cost_per_unique_outbound_click_',
    'cost_per_result_',
    'cost_per_thruplay_',
    'cost_per_15_sec_video_view_',
    'unique_outbound_clicks_ctr_',
    'outbound_clicks_ctr_',
    'unique_outbound_clicks_',
    'outbound_clicks_',
    'unique_actions_',
    'actions_',
    'conversions_',
    'results_',
    'result_rate_',
    'video_thruplay_watched_actions_',
    'video_avg_time_watched_actions_',
    'video_p100_watched_actions_',
    'video_p95_watched_actions_',
    'video_p75_watched_actions_',
    'video_p50_watched_actions_',
    'video_p25_watched_actions_',
    'video_30_sec_watched_actions_',
    'video_play_curve_actions_',
    'video_play_actions_',
    'website_ctr_',
    'interactive_component_tap_',
  ];

  let name = metricId;
  for (const prefix of prefixes) {
    if (name.startsWith(prefix)) {
      name = name.substring(prefix.length);
      break;
    }
  }

  return name
    .replace(/^onsite_conversion\./, '')
    .replace(/^offsite_conversion\./, '')
    .replace(/^actions:/, '')
    .replace(/^conversions:/, '')
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Определяет к какой категории/подкатегории относится метрика по паттернам.
 */
export function findMetricCategory(metricId: string): { categoryId: string; subcategoryName: string } | null {
  for (const category of metricCategories) {
    if (category.patterns) {
      for (const pattern of category.patterns) {
        if (metricId.includes(pattern)) {
          const firstSubcat = category.subcategories?.[0]?.name || 'General';
          return { categoryId: category.id, subcategoryName: firstSubcat };
        }
      }
    }

    if (category.subcategories) {
      for (const subcat of category.subcategories) {
        if (subcat.patterns) {
          for (const pattern of subcat.patterns) {
            if (metricId.startsWith(pattern)) {
              return { categoryId: category.id, subcategoryName: subcat.name };
            }
          }
        }
      }
    }
  }

  return null;
}
