/**
 * Общие константы для fb-front
 * Централизованное хранение для избежания дублирования
 */

// Поля которые пропускаем при нормализации insights
// Используется в: AnalyticsPage.tsx, useReportCache.ts
export const METRIC_SKIP_FIELDS = new Set([
  'date_start',
  'date_stop',
  'date_preset',
  'account_id',
  'account_name',
  'account_currency',
  'account_timezone',
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'creative_id',
  'creative_name',
  'level',
  'objective',
  'objective_name',
  'updated_time',
  'configured_status',
  'effective_status',
]);

// Статусы Facebook объектов (для нормализации)
export const STATUS_MAP: Record<string, string> = {
  'ACTIVE': 'Active',
  'PAUSED': 'Paused',
  'PENDING_REVIEW': 'Pending Review',
  'DISAPPROVED': 'Disapproved',
  'ARCHIVED': 'Archived',
  'COMPLETED': 'Completed',
  'DELETED': 'Deleted',
  'IN_PROCESS': 'In Process',
  'WITH_ISSUES': 'With Issues',
  'CAMPAIGN_PAUSED': 'Campaign Paused',
  'ADSET_PAUSED': 'Adset Paused',
  'PENDING_BILLING_INFO': 'Pending Billing',
  'PREAPPROVED': 'Preapproved',
};
