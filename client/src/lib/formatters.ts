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
