import { ChartType } from './chartValidationRules';

export interface MetricPreset {
  id: string;
  name: string;
  description: string;
  chartType: ChartType;
  metrics: string[];
}

export const METRIC_PRESETS: MetricPreset[] = [
  // ========== PIE CHART PRESETS ==========
  {
    id: 'pie_traffic_distribution',
    name: 'Traffic Distribution',
    description: 'Comparison of reach, impressions, and clicks',
    chartType: 'pie',
    metrics: ['impressions', 'reach', 'clicks', 'conversions'],
  },
  {
    id: 'pie_engagement_split',
    name: 'Engagement Structure',
    description: 'Clicks, conversions and engagement',
    chartType: 'pie',
    metrics: ['clicks', 'unique_clicks', 'inline_link_clicks', 'conversions'],
  },
  {
    id: 'pie_budget_allocation',
    name: 'Budget Allocation',
    description: 'Spending structure',
    chartType: 'pie',
    metrics: ['spend', 'social_spend'],
  },
  {
    id: 'pie_revenue_sources',
    name: 'Revenue Sources',
    description: 'Revenue structure',
    chartType: 'pie',
    metrics: ['revenue', 'conversion_values'],
  },
  {
    id: 'pie_video_views',
    name: 'Video Views',
    description: 'Video views distribution',
    chartType: 'pie',
    metrics: ['video_play_actions', 'video_15_sec_watched_actions', 'video_30_sec_watched_actions', 'video_thruplay_watched_actions'],
  },

  // ========== FUNNEL CHART PRESETS ==========
  {
    id: 'funnel_full_conversion',
    name: 'Full Conversion Funnel',
    description: 'From impressions to conversions',
    chartType: 'funnel',
    metrics: ['impressions', 'reach', 'clicks', 'conversions'],
  },
  {
    id: 'funnel_engagement',
    name: 'Engagement Funnel',
    description: 'From reach to clicks',
    chartType: 'funnel',
    metrics: ['reach', 'clicks', 'inline_link_clicks', 'conversions'],
  },
  {
    id: 'funnel_unique_clicks',
    name: 'Unique Actions Funnel',
    description: 'Unique reach and clicks',
    chartType: 'funnel',
    metrics: ['reach', 'unique_clicks', 'unique_inline_link_clicks', 'unique_conversions'],
  },
  {
    id: 'funnel_video_completion',
    name: 'Video Viewing Funnel',
    description: 'From start to complete view',
    chartType: 'funnel',
    metrics: ['video_play_actions', 'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions'],
  },
  {
    id: 'funnel_video_short',
    name: 'Video Funnel (Short)',
    description: '0% → 50% → 100%',
    chartType: 'funnel',
    metrics: ['video_play_actions', 'video_p50_watched_actions', 'video_p100_watched_actions'],
  },
  {
    id: 'funnel_link_to_purchase',
    name: 'From Click to Purchase',
    description: 'User journey on website',
    chartType: 'funnel',
    metrics: ['inline_link_clicks', 'unique_inline_link_clicks', 'conversions'],
  },

  // ========== LINE CHART PRESETS ==========
  {
    id: 'line_performance_trends',
    name: 'Performance Trends',
    description: 'CTR, CR and ROAS dynamics',
    chartType: 'line',
    metrics: ['ctr', 'conversion_rate', 'roas'],
  },
  {
    id: 'line_traffic_growth',
    name: 'Traffic Growth',
    description: 'Changes in impressions, reach and clicks',
    chartType: 'line',
    metrics: ['impressions', 'reach', 'clicks'],
  },
  {
    id: 'line_spend_revenue',
    name: 'Spend and Revenue',
    description: 'Comparison of spend and revenue',
    chartType: 'line',
    metrics: ['spend', 'revenue'],
  },
  {
    id: 'line_cost_efficiency',
    name: 'Cost Efficiency',
    description: 'Cost metrics dynamics',
    chartType: 'line',
    metrics: ['cpc', 'cpm', 'cost_per_conversion'],
  },
  {
    id: 'line_engagement_metrics',
    name: 'Engagement Metrics',
    description: 'CTR and frequency',
    chartType: 'line',
    metrics: ['ctr', 'unique_ctr', 'frequency'],
  },
  {
    id: 'line_video_performance',
    name: 'Video Performance',
    description: 'Video view metrics',
    chartType: 'line',
    metrics: ['video_view_per_impression', 'video_avg_time_watched_actions'],
  },
  {
    id: 'line_quality_scores',
    name: 'Quality Scores',
    description: 'Rankings and scores',
    chartType: 'line',
    metrics: ['quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking'],
  },

  // ========== BAR CHART PRESETS ==========
  {
    id: 'bar_campaign_performance',
    name: 'Campaign Performance',
    description: 'Comparison of metrics',
    chartType: 'bar',
    metrics: ['ctr', 'conversion_rate', 'roas'],
  },
  {
    id: 'bar_volume_comparison',
    name: 'Volume Comparison',
    description: 'Impressions, clicks, conversions',
    chartType: 'bar',
    metrics: ['impressions', 'clicks', 'conversions'],
  },
  {
    id: 'bar_cost_analysis',
    name: 'Cost Analysis',
    description: 'Cost metrics',
    chartType: 'bar',
    metrics: ['cpc', 'cpm', 'cost_per_conversion'],
  },
  {
    id: 'bar_revenue_vs_spend',
    name: 'Revenue vs Spend',
    description: 'Comparison of budget and revenue',
    chartType: 'bar',
    metrics: ['spend', 'revenue'],
  },
  {
    id: 'bar_unique_vs_total',
    name: 'Unique vs Total',
    description: 'Comparison of unique and total metrics',
    chartType: 'bar',
    metrics: ['clicks', 'unique_clicks', 'inline_link_clicks', 'unique_inline_link_clicks'],
  },
  {
    id: 'bar_video_milestones',
    name: 'Video Viewing Milestones',
    description: 'Reaching viewing stages',
    chartType: 'bar',
    metrics: ['video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions'],
  },

  // ========== AREA CHART PRESETS ==========
  {
    id: 'area_traffic_volume',
    name: 'Traffic Volume',
    description: 'Impressions, clicks, reach and conversions',
    chartType: 'area',
    metrics: ['impressions', 'reach', 'clicks', 'conversions'],
  },
  {
    id: 'area_budget_burn_rate',
    name: 'Spend Dynamics',
    description: 'Budget burn rate',
    chartType: 'area',
    metrics: ['spend'],
  },
  {
    id: 'area_conversion_flow',
    name: 'Conversion Flow',
    description: 'Conversion volume over time',
    chartType: 'area',
    metrics: ['conversions', 'unique_conversions'],
  },
  {
    id: 'area_combined_traffic',
    name: 'Combined Traffic',
    description: 'All traffic metrics',
    chartType: 'area',
    metrics: ['impressions', 'reach', 'clicks'],
  },
  {
    id: 'area_video_engagement',
    name: 'Video Engagement',
    description: 'Video views over time',
    chartType: 'area',
    metrics: ['video_play_actions', 'video_15_sec_watched_actions', 'video_thruplay_watched_actions'],
  },

  // ========== MIXED CHART PRESETS ==========
  {
    id: 'mixed_volume_performance',
    name: 'Volume + Performance',
    description: 'Impressions (bars) and CTR (line)',
    chartType: 'mixed',
    metrics: ['impressions', 'ctr'],
  },
  {
    id: 'mixed_spend_roi',
    name: 'Spend + ROI',
    description: 'Budget (bars) and ROAS (line)',
    chartType: 'mixed',
    metrics: ['spend', 'roas'],
  },
  {
    id: 'mixed_traffic_efficiency',
    name: 'Traffic + Efficiency',
    description: 'Clicks (bars) and CPC (line)',
    chartType: 'mixed',
    metrics: ['clicks', 'cpc'],
  },
  {
    id: 'mixed_conversions_cost',
    name: 'Conversions + Cost',
    description: 'Conversions (bars) and cost per conversion (line)',
    chartType: 'mixed',
    metrics: ['conversions', 'cost_per_conversion'],
  },
  {
    id: 'mixed_revenue_roas',
    name: 'Revenue + ROAS',
    description: 'Revenue (bars) and return on ad spend (line)',
    chartType: 'mixed',
    metrics: ['revenue', 'purchase_roas'],
  },

  // ========== SCATTER CHART PRESETS ==========
  {
    id: 'scatter_cost_vs_results',
    name: 'Cost vs Results',
    description: 'Correlation of spend and conversions',
    chartType: 'scatter',
    metrics: ['spend', 'conversions'],
  },
  {
    id: 'scatter_efficiency_analysis',
    name: 'Efficiency Analysis',
    description: 'CPC and CTR relationship',
    chartType: 'scatter',
    metrics: ['cpc', 'ctr'],
  },
  {
    id: 'scatter_volume_quality',
    name: 'Volume vs Quality',
    description: 'Clicks and conversion rate',
    chartType: 'scatter',
    metrics: ['clicks', 'conversion_rate'],
  },
  {
    id: 'scatter_reach_engagement',
    name: 'Reach vs Engagement',
    description: 'Reach and frequency relationship',
    chartType: 'scatter',
    metrics: ['reach', 'frequency'],
  },
  {
    id: 'scatter_impressions_ctr',
    name: 'Impressions vs CTR',
    description: 'Impressions and clickability relationship',
    chartType: 'scatter',
    metrics: ['impressions', 'ctr'],
  },

  // ========== RADAR CHART PRESETS ==========
  {
    id: 'radar_performance_overview',
    name: 'Overall Performance',
    description: 'Multidimensional metrics analysis',
    chartType: 'radar',
    metrics: ['ctr', 'conversion_rate', 'roas', 'frequency'],
  },
  {
    id: 'radar_cost_efficiency_mix',
    name: 'Cost Efficiency',
    description: 'Comparison of cost metrics',
    chartType: 'radar',
    metrics: ['cpc', 'cpm', 'cost_per_conversion'],
  },
  {
    id: 'radar_full_metrics_view',
    name: 'Full Metrics Overview',
    description: 'All key metrics',
    chartType: 'radar',
    metrics: ['ctr', 'cpc', 'roas', 'conversion_rate', 'frequency'],
  },
  {
    id: 'radar_quality_metrics',
    name: 'Quality Metrics',
    description: 'Ad rankings',
    chartType: 'radar',
    metrics: ['quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking'],
  },
  {
    id: 'radar_unique_metrics',
    name: 'Unique Metrics',
    description: 'Unique actions CTR',
    chartType: 'radar',
    metrics: ['unique_ctr', 'unique_inline_link_click_ctr', 'unique_outbound_clicks_ctr'],
  },
];

// Helper function to get presets by chart type
export function getPresetsByChartType(chartType: ChartType): MetricPreset[] {
  return METRIC_PRESETS.filter(preset => preset.chartType === chartType);
}

// Helper function to get preset by ID
export function getPresetById(id: string): MetricPreset | undefined {
  return METRIC_PRESETS.find(preset => preset.id === id);
}
