import { useState, useEffect, useCallback, useMemo } from 'react';
import { kommoApi, KommoCrmMetrics, KommoCrmFilters, KommoPipeline, KommoUser } from '@/api/kommo';
import logger from '@/lib/logger';

export interface CrmAnalyticsParams {
  startDate?: string;
  endDate?: string;
  pipelineId?: number;
  responsibleUserId?: number;
  campaignIds?: string[];
  adsetIds?: string[];
  adIds?: string[];
}

export interface UseCrmAnalyticsResult {
  // Данные
  metrics: KommoCrmMetrics | null;
  filters: KommoCrmFilters | null;
  
  // Состояние
  isLoading: boolean;
  isFiltersLoading: boolean;
  error: string | null;
  
  // CRM Info
  crmName: string;
  crmConnected: boolean;
  
  // Фильтры
  pipelines: KommoPipeline[];
  users: KommoUser[];
  selectedPipelineId: number | null;
  selectedUserId: number | null;
  
  // Действия
  setSelectedPipelineId: (id: number | null) => void;
  setSelectedUserId: (id: number | null) => void;
  refetch: () => Promise<void>;
  
  // Метрики по объектам FB (для таблиц)
  getMetricsForCampaign: (campaignId: string) => CrmObjectMetrics;
  getMetricsForAdset: (adsetId: string) => CrmObjectMetrics;
  getMetricsForAd: (adId: string) => CrmObjectMetrics;
  
  // Метрики по датам (для графиков)
  getMetricsForDate: (date: string) => CrmDateMetrics;
}

export interface CrmObjectMetrics {
  crm_leads: number;
  crm_deals: number;
  crm_deals_won: number;
  crm_revenue: number;
  cpl?: number;        // Рассчитывается со spend
  crm_roi?: number;    // Рассчитывается со spend
  crm_roas?: number;   // Рассчитывается со spend
}

export interface CrmDateMetrics {
  crm_leads: number;
  crm_deals: number;
  crm_deals_won: number;
  crm_revenue: number;
  crm_matched_leads: number;
  crm_unmatched_leads: number;
}

const EMPTY_OBJECT_METRICS: CrmObjectMetrics = {
  crm_leads: 0,
  crm_deals: 0,
  crm_deals_won: 0,
  crm_revenue: 0,
};

const EMPTY_DATE_METRICS: CrmDateMetrics = {
  crm_leads: 0,
  crm_deals: 0,
  crm_deals_won: 0,
  crm_revenue: 0,
  crm_matched_leads: 0,
  crm_unmatched_leads: 0,
};

/**
 * Хук для получения CRM аналитики и интеграции с AnalyticsPage.
 * Загружает метрики из Kommo и предоставляет их для карточек, графиков и таблиц.
 */
export function useCrmAnalytics(params: CrmAnalyticsParams): UseCrmAnalyticsResult {
  const [metrics, setMetrics] = useState<KommoCrmMetrics | null>(null);
  const [filters, setFilters] = useState<KommoCrmFilters | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltersLoading, setIsFiltersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Загрузка фильтров (воронки, пользователи)
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setIsFiltersLoading(true);
        const data = await kommoApi.getAnalyticsFilters();
        setFilters(data);
      } catch (err: any) {
        logger.warn('[useCrmAnalytics] Failed to load filters:', err.message);
        setFilters(null);
      } finally {
        setIsFiltersLoading(false);
      }
    };

    loadFilters();
  }, []);

  // Загрузка метрик
  const fetchMetrics = useCallback(async () => {
    if (!filters?.crmConnected) {
      setMetrics(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await kommoApi.getAnalyticsMetrics({
        ...params,
        pipelineId: selectedPipelineId ?? undefined,
        responsibleUserId: selectedUserId ?? undefined,
      });

      setMetrics(data);
      logger.info('[useCrmAnalytics] Loaded CRM metrics:', data.totals);
    } catch (err: any) {
      logger.error('[useCrmAnalytics] Failed to load metrics:', err.message);
      setError(err.message);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, [params, selectedPipelineId, selectedUserId, filters?.crmConnected]);

  // Автозагрузка при изменении параметров
  useEffect(() => {
    if (!isFiltersLoading) {
      fetchMetrics();
    }
  }, [fetchMetrics, isFiltersLoading]);

  // Получить метрики для конкретной кампании
  const getMetricsForCampaign = useCallback((campaignId: string): CrmObjectMetrics => {
    if (!metrics?.byCampaign) return EMPTY_OBJECT_METRICS;
    return metrics.byCampaign[campaignId] || EMPTY_OBJECT_METRICS;
  }, [metrics]);

  // Получить метрики для конкретного adset
  const getMetricsForAdset = useCallback((adsetId: string): CrmObjectMetrics => {
    if (!metrics?.byAdset) return EMPTY_OBJECT_METRICS;
    return metrics.byAdset[adsetId] || EMPTY_OBJECT_METRICS;
  }, [metrics]);

  // Получить метрики для конкретного ad
  const getMetricsForAd = useCallback((adId: string): CrmObjectMetrics => {
    if (!metrics?.byAd) return EMPTY_OBJECT_METRICS;
    return metrics.byAd[adId] || EMPTY_OBJECT_METRICS;
  }, [metrics]);

  // Получить метрики для даты (графики)
  const getMetricsForDate = useCallback((date: string): CrmDateMetrics => {
    if (!metrics?.byDate) return EMPTY_DATE_METRICS;
    return metrics.byDate[date] || EMPTY_DATE_METRICS;
  }, [metrics]);

  return {
    metrics,
    filters,
    isLoading,
    isFiltersLoading,
    error,
    
    crmName: filters?.crmName || 'CRM',
    crmConnected: filters?.crmConnected || false,
    
    pipelines: filters?.pipelines || [],
    users: filters?.users || [],
    selectedPipelineId,
    selectedUserId,
    
    setSelectedPipelineId,
    setSelectedUserId,
    refetch: fetchMetrics,
    
    getMetricsForCampaign,
    getMetricsForAdset,
    getMetricsForAd,
    getMetricsForDate,
  };
}

/**
 * Вычисляет CPL, ROI, ROAS на основе CRM метрик и расходов FB.
 */
export function calculateCrmDerivedMetrics(
  crmMetrics: CrmObjectMetrics,
  spend: number
): CrmObjectMetrics {
  return {
    ...crmMetrics,
    cpl: crmMetrics.crm_leads > 0 ? spend / crmMetrics.crm_leads : 0,
    crm_roi: spend > 0 ? ((crmMetrics.crm_revenue - spend) / spend) * 100 : 0,
    crm_roas: spend > 0 ? crmMetrics.crm_revenue / spend : 0,
  };
}

export default useCrmAnalytics;
