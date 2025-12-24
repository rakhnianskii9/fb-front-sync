/**
 * useWidgetCache — хук кэширования данных для отдельного виджета
 * 
 * Вариант Б: Каждый виджет имеет свой независимый кэш
 * 
 * Архитектура:
 * - Использует React Query для автоматической дедупликации запросов
 * - Одинаковые запросы от разных виджетов НЕ дублируются
 * - Каждый виджет имеет свою signature для кэширования
 * - Поддержка staleTime для предотвращения лишних перезагрузок
 * 
 * Преимущества:
 * - Виджеты независимы друг от друга
 * - Ошибка в одном виджете не влияет на другие
 * - Можно обновлять виджеты по отдельности
 * - Автоматический refetch при изменении параметров
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import fbAdsApi from '@/api/fbAds';
import { isSummableMetric, isDerivedMetric, calculateDerivedMetric, getMetricDependencies } from '@/lib/metricFormulas';
import { sanitizeMetricValue } from '@/lib/metricSanitizer';
import { METRIC_SKIP_FIELDS } from '@/lib/constants';
import { normalizeStatus } from '@/lib/formatters';
import logger from '@/lib/logger';

// ========== ТИПЫ ==========

export type WidgetEntityType = 'campaign' | 'adset' | 'ad' | 'creative';
export type WidgetType = 
  | 'chart-line'        // Линейный график
  | 'chart-bar'         // Столбчатый график
  | 'chart-pie'         // Круговая диаграмма
  | 'metric-card'       // Карточка с одной метрикой
  | 'metric-cards'      // Группа карточек метрик
  | 'table'             // Таблица с данными
  | 'romi-creative'     // ROMI by Creative (специальный виджет)
  | 'funnel'            // Воронка конверсий
  | 'heatmap'           // Тепловая карта
  // Новые типы для workspaces
  | 'attribution-paths' // Treemap/Tree виджет путей атрибуции
  | 'comparison'        // Compare bar chart
  | 'scatter'           // Scatter/Bubble chart
  | 'histogram'         // Distribution histogram
  | 'pie'               // Pie/Donut chart
  | string;             // Расширяемость для кастомных типов

// Данные для виджета (нормализованный формат)
export interface WidgetMetricsData {
  // Агрегированные метрики (для карточек)
  totals: Record<string, number>;
  
  // Метрики по датам (для графиков)
  byDate: Record<string, Record<string, number>>;
  // date → metricKey → value
  
  // Метрики по сущностям (для таблиц)
  byEntity: Record<string, {
    id: string;
    name: string;
    status: string;
    thumbnail?: string;
    metrics: Record<string, number>;
    // Иерархия
    account?: string;
    accountName?: string;
    campaign?: string;
    campaignName?: string;
    adset?: string;
    adsetName?: string;
    ad?: string;
    adName?: string;
  }>;
  
  // Альтернативные форматы для разных виджетов
  rows?: Array<Record<string, any>>;     // Для таблиц и bar charts
  paths?: Array<Record<string, any>>;    // Для attribution paths
  buckets?: Array<{ bucket: string; count: number; percent: number }>; // Для histogram
  segments?: Array<{ name: string; value: number; percent?: number }>; // Для pie/donut
  
  // Список доступных метрик
  availableMetrics: string[];
  
  // Мета-информация
  loadedAt: number;
  entityCount: number;
  dateCount: number;
}

// Тип запроса виджета (упрощённый alias)
export type WidgetRequest = Omit<UseWidgetCacheParams, 'enabled' | 'staleTime' | 'refetchOnWindowFocus'>;

// Параметры виджета
export interface UseWidgetCacheParams {
  // Идентификация виджета
  widgetId: string;
  widgetType: WidgetType;
  
  // Какие данные нужны
  entityType: WidgetEntityType;
  metricIds: string[];           // Какие метрики загружать
  entityIds?: string[];          // Конкретные ID сущностей (опционально)
  
  // Фильтры
  filters?: {
    // UTM фильтры
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    
    // CRM фильтры
    pipelineId?: number;
    userId?: number;
    isWon?: boolean;
    includeCRM?: boolean;
    
    // FB фильтры
    status?: string[];
    
    // Расширенные фильтры для виджетов
    breakdown?: string;
    groupBy?: string;
    distribution?: string;
    entityIds?: string[];
    includeAttribution?: boolean;
    
    // Любые другие фильтры
    [key: string]: any;
  };
  
  // Общие параметры (из контекста)
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  attribution: string;
  accountIds: string[];
  
  // Опции
  enabled?: boolean;             // Включен ли виджет
  staleTime?: number;            // Время устаревания кэша (ms)
  refetchOnWindowFocus?: boolean;
}

export interface UseWidgetCacheResult {
  data: WidgetMetricsData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  refetch: () => void;
  invalidate: () => void;
}

// ========== УТИЛИТЫ ==========

/**
 * Нормализует insight в плоский набор числовых метрик
 */
const normalizeInsightMetrics = (insight: Record<string, any>): Record<string, number> => {
  const metrics: Record<string, number> = {};

  Object.entries(insight).forEach(([key, value]) => {
    if (METRIC_SKIP_FIELDS.has(key)) return;
    if (typeof value === 'object' && value !== null) return;

    const numericValue = sanitizeMetricValue(value);
    if (numericValue !== 0) {
      metrics[key] = numericValue;
    } else if (value === 0 || value === '0') {
      metrics[key] = 0;
    }
  });

  return metrics;
};

/**
 * Генерирует уникальный ключ запроса для React Query
 */
function generateQueryKey(params: UseWidgetCacheParams): (string | object)[] {
  return [
    'widget-cache',
    params.widgetId,
    params.widgetType,
    params.entityType,
    params.reportId || 'no-report',
    params.dateFrom,
    params.dateTo,
    params.attribution,
    params.accountIds.slice().sort().join(','),
    params.metricIds.slice().sort().join(','),
    params.entityIds?.slice().sort().join(',') || 'all',
    JSON.stringify(params.filters || {}),
  ];
}

/**
 * Агрегирует метрики с учётом derived metrics
 */
function aggregateMetrics(
  itemsMetrics: Record<string, number>[],
  requestedMetricIds: string[]
): Record<string, number> {
  if (itemsMetrics.length === 0) return {};

  // Собираем все нужные base метрики
  const allNeededMetrics = new Set<string>();
  requestedMetricIds.forEach(metricId => {
    if (isDerivedMetric(metricId)) {
      getMetricDependencies(metricId).forEach(dep => allNeededMetrics.add(dep));
    } else {
      allNeededMetrics.add(metricId);
    }
  });

  // Суммируем base метрики
  const baseMetrics: Record<string, number> = {};
  allNeededMetrics.forEach(metricId => {
    baseMetrics[metricId] = 0;
  });

  itemsMetrics.forEach(metrics => {
    allNeededMetrics.forEach(metricId => {
      if (isSummableMetric(metricId) && metrics[metricId] !== undefined) {
        baseMetrics[metricId] = (baseMetrics[metricId] || 0) + metrics[metricId];
      }
    });
  });

  // Вычисляем derived метрики
  const result: Record<string, number> = {};
  requestedMetricIds.forEach(metricId => {
    if (isDerivedMetric(metricId)) {
      const calculated = calculateDerivedMetric(metricId, baseMetrics);
      result[metricId] = calculated !== null ? calculated : 0;
    } else {
      result[metricId] = baseMetrics[metricId] || 0;
    }
  });

  return result;
}

// ========== FETCH ФУНКЦИЯ ==========

/**
 * Загружает данные для виджета
 */
async function fetchWidgetData(params: UseWidgetCacheParams): Promise<WidgetMetricsData> {
  const {
    workspaceId,
    entityType,
    metricIds,
    entityIds,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
    filters,
  } = params;

  if (!workspaceId || accountIds.length === 0) {
    return {
      totals: {},
      byDate: {},
      byEntity: {},
      availableMetrics: [],
      loadedAt: Date.now(),
      entityCount: 0,
      dateCount: 0,
    };
  }

  // Определяем level для API
  let level: 'campaign' | 'adset' | 'ad' = 'campaign';
  if (entityType === 'adset') level = 'adset';
  if (entityType === 'ad' || entityType === 'creative') level = 'ad';

  const byDate: Record<string, Record<string, number>> = {};
  const byEntity: WidgetMetricsData['byEntity'] = {};
  const allMetricKeys = new Set<string>();

  // Для creatives: маппинг ad_id → creative_id
  const adToCreativeMap: Record<string, string> = {};
  const creativeToAdMap: Record<string, string> = {};

  // Загружаем данные параллельно по аккаунтам
  await Promise.all(accountIds.map(async (accountId) => {
    try {
      // Загружаем ads для маппинга creatives
      if (entityType === 'creative') {
        const ads = await fbAdsApi.marketing.getAds(workspaceId, { adAccountIds: [accountId] });
        if (Array.isArray(ads)) {
          ads.forEach((a: any) => {
            const adId = a.adId || a.id;
            const creativeId = a.creativeId;
            if (adId && creativeId) {
              adToCreativeMap[adId] = creativeId;
              creativeToAdMap[creativeId] = adId;
            }
          });
        }
      }

      // Загружаем insights
      const insightsResponse = await fbAdsApi.marketing.getInsights({
        workspaceId,
        adAccountId: accountId,
        objectType: 'account',
        objectIds: [accountId],
        level: level as any,
        dateFrom,
        dateTo,
        attributionSetting: attribution,
      });

      if (insightsResponse.success && insightsResponse.insights) {
        insightsResponse.insights.forEach((insight: any) => {
          const date = (() => {
            try {
              return format(parseISO(insight.date_start), 'dd.MM.yyyy');
            } catch {
              return insight.date_start;
            }
          })();

          let itemId: string;
          if (entityType === 'creative') {
            const adId = insight.ad_id || insight.object_id;
            const creativeId = adToCreativeMap[adId];
            if (!creativeId) return;
            itemId = creativeId;
          } else {
            itemId = insight[`${level}_id`] || insight.object_id;
          }
          if (!itemId) return;

          // Фильтрация по entityIds если указаны
          if (entityIds && entityIds.length > 0 && !entityIds.includes(itemId)) {
            return;
          }

          const metrics = normalizeInsightMetrics(insight);
          Object.keys(metrics).forEach(key => allMetricKeys.add(key));

          // Агрегация по датам
          if (!byDate[date]) byDate[date] = {};
          Object.entries(metrics).forEach(([key, value]) => {
            if (isSummableMetric(key)) {
              byDate[date][key] = (byDate[date][key] || 0) + value;
            } else {
              byDate[date][key] = value;
            }
          });

          // Агрегация по сущностям
          if (!byEntity[itemId]) {
            byEntity[itemId] = {
              id: itemId,
              name: itemId,
              status: 'Unknown',
              metrics: {},
            };
          }
          Object.entries(metrics).forEach(([key, value]) => {
            if (isSummableMetric(key)) {
              byEntity[itemId].metrics[key] = (byEntity[itemId].metrics[key] || 0) + value;
            } else {
              byEntity[itemId].metrics[key] = value;
            }
          });
        });
      }

      // Загружаем metadata для сущностей
      if (entityType === 'campaign') {
        const campaigns = await fbAdsApi.marketing.getCampaigns(workspaceId, { adAccountIds: [accountId] });
        if (Array.isArray(campaigns)) {
          campaigns.forEach((c: any) => {
            const fbId = c.campaignId || c.id;
            if (byEntity[fbId]) {
              byEntity[fbId].name = c.name || fbId;
              byEntity[fbId].status = normalizeStatus(c.status || c.effectiveStatus);
              byEntity[fbId].account = accountId;
              byEntity[fbId].campaign = fbId;
              byEntity[fbId].campaignName = c.name;
            }
          });
        }
      } else if (entityType === 'adset') {
        const adsets = await fbAdsApi.marketing.getAdSets(workspaceId, { adAccountIds: [accountId] });
        if (Array.isArray(adsets)) {
          adsets.forEach((a: any) => {
            const fbId = a.adsetId || a.id;
            if (byEntity[fbId]) {
              byEntity[fbId].name = a.name || fbId;
              byEntity[fbId].status = normalizeStatus(a.status || a.effectiveStatus);
              byEntity[fbId].account = accountId;
              byEntity[fbId].campaign = a.campaignId;
              byEntity[fbId].adset = fbId;
              byEntity[fbId].adsetName = a.name;
            }
          });
        }
      } else if (entityType === 'ad') {
        const ads = await fbAdsApi.marketing.getAds(workspaceId, { adAccountIds: [accountId] });
        if (Array.isArray(ads)) {
          ads.forEach((a: any) => {
            const fbId = a.adId || a.id;
            if (byEntity[fbId]) {
              byEntity[fbId].name = a.name || fbId;
              byEntity[fbId].status = normalizeStatus(a.status || a.effectiveStatus);
              byEntity[fbId].account = accountId;
              byEntity[fbId].campaign = a.campaignId;
              byEntity[fbId].adset = a.adsetId;
              byEntity[fbId].ad = fbId;
              byEntity[fbId].adName = a.name;
            }
          });
        }
      } else if (entityType === 'creative') {
        const creatives = await fbAdsApi.marketing.getCreatives(workspaceId, { adAccountId: accountId });
        if (Array.isArray(creatives)) {
          creatives.forEach((c: any) => {
            const fbId = c.creativeId || c.id;
            if (byEntity[fbId]) {
              byEntity[fbId].name = c.name || c.title || fbId;
              byEntity[fbId].status = 'Active';
              byEntity[fbId].thumbnail = c.thumbnailUrl || c.imageUrl;
              byEntity[fbId].account = accountId;
            }
          });
        }
      }

    } catch (err) {
      logger.error(`[useWidgetCache] Error loading ${entityType} data for ${accountId}`, err);
    }
  }));

  // Вычисляем totals
  const allItemMetrics = Object.values(byEntity).map(e => e.metrics);
  const totals = aggregateMetrics(allItemMetrics, metricIds);

  return {
    totals,
    byDate,
    byEntity,
    availableMetrics: Array.from(allMetricKeys),
    loadedAt: Date.now(),
    entityCount: Object.keys(byEntity).length,
    dateCount: Object.keys(byDate).length,
  };
}

// ========== ХУКИ ==========

// Опции для хука (отдельно от запроса)
export interface UseWidgetCacheOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

/**
 * Основной хук кэширования для виджета
 * @param request - параметры запроса данных
 * @param options - опции кэширования
 */
export function useWidgetCache(
  request: WidgetRequest,
  options: UseWidgetCacheOptions = {}
): UseWidgetCacheResult {
  const params: UseWidgetCacheParams = { ...request, ...options };
  const queryClient = useQueryClient();
  
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 минут по умолчанию
    refetchOnWindowFocus = false,
    workspaceId,
    reportId,
    accountIds,
  } = params;

  // Генерируем query key
  const queryKey = useMemo(() => generateQueryKey(params), [
    params.widgetId,
    params.widgetType,
    params.entityType,
    params.reportId,
    params.dateFrom,
    params.dateTo,
    params.attribution,
    params.accountIds.join(','),
    params.metricIds.join(','),
    params.entityIds?.join(','),
    JSON.stringify(params.filters),
  ]);

  // Определяем можно ли выполнить запрос
  const canFetch = Boolean(
    enabled &&
    workspaceId &&
    reportId &&
    accountIds.length > 0 &&
    params.metricIds.length > 0
  );

  // React Query запрос
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchWidgetData(params),
    enabled: canFetch,
    staleTime,
    refetchOnWindowFocus,
    retry: 2,
    retryDelay: 1000,
  });

  // Инвалидация кэша виджета
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    data: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    isFetching,
    refetch: () => { refetch(); },
    invalidate,
  };
}

/**
 * Хук для инвалидации всех виджетов отчёта
 */
export function useInvalidateAllWidgets(reportId: string | undefined) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (!reportId) return;
    
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && 
               key[0] === 'widget-cache' && 
               key[4] === reportId;
      },
    });
  }, [queryClient, reportId]);
}

/**
 * Хук для prefetch данных виджета
 */
export function usePrefetchWidget() {
  const queryClient = useQueryClient();

  return useCallback((params: UseWidgetCacheParams) => {
    const queryKey = generateQueryKey(params);
    
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchWidgetData(params),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
}

export default useWidgetCache;
