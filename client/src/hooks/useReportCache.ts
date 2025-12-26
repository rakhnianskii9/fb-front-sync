/**
 * useReportCache — хук кэширования данных всех табов текущего отчёта
 * 
 * Архитектура:
 * - Загружает все 4 таба параллельно при открытии отчёта
 * - Кэширует данные в useState (не в localStorage — слишком большой объём)
 * - Prefetch Period B через requestIdleCallback после основной загрузки
 * - Инвалидация при смене signature (period/attribution/report/selections)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { format, parse, parseISO } from 'date-fns';
import fbAdsApi from '@/api/fbAds';
import { isSummableMetric } from '@/lib/metricFormulas';
import { sanitizeMetricValue } from '@/lib/metricSanitizer';
import { METRIC_SKIP_FIELDS } from '@/lib/constants';
import { normalizeStatus } from '@/lib/formatters';
import logger from '@/lib/logger';

// DEBUG флаг — включить детальное логирование метрик
const DEBUG_METRICS = true;
let debugLoggedOnce = false;

// Функция нормализует insight в плоский набор числовых метрик
// Бэкенд уже разворачивает все массивы Facebook — здесь просто берём числа
const normalizeInsightMetrics = (insight: Record<string, any>): Record<string, number> => {
  const metrics: Record<string, number> = {};
  const skippedObjects: string[] = [];
  const skippedArrays: string[] = [];

  Object.entries(insight).forEach(([key, value]) => {
    if (METRIC_SKIP_FIELDS.has(key)) {
      return;
    }

    // Пропускаем объекты и массивы — бэкенд уже развернул их
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        skippedArrays.push(key);
      } else {
        skippedObjects.push(key);
      }
      return;
    }

    const numericValue = sanitizeMetricValue(value);
    if (numericValue !== 0) {
      metrics[key] = numericValue;
    } else if (value === 0 || value === '0') {
      metrics[key] = 0;
    }
  });

  // 🔍 DEBUG: Логируем что получили (только первый раз)
  if (DEBUG_METRICS && !debugLoggedOnce) {
    debugLoggedOnce = true;
    
    const allExtractedKeys = Object.keys(metrics);
    const actionsKeys = allExtractedKeys.filter(k => k.startsWith('actions_'));
    const resultsKeys = allExtractedKeys.filter(k => k.startsWith('results_'));
    const costPerKeys = allExtractedKeys.filter(k => k.startsWith('cost_per_'));
    
    logger.warn(`[normalizeInsightMetrics] 🔍 EXTRACTED METRICS:`, {
      totalExtracted: allExtractedKeys.length,
      skippedArrays: skippedArrays.length > 0 ? skippedArrays : 'none',
      skippedObjects: skippedObjects.length > 0 ? skippedObjects : 'none',
      actionsKeys: actionsKeys.length > 0 ? actionsKeys : 'none',
      resultsKeys: resultsKeys.length > 0 ? resultsKeys : 'none',
      costPerActionKeys: costPerKeys.filter(k => k.includes('action')),
      allKeysSample: allExtractedKeys.slice(0, 30),
    });
  }

  return metrics;
};

// Типы для кэша
export type TabType = 'campaigns' | 'adsets' | 'ads' | 'creatives';
export type MetricsData = Record<string, Record<string, Record<string, number>>>;
// date → itemId → metricKey → value

export type ItemMetadata = Record<string, { 
  name: string; 
  subtitle?: string; 
  status: string; 
  thumbnail?: string;
}>;

export type HierarchyData = Record<string, { 
  account?: string; 
  accountName?: string;
  campaign?: string; 
  campaignName?: string;
  adset?: string; 
  adsetName?: string;
  ad?: string;
  adName?: string;
}>;

// Предвычисленный item для таблицы
export interface CachedTableItem {
  id: string;
  key: string;
  name: string;
  subtitle: string;
  status: string;
  thumbnail: string;
  metrics: Record<string, number>;
}

// Предвычисленная строка таблицы
export interface CachedTableRow {
  id: string;
  date: string;
  items: CachedTableItem[];
}

export interface TabData {
  metricsData: MetricsData;
  itemsMetadata: ItemMetadata;
  hierarchyData: HierarchyData;
  availableMetricKeys: string[];
  // Предвычисленные строки таблицы — мгновенный доступ при переключении табов
  tableRows: CachedTableRow[];
  loadedAt: number;
}

export interface CacheSignature {
  reportId: string;
  /** Load dates (full dataRange) - signature only tracks these, not display dates */
  loadDateFrom: string;
  loadDateTo: string;
  attribution: string;
  accountIds: string[];
  selectionsByTab: Record<TabType, string[]>;
}

export interface ReportCache {
  tabs: {
    campaigns: TabData | null;
    adsets: TabData | null;
    ads: TabData | null;
    creatives: TabData | null;
  };
  periodB: {
    campaigns: TabData | null;
    adsets: TabData | null;
    ads: TabData | null;
    creatives: TabData | null;
  } | null;
  signature: CacheSignature | null;
  periodBSignature: { dateFrom: string; dateTo: string } | null;
}

interface UseReportCacheParams {
  workspaceId: string | undefined;
  reportId: string | undefined;
  /** Full data range start date (from report.dataRange or fallback) - used for loading */
  loadDateFrom: string;
  /** Full data range end date (from report.dataRange or fallback) - used for loading */
  loadDateTo: string;
  /** Display date range start - used for filtering (user's selected period) */
  displayDateFrom: string;
  /** Display date range end - used for filtering */
  displayDateTo: string;
  periodBFrom?: string;
  periodBTo?: string;
  compareEnabled: boolean;
  attribution: string;
  accountIds: string[];
  selectionsByTab: Record<TabType, string[]>;
  /** Маппинг accountId → accountName для отображения имён аккаунтов */
  accountNameMap?: Record<string, string>;
}

interface UseReportCacheResult {
  cache: ReportCache;
  isLoading: boolean;
  isLoadingPeriodB: boolean;
  loadingTabs: Set<TabType>;
  getTabData: (tab: TabType, usePeriodB?: boolean) => TabData | null;
  refreshCache: () => void;
  error: string | null;
}

// Генерация signature для сравнения (использует loadDate, не display)
function createSignature(params: UseReportCacheParams): CacheSignature {
  return {
    reportId: params.reportId || '',
    loadDateFrom: params.loadDateFrom,
    loadDateTo: params.loadDateTo,
    attribution: params.attribution,
    accountIds: [...params.accountIds].sort(),
    selectionsByTab: {
      campaigns: [...(params.selectionsByTab.campaigns || [])].sort(),
      adsets: [...(params.selectionsByTab.adsets || [])].sort(),
      ads: [...(params.selectionsByTab.ads || [])].sort(),
      creatives: [...(params.selectionsByTab.creatives || [])].sort(),
    },
  };
}

function signaturesEqual(a: CacheSignature | null, b: CacheSignature | null): boolean {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useReportCache(params: UseReportCacheParams): UseReportCacheResult {
  const {
    workspaceId,
    reportId,
    loadDateFrom,
    loadDateTo,
    displayDateFrom,
    displayDateTo,
    periodBFrom,
    periodBTo,
    compareEnabled,
    attribution,
    accountIds,
    selectionsByTab,
    accountNameMap = {},
  } = params;

  // Состояние кэша
  const [cache, setCache] = useState<ReportCache>({
    tabs: { campaigns: null, adsets: null, ads: null, creatives: null },
    periodB: null,
    signature: null,
    periodBSignature: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPeriodB, setIsLoadingPeriodB] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState<Set<TabType>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Ref для отмены запросов
  const abortControllerRef = useRef<AbortController | null>(null);
  const periodBAbortRef = useRef<AbortController | null>(null);

  // Multi-cache for instant attribution switching (keyed by full signature, including attribution)
  const multiCacheRef = useRef<Map<string, ReportCache>>(new Map());
  const signatureKey = (s: CacheSignature): string => JSON.stringify(s);
  
  // Импорт useRef для retry логики (перенесён выше)

  // Стабильные ключи для deps (избегаем JSON.stringify)
  const accountIdsKey = accountIds.slice().sort().join('|');
  const selectionsKey = [
    (selectionsByTab.campaigns || []).slice().sort().join(','),
    (selectionsByTab.adsets || []).slice().sort().join(','),
    (selectionsByTab.ads || []).slice().sort().join(','),
    (selectionsByTab.creatives || []).slice().sort().join(','),
  ].join('||');

  // Текущая signature — использует LOAD даты (не display)
  // Изменение display дат НЕ инвалидирует кэш
  const currentSignature = useMemo((): CacheSignature => ({
    reportId: reportId || '',
    loadDateFrom,
    loadDateTo,
    attribution,
    accountIds: accountIds.slice().sort(),
    selectionsByTab: {
      campaigns: (selectionsByTab.campaigns || []).slice().sort(),
      adsets: (selectionsByTab.adsets || []).slice().sort(),
      ads: (selectionsByTab.ads || []).slice().sort(),
      creatives: (selectionsByTab.creatives || []).slice().sort(),
    },
  }), [
    reportId, loadDateFrom, loadDateTo, attribution,
    accountIdsKey,
    selectionsKey,
  ]);

  /**
   * Загрузка данных для одного таба
   */
  const loadTabData = useCallback(async (
    tab: TabType,
    loadDateFrom: string,
    loadDateTo: string,
    loadAttribution: string,
  ): Promise<TabData | null> => {
    if (!workspaceId || accountIds.length === 0) {
      return null;
    }

    const selections = selectionsByTab[tab] || [];
    if (selections.length === 0) {
      return {
        metricsData: {},
        itemsMetadata: {},
        hierarchyData: {},
        availableMetricKeys: [],
        tableRows: [],
        loadedAt: Date.now(),
      };
    }

    const newMetricsData: MetricsData = {};
    const newItemsMetadata: ItemMetadata = {};
    const newHierarchyData: HierarchyData = {};

    // Определяем level для API
    let level: 'campaign' | 'adset' | 'ad' = 'campaign';
    if (tab === 'adsets') level = 'adset';
    if (tab === 'ads' || tab === 'creatives') level = 'ad';

    // Загружаем данные параллельно по аккаунтам
    await Promise.all(accountIds.map(async (accountId) => {
      try {
        // Загрузка insights
        const insightsResponse = await fbAdsApi.marketing.getInsights({
          workspaceId,
          adAccountId: accountId,
          objectType: 'account',
          objectIds: [accountId],
          level: level as any,
          dateFrom: loadDateFrom,
          dateTo: loadDateTo,
          attributionSetting: loadAttribution,
        });

        // Для creatives: маппинг ad_id → creative_id
        const adToCreativeMap: Record<string, string> = {};
        if (tab === 'creatives') {
          try {
            const ads = await fbAdsApi.marketing.getAds(workspaceId, { adAccountIds: [accountId] });
            if (Array.isArray(ads)) {
              ads.forEach((a: any) => {
                const adId = a.adId || a.id;
                const creativeId = a.creativeId;
                if (adId && creativeId) {
                  adToCreativeMap[adId] = creativeId;
                }
              });
            }
          } catch (err) {
            logger.error(`[useReportCache] Error building ad→creative map for ${accountId}`, err);
          }
        }

        // Обработка insights
        if (insightsResponse.success && insightsResponse.insights) {
          // 🔍 DEBUG: Логируем первый insight полностью для анализа структуры
          if (insightsResponse.insights.length > 0) {
            const sampleInsight = insightsResponse.insights[0];
            const allKeys = Object.keys(sampleInsight);
            const objectKeys = allKeys.filter(k => typeof sampleInsight[k] === 'object' && sampleInsight[k] !== null);
            const arrayKeys = allKeys.filter(k => Array.isArray(sampleInsight[k]));
            const numericKeys = allKeys.filter(k => typeof sampleInsight[k] === 'number' || !isNaN(parseFloat(sampleInsight[k])));
            
            logger.warn(`[useReportCache] 🔍 API RESPONSE STRUCTURE for ${tab}:`, {
              totalKeys: allKeys.length,
              objectKeys: objectKeys.length > 0 ? objectKeys : 'none',
              arrayKeys: arrayKeys.length > 0 ? arrayKeys : 'none',
              numericKeysCount: numericKeys.length,
              sampleNumericKeys: numericKeys.slice(0, 20),
              // Если есть массивы — показать их структуру
              ...(arrayKeys.length > 0 && {
                arrayStructures: arrayKeys.reduce((acc, key) => {
                  const arr = sampleInsight[key];
                  acc[key] = {
                    length: arr.length,
                    sample: arr[0] ? JSON.stringify(arr[0]).slice(0, 200) : 'empty'
                  };
                  return acc;
                }, {} as Record<string, any>)
              }),
              // Полный insight для детального анализа (первые 2000 символов)
              fullInsightSample: JSON.stringify(sampleInsight).slice(0, 2000)
            });
          }
          
          // 🔍 DEBUG: Счётчики для отслеживания пропущенных insights
          let processedCount = 0;
          let skippedNoItemId = 0;
          
          insightsResponse.insights.forEach((insight: any) => {
            const date = (() => {
              try {
                return format(parseISO(insight.date_start), 'dd.MM.yyyy');
              } catch {
                return insight.date_start;
              }
            })();

            let itemId: string;
            if (tab === 'creatives') {
              const adId = insight.ad_id || insight.object_id;
              const creativeId = adToCreativeMap[adId];
              if (!creativeId) return;
              itemId = creativeId;
            } else {
              // Используем object_id как fallback если нет ${level}_id
              // Бэкенд возвращает object_id который содержит реальный ID объекта
              itemId = insight[`${level}_id`] || insight.object_id;
            }
            if (!itemId) {
              skippedNoItemId++;
              // DEBUG: Логируем первый пропущенный insight
              if (skippedNoItemId === 1) {
                logger.warn(`[useReportCache] ⚠️ SKIPPED insight (no ${level}_id):`, {
                  tab,
                  level,
                  lookingFor: `${level}_id`,
                  insightKeys: Object.keys(insight).filter(k => k.includes('_id')),
                  hasAccountId: !!insight.account_id,
                  hasCampaignId: !!insight.campaign_id,
                  hasAdsetId: !!insight.adset_id,
                  hasAdId: !!insight.ad_id,
                });
              }
              return;
            }
            
            processedCount++;
            if (!newMetricsData[date]) newMetricsData[date] = {};

            // Агрегация для creatives (несколько ads → один creative)
            if (tab === 'creatives' && newMetricsData[date][itemId]) {
              const existingMetrics = newMetricsData[date][itemId];
              const newMetrics = normalizeInsightMetrics(insight);
              Object.keys(newMetrics).forEach(key => {
                if (isSummableMetric(key)) {
                  existingMetrics[key] = (existingMetrics[key] || 0) + (newMetrics[key] || 0);
                } else {
                  existingMetrics[key] = newMetrics[key];
                }
              });
            } else {
              newMetricsData[date][itemId] = normalizeInsightMetrics(insight);
            }
          });
          
          // 🔍 DEBUG: Итоговая статистика обработки insights
          logger.warn(`[useReportCache] 📊 INSIGHTS PROCESSING STATS for ${tab}:`, {
            totalFromAPI: insightsResponse.insights?.length || 0,
            processed: processedCount,
            skippedNoItemId,
            level,
            lookingForField: `${level}_id`,
          });
        }

        // Загрузка metadata и hierarchy
        const campaignNameMap: Record<string, string> = {};
        const adsetNameMap: Record<string, string> = {};

        // Campaigns — всегда нужны для иерархии
        try {
          const campaigns = await fbAdsApi.marketing.getCampaigns(workspaceId, { adAccountIds: [accountId] });
          if (Array.isArray(campaigns)) {
            campaigns.forEach((c: any) => {
              const fbId = c.campaignId || c.id;
              campaignNameMap[fbId] = c.name || fbId;
              // Also map by internal id if different
              if (c.id && c.id !== fbId) {
                campaignNameMap[c.id] = c.name || fbId;
              }

              if (tab === 'campaigns') {
                newItemsMetadata[fbId] = {
                  name: c.name,
                  status: normalizeStatus(c.status || c.effectiveStatus),
                  subtitle: fbId,
                };
                newHierarchyData[fbId] = {
                  account: accountId,
                  accountName: accountNameMap[accountId] || accountId,
                  campaign: fbId,
                  campaignName: c.name || fbId,
                };
              }
            });
            
            logger.warn(`[useReportCache] 🗺️ Campaign name map for ${accountId}:`, {
              mapSize: Object.keys(campaignNameMap).length,
              sampleEntries: Object.entries(campaignNameMap).slice(0, 5),
            });
          }
        } catch (err) {
          logger.error(`[useReportCache] Error fetching campaigns for ${accountId}`, err);
        }

        // Adsets — для adsets, ads, creatives табов
        if (tab === 'adsets' || tab === 'ads' || tab === 'creatives') {
          try {
            const adsets = await fbAdsApi.marketing.getAdSets(workspaceId, { adAccountIds: [accountId] });
            if (Array.isArray(adsets)) {
              adsets.forEach((a: any) => {
                const fbId = a.adsetId || a.id;
                const campaignId = a.campaignId || a.campaign?.campaignId;
                adsetNameMap[fbId] = a.name || fbId;
                // Also map by internal id if different
                if (a.id && a.id !== fbId) {
                  adsetNameMap[a.id] = a.name || fbId;
                }

                if (tab === 'adsets') {
                  newItemsMetadata[fbId] = {
                    name: a.name,
                    status: normalizeStatus(a.status || a.effectiveStatus),
                    subtitle: fbId,
                  };
                  newHierarchyData[fbId] = {
                    account: accountId,
                    accountName: accountNameMap[accountId] || accountId,
                    campaign: campaignId,
                    campaignName: campaignNameMap[campaignId] || campaignId,
                    adset: fbId,
                    adsetName: a.name || fbId,
                  };
                }
              });
              
              logger.warn(`[useReportCache] 🗺️ Adset name map for ${accountId}:`, {
                mapSize: Object.keys(adsetNameMap).length,
                sampleEntries: Object.entries(adsetNameMap).slice(0, 5),
              });
            }
          } catch (err) {
            logger.error(`[useReportCache] Error fetching adsets for ${accountId}`, err);
          }
        }

        // Ads — для ads и creatives табов
        // Также строим маппинг creativeId → adId для связи креативов с иерархией
        const creativeToAdMap: Record<string, string> = {};
        if (tab === 'ads' || tab === 'creatives') {
          try {
            const ads = await fbAdsApi.marketing.getAds(workspaceId, { adAccountIds: [accountId] });
            if (Array.isArray(ads)) {
              let adsWithCreativeId = 0;
              let lookupMisses = 0;
              ads.forEach((a: any) => {
                const fbId = a.adId || a.id;
                const campaignId = a.campaignId || a.adset?.campaignId;
                const adsetId = a.adsetId || a.adset?.adsetId;
                const creativeId = a.creativeId;
                
                // Check if name lookup will work
                const campaignLookupSuccess = campaignNameMap[campaignId] && campaignNameMap[campaignId] !== campaignId;
                const adsetLookupSuccess = adsetNameMap[adsetId] && adsetNameMap[adsetId] !== adsetId;
                if (!campaignLookupSuccess || !adsetLookupSuccess) {
                  lookupMisses++;
                }
                
                // Строим обратный маппинг creativeId → adId для креативов
                if (creativeId && fbId) {
                  creativeToAdMap[creativeId] = fbId;
                  adsWithCreativeId++;
                }

                if (tab === 'ads') {
                  newItemsMetadata[fbId] = {
                    name: a.name,
                    status: normalizeStatus(a.status || a.effectiveStatus),
                    subtitle: fbId,
                  };
                }
                newHierarchyData[fbId] = {
                  account: accountId,
                  accountName: accountNameMap[accountId] || accountId,
                  campaign: campaignId,
                  campaignName: campaignNameMap[campaignId] || campaignId,
                  adset: adsetId,
                  adsetName: adsetNameMap[adsetId] || adsetId,
                  ad: fbId,
                  adName: a.name || fbId,
                };
              });
              
              // 🔍 DEBUG: Статистика маппинга и lookup качества
              logger.warn(`[useReportCache] 📊 ADS HIERARCHY for ${accountId} (${tab}):`, {
                totalAds: ads.length,
                lookupMisses,
                campaignMapKeys: Object.keys(campaignNameMap).slice(0, 3),
                adsetMapKeys: Object.keys(adsetNameMap).slice(0, 3),
                sampleAdCampaignIds: ads.slice(0, 3).map((a: any) => a.campaignId || a.adset?.campaignId),
              });
              
              // 🔍 DEBUG: Статистика маппинга creativeId → adId
              if (tab === 'creatives') {
                logger.warn(`[useReportCache] 🔗 CREATIVE MAPPING for ${accountId}:`, {
                  totalAds: ads.length,
                  adsWithCreativeId,
                  mappingSize: Object.keys(creativeToAdMap).length,
                  sampleMappings: Object.entries(creativeToAdMap).slice(0, 3),
                });
              }
            }
          } catch (err) {
            logger.error(`[useReportCache] Error fetching ads for ${accountId}`, err);
          }
        }

        // Creatives — только для creatives таба
        if (tab === 'creatives') {
          // Собираем map adId -> иерархия для связи с ads
          const adNameMap: Record<string, string> = {};
          const adHierarchyMap: Record<string, { campaign?: string; campaignName?: string; adset?: string; adsetName?: string; ad?: string; adName?: string }> = {};
          
          // Извлекаем иерархию из уже загруженных Ads
          Object.entries(newHierarchyData).forEach(([id, data]) => {
            if (data.ad) {
              adHierarchyMap[data.ad] = data;
              if (data.adName) {
                adNameMap[data.ad] = data.adName;
              }
            }
          });
          
          // creativeToAdMap уже построен выше при загрузке ads

          try {
            const creatives = await fbAdsApi.marketing.getCreatives(workspaceId, { adAccountId: accountId });
            if (Array.isArray(creatives)) {
              let creativesWithHierarchy = 0;
              let creativesWithoutHierarchy = 0;
              
              creatives.forEach((c: any) => {
                const fbId = c.creativeId || c.id;
                // Используем обратный маппинг: creativeId → adId
                const adId = c.adId || creativeToAdMap[fbId];
                
                newItemsMetadata[fbId] = {
                  name: c.name || c.title || fbId,
                  status: 'Active',
                  subtitle: fbId,
                  thumbnail: c.thumbnailUrl || c.imageUrl,
                };
                
                // Если креатив связан с Ad, берем его иерархию
                if (adId && adHierarchyMap[adId]) {
                  const parentHierarchy = adHierarchyMap[adId];
                  newHierarchyData[fbId] = {
                    account: accountId,
                    accountName: accountNameMap[accountId] || accountId,
                    campaign: parentHierarchy.campaign,
                    campaignName: parentHierarchy.campaignName,
                    adset: parentHierarchy.adset,
                    adsetName: parentHierarchy.adsetName,
                    ad: adId,
                    adName: parentHierarchy.adName || adNameMap[adId] || adId,
                  };
                  creativesWithHierarchy++;
                } else {
                  // Fallback: только account
                  newHierarchyData[fbId] = { 
                    account: accountId,
                    accountName: accountNameMap[accountId] || accountId,
                  };
                  creativesWithoutHierarchy++;
                }
              });
              
              // 🔍 DEBUG: Статистика иерархии креативов
              logger.warn(`[useReportCache] 📊 CREATIVE HIERARCHY STATS for ${accountId}:`, {
                totalCreatives: creatives.length,
                creativesWithHierarchy,
                creativesWithoutHierarchy,
                adHierarchyMapSize: Object.keys(adHierarchyMap).length,
                creativeToAdMapSize: Object.keys(creativeToAdMap).length,
              });
            }
          } catch (err) {
            logger.error(`[useReportCache] Error fetching creatives for ${accountId}`, err);
          }
        }

      } catch (err) {
        logger.error(`[useReportCache] Error loading ${tab} data for ${accountId}`, err);
      }
    }));

    // Извлекаем уникальные ключи метрик
    const uniqueMetricKeys = new Set<string>();
    Object.values(newMetricsData).forEach(dateData => {
      Object.values(dateData).forEach(itemData => {
        Object.keys(itemData).forEach(key => uniqueMetricKeys.add(key));
      });
    });

    // 🔍 DEBUG: Логируем финальный набор метрик для таба
    if (DEBUG_METRICS) {
      const allKeys = Array.from(uniqueMetricKeys);
      const actionsKeys = allKeys.filter(k => k.startsWith('actions_'));
      const resultsKeys = allKeys.filter(k => k.startsWith('results_'));
      const convKeys = allKeys.filter(k => k.includes('conversion'));
      
      logger.warn(`[useReportCache] 🔍 FINAL availableMetricKeys for ${tab}:`, {
        totalUnique: allKeys.length,
        actionsKeys: actionsKeys.length > 0 ? actionsKeys : 'NONE!',
        resultsKeys: resultsKeys.length > 0 ? resultsKeys : 'NONE!',
        conversionKeys: convKeys.length > 0 ? convKeys : 'NONE!',
        allKeysSample: allKeys.slice(0, 40),
      });
    }

    // Предвычисляем строки таблицы для мгновенного переключения табов
    const selectedIds = selections;
    
    // Helper: check if item has at least one non-zero metric value
    const hasNonZeroMetrics = (metrics: Record<string, number>): boolean => {
      return Object.values(metrics).some(v => typeof v === 'number' && v > 0);
    };
    
    // Генерируем ВСЕ даты периода (не только те что вернул API)
    const generateAllDates = (from: string, to: string): string[] => {
      const dates: string[] = [];
      const start = parseISO(from);
      const end = parseISO(to);
      let current = start;
      while (current <= end) {
        dates.push(format(current, 'dd.MM.yyyy'));
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      }
      return dates;
    };
    
    const allDates = generateAllDates(loadDateFrom, loadDateTo);
    
    const tableRows: CachedTableRow[] = allDates
      .sort((a, b) => {
        // Сортировка дат DD.MM.YYYY (от новых к старым)
        const [aD, aM, aY] = a.split('.').map(Number);
        const [bD, bM, bY] = b.split('.').map(Number);
        return new Date(bY, bM - 1, bD).getTime() - new Date(aY, aM - 1, aD).getTime();
      })
      .map(date => {
        const dateData = newMetricsData[date] || {};
        const items: CachedTableItem[] = selectedIds
          .filter(itemId => {
            const itemMetrics = dateData[itemId];
            // Filter: item must have data AND at least one non-zero metric
            return itemMetrics && hasNonZeroMetrics(itemMetrics);
          })
          .map(itemId => {
            const metadata = newItemsMetadata[itemId];
            return {
              id: itemId,
              key: `${date}-${itemId}`,
              name: metadata?.name || itemId,
              subtitle: metadata?.subtitle || '',
              status: metadata?.status || 'Unknown',
              thumbnail: metadata?.thumbnail || '',
              metrics: dateData[itemId] || {},
            };
          });
        return { id: date, date, items };
      });
    // НЕ фильтруем пустые строки — они будут показаны с "No items with impressions"

    return {
      metricsData: newMetricsData,
      itemsMetadata: newItemsMetadata,
      hierarchyData: newHierarchyData,
      availableMetricKeys: Array.from(uniqueMetricKeys),
      tableRows,
      loadedAt: Date.now(),
    };
  }, [workspaceId, accountIds, selectionsByTab, accountNameMap]);

  /**
   * Загрузка всех табов параллельно
   */
  const loadAllTabs = useCallback(async (signatureToSave: CacheSignature) => {
    if (!workspaceId || !reportId) return;

    // Отменяем предыдущие запросы
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setLoadingTabs(new Set(['campaigns', 'adsets', 'ads', 'creatives']));
    setError(null);

    try {
      const tabs: TabType[] = ['campaigns', 'adsets', 'ads', 'creatives'];
      
      // Загружаем все табы параллельно с LOAD датами (полный dataRange)
      const results = await Promise.all(
        tabs.map(tab => loadTabData(tab, loadDateFrom, loadDateTo, attribution))
      );

      const newTabs: ReportCache['tabs'] = {
        campaigns: results[0],
        adsets: results[1],
        ads: results[2],
        creatives: results[3],
      };

      setCache(prev => {
        const next: ReportCache = {
          ...prev,
          tabs: newTabs,
          signature: signatureToSave,
        };
        multiCacheRef.current.set(signatureKey(signatureToSave), next);
        return next;
      });

      logger.log('[useReportCache] All tabs loaded:', {
        loadDateFrom,
        loadDateTo,
        campaigns: results[0]?.availableMetricKeys.length || 0,
        adsets: results[1]?.availableMetricKeys.length || 0,
        ads: results[2]?.availableMetricKeys.length || 0,
        creatives: results[3]?.availableMetricKeys.length || 0,
      });

    } catch (err) {
      logger.error('[useReportCache] Error loading tabs:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
      setLoadingTabs(new Set());
    }
  }, [workspaceId, reportId, loadDateFrom, loadDateTo, attribution, loadTabData]);

  /**
   * Prefetch Period B данных в background
   */
  const prefetchPeriodB = useCallback(async () => {
    if (!compareEnabled || !periodBFrom || !periodBTo || !workspaceId) return;

    // Проверяем нужен ли prefetch
    if (cache.periodBSignature?.dateFrom === periodBFrom && 
        cache.periodBSignature?.dateTo === periodBTo) {
      return; // Уже загружено
    }

    // Отменяем предыдущий prefetch
    if (periodBAbortRef.current) {
      periodBAbortRef.current.abort();
    }
    periodBAbortRef.current = new AbortController();

    setIsLoadingPeriodB(true);

    try {
      const tabs: TabType[] = ['campaigns', 'adsets', 'ads', 'creatives'];
      
      const results = await Promise.all(
        tabs.map(tab => loadTabData(tab, periodBFrom, periodBTo, attribution))
      );

      setCache(prev => ({
        ...prev,
        periodB: {
          campaigns: results[0],
          adsets: results[1],
          ads: results[2],
          creatives: results[3],
        },
        periodBSignature: { dateFrom: periodBFrom, dateTo: periodBTo },
      }));

      // Also persist updated cache state into multi-cache for instant restore
      if (cache.signature) {
        const updated: ReportCache = {
          ...cache,
          periodB: {
            campaigns: results[0],
            adsets: results[1],
            ads: results[2],
            creatives: results[3],
          },
          periodBSignature: { dateFrom: periodBFrom, dateTo: periodBTo },
        };
        multiCacheRef.current.set(signatureKey(cache.signature), updated);
      }

      logger.log('[useReportCache] Period B prefetched');

    } catch (err) {
      logger.error('[useReportCache] Error prefetching Period B:', err);
    } finally {
      setIsLoadingPeriodB(false);
    }
  }, [compareEnabled, periodBFrom, periodBTo, workspaceId, attribution, loadTabData, cache.periodBSignature]);

  // Ref для отслеживания первичной загрузки
  const initialLoadAttemptedRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Эффект: загрузка при изменении signature
   * Важно: НЕ включаем loadAllTabs в deps, чтобы избежать лишних перезагрузок
   * ФИКС: Добавлен retry если accountIds пустые при первой загрузке
   */
  useEffect(() => {
    if (!workspaceId || !reportId) return;

    // Проверяем изменилась ли signature
    if (signaturesEqual(cache.signature, currentSignature)) {
      return; // Кэш актуален
    }

    // Instant restore if we already have this exact signature (e.g., other attribution window)
    const cached = multiCacheRef.current.get(signatureKey(currentSignature));
    if (cached) {
      setCache(cached);
      setIsLoading(false);
      setLoadingTabs(new Set());
      setError(null);
      return;
    }

    // ФИКС проблемы первичной загрузки:
    // Если accountIds пустые, ждём их появления (retry через 100ms, максимум 10 раз)
    if (accountIds.length === 0) {
      if (!initialLoadAttemptedRef.current) {
        initialLoadAttemptedRef.current = true;
        logger.log('[useReportCache] accountIds empty, scheduling retry...');
        
        let retryCount = 0;
        const scheduleRetry = () => {
          retryTimeoutRef.current = setTimeout(() => {
            retryCount++;
            if (accountIds.length > 0) {
              logger.log('[useReportCache] accountIds appeared after', retryCount, 'retries');
              loadAllTabs(currentSignature);
            } else if (retryCount < 10) {
              scheduleRetry();
            } else {
              logger.warn('[useReportCache] accountIds still empty after 10 retries');
            }
          }, 100);
        };
        scheduleRetry();
      }
      return;
    }

    // Сбрасываем флаг при успешной загрузке
    initialLoadAttemptedRef.current = false;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    loadAllTabs(currentSignature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSignature, workspaceId, reportId, accountIds.length, cache.signature]);

  /**
   * Эффект: prefetch Period B через requestIdleCallback
   */
  useEffect(() => {
    if (!compareEnabled || !periodBFrom || !periodBTo) return;
    if (isLoading) return; // Ждём завершения основной загрузки

    // Используем requestIdleCallback для prefetch в idle time
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(
        () => prefetchPeriodB(),
        { timeout: 5000 }
      );
      return () => cancelIdleCallback(handle);
    } else {
      // Fallback для Safari
      const timer = setTimeout(prefetchPeriodB, 100);
      return () => clearTimeout(timer);
    }
  }, [compareEnabled, periodBFrom, periodBTo, isLoading, prefetchPeriodB]);

  /**
   * Фильтрация metricsData по display датам
   * Ключевая функция для варианта A — мгновенное переключение периодов
   */
  const filterMetricsByDisplayDate = useCallback((
    data: TabData | null
  ): TabData | null => {
    if (!data) return null;
    
    // Фильтруем metricsData — оставляем только даты в диапазоне displayDateFrom..displayDateTo
    const filteredMetricsData: MetricsData = {};
    const displayStart = parseISO(displayDateFrom);
    const displayEnd = parseISO(displayDateTo);
    displayStart.setHours(0, 0, 0, 0);
    displayEnd.setHours(23, 59, 59, 999);
    
    Object.entries(data.metricsData).forEach(([dateKey, itemsData]) => {
      // dateKey is stored as 'dd.MM.yyyy' in cache/tableRows
      const date = parse(dateKey, 'dd.MM.yyyy', new Date());
      if (date >= displayStart && date <= displayEnd) {
        filteredMetricsData[dateKey] = itemsData;
      }
    });
    
    // Фильтруем tableRows по датам
    const filteredTableRows = data.tableRows.filter(row => {
      const date = parse(row.date, 'dd.MM.yyyy', new Date());
      return date >= displayStart && date <= displayEnd;
    });
    
    return {
      ...data,
      metricsData: filteredMetricsData,
      tableRows: filteredTableRows,
    };
  }, [displayDateFrom, displayDateTo]);

  /**
   * Получение данных таба из кэша с фильтрацией по display датам
   */
  const getTabData = useCallback((tab: TabType, usePeriodB = false): TabData | null => {
    let data: TabData | null = null;
    
    if (usePeriodB && cache.periodB) {
      data = cache.periodB[tab];
    } else {
      data = cache.tabs[tab];
    }
    
    // Фильтруем по display датам (Period A)
    // Period B НЕ фильтруем — у него свои даты (periodBFrom/periodBTo)
    if (!usePeriodB) {
      return filterMetricsByDisplayDate(data);
    }
    
    return data;
  }, [cache, filterMetricsByDisplayDate]);

  /**
   * Принудительное обновление кэша
   */
  const refreshCache = useCallback(() => {
    setCache(prev => ({
      ...prev,
      signature: null, // Сброс signature триггерит перезагрузку
    }));
  }, []);

  return {
    cache,
    isLoading,
    isLoadingPeriodB,
    loadingTabs,
    getTabData,
    refreshCache,
    error,
  };
}
