import axios from 'axios';
import client from './client';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export type KommoConfig = {
  id: string;
  accountDomain?: string | null;
  accountId?: string | null;
  isActive?: boolean;
  defaultPipelineId?: string | null;
  defaultStatusId?: string | null;
  defaultResponsibleUserId?: string | null;
  lastSyncAt?: string | null;
  defaultTags?: string[];
  wizardCompleted?: boolean;
};

export type KommoStats = {
  leadsCount?: number;
  contactsCount?: number;
  tasksCount?: number;
  eventsCount?: number;
};

// Типы для метаданных Kommo
export type KommoPipeline = {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  statuses: KommoPipelineStatus[];
};

export type KommoPipelineStatus = {
  id: number;
  name: string;
  sort: number;
  color: string;
  type: number; // 0 = обычный, 1 = Won (142), 2 = Lost (143)
};

export type KommoUser = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
};

export type KommoCustomField = {
  id: number;
  name: string;
  type: string; // text, numeric, select, multiselect, date, url, checkbox, etc.
  entity_type: 'leads' | 'contacts' | 'companies';
  enums?: Array<{ id: number; value: string }>;
};

export type KommoMetadata = {
  pipelines: KommoPipeline[];
  users: KommoUser[];
  customFields: KommoCustomField[];
};

/**
 * Возвращает URL для старта OAuth авторизации Kommo.
 * Это навигация на backend endpoint, который далее ведёт по OAuth-потоку.
 */
export function getKommoAuthorizeUrl(): string {
  return `${API_BASE_URL}/kommo/oauth/authorize`;
}

// Типы для Event Routing Config (Kommo ↔ CAPI)
export type KommoRoutingConfig = {
  id?: string;
  workspaceId: string;
  enableCapiEvents: boolean;          // Отправлять события в FB CAPI
  enableKommoSync: boolean;           // Синхронизировать с Kommo
  parallelMode: boolean;              // Параллельный режим (CAPI + Kommo одновременно)
  filterByAttribution: boolean;       // Фильтровать только события с attribution
  
  // Настройки для статусов Kommo → CAPI
  wonStatusId?: number;               // ID статуса "выигрышная сделка"
  lostStatusId?: number;              // ID статуса "проигрышная сделка"
  sendPurchaseOnWon: boolean;         // Отправлять Purchase в CAPI при выигрыше
  sendLeadOnCreate: boolean;          // Отправлять Lead в CAPI при создании
  includeValueInPurchase: boolean;    // Включать сумму сделки в Purchase event
  defaultCurrency: string;            // Валюта по умолчанию (USD, EUR, RUB, VND)
  
  // Event mappings (JSON)
  eventMappings?: Record<string, {
    capi?: { enabled: boolean; eventName?: string; includeValue?: boolean };
    kommo?: { enabled: boolean; pipelineId?: number; statusId?: number };
  }>;
};

// Типы для Inbound Config
export type KommoInboundConfig = {
  pipelineId: number | null;
  statusId: number | null;
  createContact: boolean;
  createCompany: boolean;
  wonStatusId: number | null;         // Статус выигрышной сделки
  sendPurchaseOnWon: boolean;         // Отправлять Purchase в CAPI
  includeValueInPurchase: boolean;    // Включать сумму сделки
  defaultCurrency: string;            // Валюта по умолчанию
};

/**
 * API для интеграции Kommo CRM.
 */
export const kommoApi = {
  /**
   * Получить текущую конфигурацию Kommo.
   * Если интеграция не подключена, backend возвращает 404 — в этом случае возвращаем null.
   */
  async getConfig(): Promise<KommoConfig | null> {
    try {
      return await client.get<KommoConfig>('/kommo/config');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Получить статистику по синхронизации Kommo.
   */
  async getStats(): Promise<KommoStats> {
    return client.get<KommoStats>('/kommo/stats');
  },

  /**
   * Запустить синхронизацию данных (лиды/контакты/события) в Kommo.
   */
  async sync(): Promise<void> {
    await client.post('/kommo/sync');
  },

  /**
   * Отключить интеграцию Kommo (удалить конфиг).
   */
  async disconnect(configId: string): Promise<void> {
    await client.delete(`/kommo/config/${configId}`);
  },

  /**
   * Получить метаданные Kommo (пайплайны, пользователи, кастомные поля).
   */
  async getMetadata(): Promise<KommoMetadata> {
    const raw = await client.get<any>('/kommo/metadata');

    const pipelines = Array.isArray(raw?.pipelines) ? raw.pipelines : [];
    const users = Array.isArray(raw?.users) ? raw.users : [];
    const customFields = Array.isArray(raw?.customFields) ? raw.customFields : [];

    return {
      pipelines: pipelines.map((pipeline: any) => ({
        ...pipeline,
        statuses: Array.isArray(pipeline?.statuses) ? pipeline.statuses : [],
      })),
      users,
      customFields,
    };
  },

  /**
   * Обновить конфигурацию Kommo (частичное обновление).
   */
  async updateConfig(updates: Partial<KommoConfig>): Promise<KommoConfig> {
    return client.patch<KommoConfig>('/kommo/config', updates);
  },

  // ============ Event Routing Config (Kommo ↔ CAPI) ============

  /**
   * Получить конфигурацию роутинга событий.
   */
  async getRoutingConfig(): Promise<KommoRoutingConfig | null> {
    try {
      return await client.get<KommoRoutingConfig>('/kommo/routing-config');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Обновить конфигурацию роутинга событий.
   */
  async updateRoutingConfig(updates: Partial<KommoRoutingConfig>): Promise<KommoRoutingConfig> {
    return client.patch<KommoRoutingConfig>('/kommo/routing-config', updates);
  },

  /**
   * Получить конфигурацию входящих лидов.
   */
  async getInboundConfig(): Promise<KommoInboundConfig | null> {
    try {
      return await client.get<KommoInboundConfig>('/kommo/inbound-config');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Обновить конфигурацию входящих лидов.
   */
  async updateInboundConfig(config: Partial<KommoInboundConfig>): Promise<KommoInboundConfig> {
    return client.patch<KommoInboundConfig>('/kommo/inbound-config', config);
  },

  // ============ Triggers ============

  /**
   * Получить список триггеров.
   */
  async getTriggers(): Promise<any[]> {
    const result = await client.get<{ triggers: any[] }>('/kommo/triggers');
    return result.triggers || [];
  },

  /**
   * Создать триггер.
   */
  async createTrigger(trigger: {
    name: string;
    pipelineId: number;
    statusId: number;
    capiEventName: string;
    enabled: boolean;
    eventValue?: number;
    eventCurrency?: string;
  }): Promise<any> {
    return client.post('/kommo/triggers', trigger);
  },

  /**
   * Обновить триггер.
   */
  async updateTrigger(triggerId: string, updates: Partial<any>): Promise<any> {
    return client.patch(`/kommo/triggers/${triggerId}`, updates);
  },

  /**
   * Удалить триггер.
   */
  async deleteTrigger(triggerId: string): Promise<void> {
    await client.delete(`/kommo/triggers/${triggerId}`);
  },

  // ============ Pipelines & Users ============

  /**
   * Получить воронки Kommo.
   */
  async getPipelines(): Promise<KommoPipeline[]> {
    const metadata = await this.getMetadata();
    return metadata.pipelines;
  },

  /**
   * Получить пользователей Kommo.
   */
  async getUsers(): Promise<KommoUser[]> {
    const metadata = await this.getMetadata();
    return metadata.users;
  },

  /**
   * Получить кастомные поля Kommo.
   */
  async getCustomFields(): Promise<KommoCustomField[]> {
    const metadata = await this.getMetadata();
    return metadata.customFields;
  },

  // ============ CRM Analytics ============

  /**
   * Получить CRM метрики для аналитики.
   */
  async getAnalyticsMetrics(params: {
    startDate?: string;
    endDate?: string;
    pipelineId?: number;
    responsibleUserId?: number;
    campaignIds?: string[];
    adsetIds?: string[];
    adIds?: string[];
  }): Promise<KommoCrmMetrics> {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.set('startDate', params.startDate);
    if (params.endDate) queryParams.set('endDate', params.endDate);
    if (params.pipelineId) queryParams.set('pipelineId', String(params.pipelineId));
    if (params.responsibleUserId) queryParams.set('responsibleUserId', String(params.responsibleUserId));
    if (params.campaignIds?.length) queryParams.set('campaignIds', params.campaignIds.join(','));
    if (params.adsetIds?.length) queryParams.set('adsetIds', params.adsetIds.join(','));
    if (params.adIds?.length) queryParams.set('adIds', params.adIds.join(','));

    const query = queryParams.toString();
    return client.get<KommoCrmMetrics>(`/kommo/analytics/metrics${query ? `?${query}` : ''}`);
  },

  /**
   * Получить доступные фильтры для CRM аналитики.
   */
  async getAnalyticsFilters(): Promise<KommoCrmFilters> {
    return client.get<KommoCrmFilters>('/kommo/analytics/filters');
  },
};

// ============ CRM Analytics Types ============

/**
 * CRM метрики для сквозной аналитики.
 */
export type KommoCrmMetrics = {
  totals: {
    crm_leads: number;
    crm_leads_unique: number;
    crm_deals: number;
    crm_deals_won: number;
    crm_revenue: number;
    crm_avg_deal_value: number;
    crm_conversion_rate: number;
    crm_win_rate: number;
    crm_match_rate: number;
    crm_matched_leads: number;
    crm_unmatched_leads: number;
    crm_leads_fb_lead_ads: number;
    crm_leads_fbclid: number;
    crm_leads_utm: number;
  };
  byDate: Record<string, {
    crm_leads: number;
    crm_deals: number;
    crm_deals_won: number;
    crm_revenue: number;
    crm_matched_leads: number;
    crm_unmatched_leads: number;
  }>;
  byCampaign: Record<string, {
    crm_leads: number;
    crm_deals: number;
    crm_deals_won: number;
    crm_revenue: number;
  }>;
  byAdset: Record<string, {
    crm_leads: number;
    crm_deals: number;
    crm_deals_won: number;
    crm_revenue: number;
  }>;
  byAd: Record<string, {
    crm_leads: number;
    crm_deals: number;
    crm_deals_won: number;
    crm_revenue: number;
  }>;
};

/**
 * Доступные фильтры для CRM аналитики.
 */
export type KommoCrmFilters = {
  pipelines: KommoPipeline[];
  users: KommoUser[];
  crmName: string;
  crmConnected: boolean;
};
