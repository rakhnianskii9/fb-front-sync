import { sanitizeMetricValue } from "@/lib/metricSanitizer";
import { STATUS_MAP } from "@/lib/constants";

/**
 * Нормализует статус Facebook объекта в читаемый формат
 * Используется в: AnalyticsPage.tsx, useReportCache.ts
 */
export function normalizeStatus(status: string | undefined | null): string {
  if (!status) return 'Unknown';
  const upperStatus = status.toUpperCase();
  return STATUS_MAP[upperStatus] || status;
}

/**
 * Проверяет, является ли статус активным (case-insensitive)
 */
export function isActiveStatus(status: string): boolean {
  return status.toLowerCase() === 'active';
}

// Маппинг кодов валют на символы
const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
  RUB: '₽',
  UAH: '₴',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  INR: '₹',
  BRL: 'R$',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  TRY: '₺',
  MXN: '$',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  ZAR: 'R',
  THB: '฿',
  PHP: '₱',
  MYR: 'RM',
  IDR: 'Rp',
  VND: '₫',
  AED: 'د.إ',
  SAR: '﷼',
  EGP: 'E£',
  NGN: '₦',
  KES: 'KSh',
  COP: '$',
  ARS: '$',
  CLP: '$',
  PEN: 'S/',
};

// Получить символ валюты по коду
export function getCurrencySymbol(currencyCode: string | null | undefined): string {
  if (!currencyCode) return '$';
  return currencySymbols[currencyCode.toUpperCase()] || currencyCode;
}

export function formatMetricValue(value: number, metricId: string, currencyCode?: string | null): string {
  const numericValue = sanitizeMetricValue(value);
  const currencySymbol = getCurrencySymbol(currencyCode);

  // Format currency
  if (metricId.includes('spend') || metricId.includes('cost') || metricId.includes('cpc') || metricId.includes('cpm')) {
    return `${currencySymbol}${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Format percentages (CTR, etc)
  if (metricId.includes('ctr') || metricId.includes('rate')) {
    return `${numericValue.toFixed(2)}%`;
  }
  
  // Format frequency
  if (metricId === 'frequency') {
    return numericValue.toFixed(2);
  }
  
  // Format regular numbers
  return numericValue.toLocaleString('en-US');
}

// ============================================
// Простые функции для виджетов (без metricId)
// ============================================

/**
 * Форматирует число с разделителями тысяч
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Форматирует валюту с символом
 * @example formatCurrency(1234.5, 'USD') → "$1,234.50"
 */
export function formatCurrency(value: number, currencyCode?: string | null): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Форматирует процент
 * @example formatPercent(12.345) → "12.35%"
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Компактное форматирование больших чисел
 * @example formatCompact(1234567) → "1.2M"
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}
