import client from './client';
import type { Project, ProjectStatus } from '../store/slices/projectsSlice';
import type { Report } from '../store/slices/reportsSlice';
import type { MetricPreset } from '../store/slices/metricPresetsSlice';
// Note type будет определён здесь локально

// ====== ТИПЫ ДЛЯ API ЗАПРОСОВ/ОТВЕТОВ ======

export interface ApiProject {
  id: string;
  workspaceId: string;
  code?: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  pinned: boolean;
  tags?: string[];
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  updatedBy: string;
}

export interface CreateProjectRequest {
  workspaceId: string;
  name: string;
  description?: string;
  tags?: string[];
}

export interface UpdateProjectRequest {
  workspaceId: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  tags?: string[];
}

export interface CloneProjectRequest {
  workspaceId: string;
}

export interface TogglePinRequest {
  workspaceId: string;
}

export interface ApiReport {
  id: string;
  projectId: string;
  code?: number;
  name: string;
  selectedMetrics: string[];
  activeTab: string;
  selections?: Partial<Report['selections']> | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  chartSlots?: Report['chartSlots'];
  metricCards?: Report['metricCards'];
  pinned?: boolean;
  tags?: string[] | null;
  createdDate: string;
  updatedDate: string;
  // Report-First Sync fields
  status?: string;
  dataRange?: {
    loadedDays: number;
    requestedDays: number;
    startDate: string;
    endDate: string;
  };
  syncProgress?: number;
  syncStartedAt?: string | null;
  syncCompletedAt?: string | null;
  syncError?: string | null;
  autoRefresh?: boolean;
  lastOpenedAt?: string | null;
  deletedAt?: string | null;
}

export interface CreateReportRequest {
  workspaceId: string;
  projectId: string;
  name: string;
  selectedMetrics: string[];
  activeTab?: string;
  selections?: any;
  dateFrom?: string;
  dateTo?: string;
}

export interface UpdateReportRequest {
  workspaceId: string;
  name?: string;
  selectedMetrics?: string[];
  activeTab?: string;
  selections?: any;
  dateFrom?: string;
  dateTo?: string;
  chartSlots?: any;
  metricCards?: any;
  visibleChartSlots?: number[];
  pinned?: boolean;
  tags?: string[];
}

export interface ApiMetricPreset {
  id: string;
  workspaceId: string;
  name: string;
  metrics: string[];
  isDefault: boolean;
  createdDate: string;
  updatedDate: string;
}

export interface CreateMetricPresetRequest {
  workspaceId: string;
  name: string;
  metrics: string[];
  isDefault?: boolean;
}

export interface UpdateMetricPresetRequest {
  workspaceId: string;
  name?: string;
  metrics?: string[];
  isDefault?: boolean;
}

export interface ApiAdAccount {
  id: string;
  adAccountId: string;
  name: string | null;
  currency: string | null;
  status: string | null;
  spendCap: string | null;
  balance: string | null;
  campaigns: number;
  activeCampaigns: number;
  assetType: string;
  lastSyncedAt: string | null;
  createdDate: string | null;
  updatedDate: string | null;
}

export interface ApiNote {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string;
  type?: string;
  priority?: string;
  status?: string;
  tags?: string[];
  relatedTo?: Array<{ type: string; id: string; name: string }>;
  pinned?: boolean;
  aiInsights?: any;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  updatedBy: string;
  deadline?: string;
  whatsappReminder?: string;
}

export interface CreateNoteRequest {
  workspaceId: string;
  projectId: string;
  title: string;
  description: string;
  type?: string;
  priority?: string;
  status?: string;
  tags?: string[];
  relatedTo?: Array<{ type: string; id: string; name: string }>;
  pinned?: boolean;
  aiInsights?: any;
}

export interface UpdateNoteRequest {
  workspaceId: string;
  projectId?: string;
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  tags?: string[];
  relatedTo?: Array<{ type: string; id: string; name: string }>;
  pinned?: boolean;
  aiInsights?: any;
  deadline?: string;
  whatsappReminder?: string;
  reminderEnabled?: boolean;
}

export interface GetNotesParams {
  workspaceId: string;
  projectId?: string;
  status?: string;
  priority?: string;
  type?: string;
  pinned?: boolean;
  search?: string;
  entityType?: string;
  entityId?: string;
}

// Facebook Marketing API types
export interface ApiCampaign {
  id: string;
  campaignId: string;
  adAccountId: string;
  name: string | null;
  status: string | null;
  objective: string | null;
  effectiveStatus: string | null;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  startTime: string | null;
  stopTime: string | null;
  createdTime: string | null;
  updatedTime: string | null;
  lastSyncedAt: string | null;
}

export interface ApiAdSet {
  id: string;
  adsetId: string;
  campaignId: string;
  name: string | null;
  status: string | null;
  effectiveStatus: string | null;
  optimizationGoal: string | null;
  billingEvent: string | null;
  bidAmount: string | null;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  startTime: string | null;
  endTime: string | null;
  createdTime: string | null;
  updatedTime: string | null;
  lastSyncedAt: string | null;
}

export interface ApiAd {
  id: string;
  adId: string;
  adsetId: string;
  campaignId?: string; // Добавлено для Parent display
  name: string | null;
  status: string | null;
  effectiveStatus: string | null;
  creativeId: string | null;
  createdTime: string | null;
  updatedTime: string | null;
  lastSyncedAt: string | null;
  adset?: {
    adsetId: string;
    campaignId: string;
    campaign?: {
      campaignId: string;
    };
  };
}

export interface Creative {
  id: string;
  name: string;
  thumbnail_url?: string;
  [key: string]: any;
}

// Полный интерфейс креатива из backend
export interface ApiCreative {
  id: string;
  creativeId: string;
  adAccountId?: string | null;
  name?: string | null;
  title?: string | null;
  body?: string | null;
  linkUrl?: string | null;
  imageUrl?: string | null;
  videoId?: string | null;
  thumbnailUrl?: string | null;
  callToActionType?: string | null;
  lastSyncedAt?: string | null;
}

export interface InsightsRequest {
  workspaceId: string;
  adAccountId?: string;
  objectType: 'account' | 'campaign' | 'adset' | 'ad';
  objectIds: string[];
  dateFrom: string;
  dateTo: string;
  level?: 'account' | 'campaign' | 'adset' | 'ad';
  attributionSetting?: string;
}

export interface InsightsResponse {
  success: boolean;
  count?: number;
  insights: Array<Record<string, any>>;
}

// ====== CAPI EVENTS ======

export type CapiEventStatus = 'pending' | 'queued' | 'sent' | 'failed';

export type CapiDatePreset = '24h' | '7d' | '30d' | '90d';

export interface GetCapiEventsRequest {
  workspaceId: string;
  status?: CapiEventStatus[];
  pixelIds?: string[];
  datasetIds?: string[];
  actionSources?: string[];
  isTestEvent?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortDirection?: 'asc' | 'desc';
}

export interface ApiCapiEventListItem {
  id: string;
  eventId: string;
  eventName: string;
  eventTime: string;
  createdDate: string;
  status: CapiEventStatus;
  actionSource: string;
  pixelId: string;
  pixelName?: string | null;
  datasetId?: string | null;
  datasetName?: string | null;
  estimatedEmqScore: number | null;
  retryCount: number;
  maxRetries: number;
  isTestEvent: boolean;
  testEventCode?: string | null;
  facebookEventId?: string | null;
  errorMessage?: string | null;
  logsCount: number;
  warningsCount: number;
}

export interface ApiCapiEventsResponse {
  items: ApiCapiEventListItem[];
  total: number;
  limit: number;
  offset: number;
  timeRange: {
    from: string;
    to: string;
  };
}

export interface ApiCapiEventDetailPayload {
  id: string;
  eventId: string;
  eventName: string;
  eventTime: string;
  createdDate: string;
  updatedDate: string;
  sentAt?: string | null;
  status: CapiEventStatus;
  actionSource: string;
  eventSourceUrl?: string | null;
  pixelId: string;
  pixelName?: string | null;
  datasetId?: string | null;
  datasetName?: string | null;
  userData?: Record<string, any> | null;
  customData?: Record<string, any> | null;
  appData?: Record<string, any> | null;
  dataProcessingOptions?: any[] | null;
  estimatedEmqScore: number | null;
  validationWarnings?: string[] | null;
  facebookEventId?: string | null;
  facebookResponse?: Record<string, any> | null;
  errorMessage?: string | null;
  retryCount: number;
  maxRetries: number;
  isTestEvent: boolean;
  testEventCode?: string | null;
  fullPayload: Record<string, any>;
  userAgent?: string | null;
  ipAddress?: string | null;
  externalId?: string | null;
}

export interface ApiCapiEventLogPayload {
  id: string;
  statusCode?: number | null;
  requestUrl: string;
  requestMethod: string;
  requestPayload: Record<string, any>;
  responsePayload?: Record<string, any> | null;
  responseHeaders?: Record<string, any> | null;
  durationMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  errorType?: string | null;
  errorSubcode?: number | null;
  facebookTraceId?: string | null;
  retryAttempt: number;
  isRetry: boolean;
  createdDate: string;
}

export interface ApiCapiEventQualityPayload {
  eventId: string;
  emqScore: number;
  emqCategory: 'excellent' | 'good' | 'fair' | 'poor';
  matchedFields: string[];
  missingFields: string[];
  fieldScores?: Record<string, number> | null;
  warnings?: string[] | null;
  validationErrors?: string[] | null;
  matchedFieldsCount: number;
  missingFieldsCount: number;
  hasEmail: boolean;
  hasPhone: boolean;
  hasExternalId: boolean;
  hasFbp: boolean;
  hasFbc: boolean;
  hasIp: boolean;
  hasUserAgent: boolean;
  isIpv6: boolean;
  emailNormalized: boolean;
  phoneNormalized: boolean;
  allPiiHashed: boolean;
  fbpValid?: boolean | null;
  fbcValid?: boolean | null;
  recommendations?: string[] | null;
  potentialEmqIncrease?: number | null;
  calculatedAt: string;
}

export interface ApiCapiEventDetail {
  event: ApiCapiEventDetailPayload;
  logs: ApiCapiEventLogPayload[];
  quality: ApiCapiEventQualityPayload | null;
}

// ====== FACEBOOK SYNC STATUS ======

export type FacebookSyncJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type FacebookSyncStepStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface ApiFacebookSyncStatusSegment {
  index: number;
  count: number;
}

export interface ApiFacebookSyncStatusStepSnapshot {
  id: string;
  phase: string;
  status: FacebookSyncStepStatus;
  stepOrder: number;
  totalItems?: number | null;
  processedItems?: number | null;
  successCount?: number | null;
  failedCount?: number | null;
  chunkCursor?: Record<string, any> | null;
  metrics?: Record<string, any> | null;
  message?: string | null;
  errorCode?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface ApiFacebookSyncStatusSnapshot {
  jobId: string;
  queueJobId?: string | null;
  workspaceId: string;
  configId: string;
  credentialId: string;
  adAccountId?: string | null;
  status: FacebookSyncJobStatus;
  progress: number;
  phase?: string | null;
  message?: string | null;
  errorCode?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt: string;
  metadata: Record<string, any>;
  segment?: ApiFacebookSyncStatusSegment | null;
  steps: ApiFacebookSyncStatusStepSnapshot[];
  activeStep?: ApiFacebookSyncStatusStepSnapshot | null;
}

export interface ApiFacebookSyncStatusResponse {
  current: ApiFacebookSyncStatusSnapshot | null;
  history: ApiFacebookSyncStatusSnapshot[];
}

export interface SendPixelTestEventRequest {
  workspaceId: string;
  pixelId: string;
  testEventCode: string;
  eventName?: string;
  eventSourceUrl?: string;
  customData?: Record<string, any>;
  userData?: Record<string, any>;
  domainId?: string;
}

export interface SendPixelTestEventResponse {
  success: boolean;
  eventId?: string;
  facebookEventId?: string;
  emqScore?: number;
  warnings: string[];
  eventSourceUrl: string;
}

export interface ApiFacebookSyncStatusEventPayload {
  jobId: string;
  queueJobId?: string | null;
  workspaceId: string;
  configId: string;
  credentialId: string;
  adAccountId?: string | null;
  status: FacebookSyncJobStatus;
  phase?: string | null;
  progress: number;
  message?: string | null;
  errorCode?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt: string;
  metadata: Record<string, any>;
  segment?: ApiFacebookSyncStatusSegment | null;
  step: {
    phase: string;
    status: FacebookSyncStepStatus;
    processed?: number | null;
    total?: number | null;
    successCount?: number | null;
    failedCount?: number | null;
    chunk?: Record<string, any> | null;
    message?: string | null;
    errorCode?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
  } | null;
  steps: ApiFacebookSyncStatusStepSnapshot[];
}

// ====== PROJECTS API ======

const fbAdsApi = {
  // Projects
  projects: {
    /**
     * Получить все проекты workspace
     */
    async getAll(workspaceId: string): Promise<ApiProject[]> {
      return client.get<ApiProject[]>('/facebook/ads/projects', {
        params: { workspaceId },
      });
    },

    /**
     * Создать новый проект
     */
    async create(data: CreateProjectRequest): Promise<ApiProject> {
      return client.post<ApiProject>('/facebook/ads/projects', data);
    },

    /**
     * Обновить проект
     */
    async update(id: string, data: UpdateProjectRequest): Promise<ApiProject> {
      return client.put<ApiProject>(`/facebook/ads/projects/${id}`, data);
    },

    /**
     * Удалить проект
     */
    async delete(id: string, workspaceId: string): Promise<{ success: boolean }> {
      return client.delete<{ success: boolean }>(`/facebook/ads/projects/${id}`, {
        params: { workspaceId },
      });
    },

    /**
     * Клонировать проект
     */
    async clone(id: string, data: CloneProjectRequest): Promise<ApiProject> {
      return client.post<ApiProject>(`/facebook/ads/projects/${id}/clone`, data);
    },

    /**
     * Переключить pin проекта
     */
    async togglePin(id: string, data: TogglePinRequest): Promise<ApiProject> {
      return client.post<ApiProject>(`/facebook/ads/projects/${id}/toggle-pin`, data);
    },
  },

  // Reports
  reports: {
    /**
     * Получить все отчёты проекта
     */
    async getAll(workspaceId: string, projectId: string): Promise<ApiReport[]> {
      return client.get<ApiReport[]>('/facebook/ads/reports', {
        params: { workspaceId, projectId },
      });
    },

    /**
     * Создать новый отчёт
     */
    async create(data: CreateReportRequest): Promise<ApiReport> {
      return client.post<ApiReport>('/facebook/ads/reports', data);
    },

    /**
     * Обновить отчёт
     */
    async update(id: string, data: UpdateReportRequest): Promise<ApiReport> {
      return client.put<ApiReport>(`/facebook/ads/reports/${id}`, data);
    },

    /**
     * Удалить отчёт
     */
    async delete(id: string, workspaceId: string): Promise<{ success: boolean }> {
      return client.delete<{ success: boolean }>(`/facebook/ads/reports/${id}`, {
        params: { workspaceId },
      });
    },

    // ===== Report Sync API =====

    /**
     * Запустить синхронизацию данных отчёта
     */
    async startSync(
      reportId: string,
      data: { workspaceId: string; configId: string; days?: number; priority?: number }
    ): Promise<{ success: boolean; jobId: string; reportId: string; requestedDays: number }> {
      return client.post(`/facebook/ads/reports/${reportId}/sync`, data);
    },

    /**
     * Расширить диапазон данных отчёта
     */
    async extendRange(
      reportId: string,
      data: { workspaceId: string; configId?: string; targetDays: number }
    ): Promise<{ success: boolean; jobId: string; currentDays: number; targetDays: number }> {
      return client.post(`/facebook/ads/reports/${reportId}/extend`, data);
    },

    /**
     * Отменить синхронизацию
     */
    async cancelSync(
      reportId: string,
      workspaceId: string,
      reason?: string
    ): Promise<{ success: boolean; jobId: string }> {
      return client.delete(`/facebook/ads/reports/${reportId}/sync`, {
        params: { workspaceId, reason },
      });
    },

    /**
     * Получить статус синхронизации
     */
    async getSyncStatus(
      reportId: string,
      workspaceId: string
    ): Promise<{
      reportId: string;
      status: string;
      dataRange?: { loadedDays: number; requestedDays: number; startDate: string; endDate: string };
      syncProgress?: number;
      syncStartedAt?: string;
      syncCompletedAt?: string;
      syncDuration?: string;
      syncError?: string;
      availableExtensions: number[];
      isDeleted: boolean;
    }> {
      return client.get(`/facebook/ads/reports/${reportId}/sync/status`, {
        params: { workspaceId },
      });
    },

    /**
     * Обновить lastOpenedAt (при открытии отчёта)
     */
    async touch(reportId: string, workspaceId: string): Promise<{ success: boolean; lastOpenedAt: string }> {
      return client.post(`/facebook/ads/reports/${reportId}/touch`, { workspaceId });
    },

    /**
     * Восстановить удалённый отчёт
     */
    async restore(reportId: string, workspaceId: string): Promise<{ success: boolean; reportId: string }> {
      return client.post(`/facebook/ads/reports/${reportId}/restore`, { workspaceId });
    },

    /**
     * Переключить авто-обновление
     */
    async toggleAutoRefresh(
      reportId: string,
      data: { workspaceId: string; enabled: boolean }
    ): Promise<{ success: boolean; reportId: string; autoRefresh: boolean; limit: number; current: number; remaining: number }> {
      return client.post(`/facebook/ads/reports/${reportId}/auto-refresh`, data);
    },

    /**
     * Получить лимит авто-обновления
     */
    async getAutoRefreshLimit(workspaceId: string): Promise<{ limit: number; current: number; remaining: number }> {
      return client.get('/facebook/ads/reports/auto-refresh/limit', {
        params: { workspaceId },
      });
    },
  },

  // Metric Presets
  metricPresets: {
    /**
     * Получить все пресеты метрик workspace
     */
    async getAll(workspaceId: string): Promise<ApiMetricPreset[]> {
      return client.get<ApiMetricPreset[]>('/facebook/ads/metric-presets', {
        params: { workspaceId },
      });
    },

    /**
     * Создать новый пресет
     */
    async create(data: CreateMetricPresetRequest): Promise<ApiMetricPreset> {
      return client.post<ApiMetricPreset>('/facebook/ads/metric-presets', data);
    },

    /**
     * Обновить пресет
     */
    async update(id: string, data: UpdateMetricPresetRequest): Promise<ApiMetricPreset> {
      return client.put<ApiMetricPreset>(`/facebook/ads/metric-presets/${id}`, data);
    },

    /**
     * Удалить пресет
     */
    async delete(id: string, workspaceId: string): Promise<{ success: boolean }> {
      return client.delete<{ success: boolean }>(`/facebook/ads/metric-presets/${id}`, {
        params: { workspaceId },
      });
    },
  },

  // Notes
  notes: {
    /**
     * Получить заметки с фильтрацией
     */
    async getAll(params: GetNotesParams): Promise<ApiNote[]> {
      return client.get<ApiNote[]>('/facebook/ads/notes', { params });
    },

    /**
     * Создать новую заметку
     */
    async create(data: CreateNoteRequest): Promise<ApiNote> {
      return client.post<ApiNote>('/facebook/ads/notes', data);
    },

    /**
     * Обновить заметку
     */
    async update(id: string, data: UpdateNoteRequest): Promise<ApiNote> {
      return client.put<ApiNote>(`/facebook/ads/notes/${id}`, data);
    },

    /**
     * Удалить заметку
     */
    async delete(id: string, workspaceId: string): Promise<{ success: boolean }> {
      return client.delete<{ success: boolean }>(`/facebook/ads/notes/${id}`, {
        params: { workspaceId },
      });
    },
  },

  adAccounts: {
    async getAll(workspaceId: string): Promise<ApiAdAccount[]> {
      return client.get<ApiAdAccount[]>('/facebook/ads/ad-accounts', {
        params: { workspaceId },
      });
    },
  },

  // Pixels
  pixels: {
    async getAll(workspaceId: string): Promise<any[]> {
      return client.get<any[]>('/facebook/pixels', {
        params: { workspaceId },
      });
    },
    async add(workspaceId: string, pixelId: string): Promise<any> {
      return client.post<any>('/facebook/pixels', { workspaceId, pixelId });
    },
    async remove(workspaceId: string, pixelId: string): Promise<{ success: boolean }> {
      return client.delete<{ success: boolean }>('/facebook/pixels', {
        params: { workspaceId, pixelId },
      });
    },
    async setSelected(workspaceId: string, pixelId: string): Promise<{ success: boolean; selectedPixelId?: string }> {
      return client.put<{ success: boolean; selectedPixelId?: string }>('/facebook/pixels/selected', {
        workspaceId,
        pixelId,
      });
    },
    async sendTestEvent({ workspaceId, pixelId, ...body }: SendPixelTestEventRequest): Promise<SendPixelTestEventResponse> {
      return client.post<SendPixelTestEventResponse>(
        `/facebook-pixel-setup/workspaces/${workspaceId}/pixels/${pixelId}/test-event`,
        body
      );
    },
  },

  // Audiences
  audiences: {
    async getAll(workspaceId: string): Promise<any[]> {
      return client.get<any[]>('/facebook/audiences', {
        params: { workspaceId },
      });
    },
    async add(workspaceId: string, audienceId: string): Promise<any> {
      return client.post<any>('/facebook/audiences', { workspaceId, audienceId });
    },
    async remove(workspaceId: string, audienceId: string): Promise<{ success: boolean }> {
      return client.delete<{ success: boolean }>('/facebook/audiences', {
        params: { workspaceId, audienceId },
      });
    },
  },

  // System Users
  systemUsers: {
    async getAll(workspaceId: string): Promise<any[]> {
      return client.get<any[]>('/facebook/system-users', {
        params: { workspaceId },
      });
    },
    async updateToken(workspaceId: string, systemUserId: string, token: string): Promise<any> {
      return client.post<any>('/facebook/system-users', {
        workspaceId,
        systemUserId,
        token,
      });
    },
  },

  // User Settings
  userSettings: {
    async get(workspaceId: string): Promise<any> {
      return client.get<any>('/facebook/user-settings', {
        params: { workspaceId },
      });
    },
  },

  // Sync Status
  syncStatus: {
    async getHistory(workspaceId: string, limit?: number): Promise<ApiFacebookSyncStatusResponse> {
      const params: Record<string, string | number> = { workspaceId };
      if (typeof limit === 'number' && Number.isFinite(limit)) {
        params.limit = limit;
      }

      return client.get<ApiFacebookSyncStatusResponse>('/facebook/ads/sync-status', {
        params,
      });
    },
  },

  // Scopes
  scopes: {
    async get(): Promise<{ groups: any[] }> {
      return client.get<{ groups: any[] }>('/facebook/scopes');
    },
  },

  // Facebook Marketing API
  marketing: {
    /**
     * Загрузка всех чанков параллельно
     */
    async fetchAllChunks<T>(
      url: string,
      workspaceId: string,
      extraParams: Record<string, string> = {},
      dataKey: 'campaigns' | 'adsets' | 'ads'
    ): Promise<T[]> {
      const limit = 100;
      
      // Первый запрос — получаем total
      type ChunkResponse = { campaigns?: T[]; adsets?: T[]; ads?: T[]; total: number; hasMore: boolean };
      const firstResponse = await client.get<ChunkResponse>(url, {
        params: { workspaceId, limit, offset: 0, ...extraParams }
      });
      
      const firstItems = (firstResponse[dataKey] as T[]) || [];
      const total = firstResponse.total || firstItems.length;
      
      if (!firstResponse.hasMore || total <= limit) {
        return firstItems;
      }
      
      // Параллельно грузим остальные чанки
      const remainingChunks = Math.ceil((total - limit) / limit);
      const chunkPromises = Array.from({ length: remainingChunks }, (_, i) => {
        const offset = (i + 1) * limit;
        return client.get<ChunkResponse>(url, {
          params: { workspaceId, limit, offset, ...extraParams }
        });
      });
      
      const responses = await Promise.all(chunkPromises);
      const allItems = [...firstItems];
      
      for (const response of responses) {
        allItems.push(...((response[dataKey] as T[]) || []));
      }
      
      return allItems;
    },

    /**
     * Получить кампании (параллельная загрузка чанков)
     */
    async getCampaigns(
      workspaceId: string,
      params: { adAccountIds?: string[]; campaignIds?: string[] }
    ): Promise<ApiCampaign[]> {
      const accountId = params.adAccountIds?.[0];
      if (!accountId) {
        console.warn('getCampaigns: No adAccountId provided');
        return [];
      }
      
      const extraParams: Record<string, string> = {};
      if (params.campaignIds?.length) {
        extraParams.campaignIds = params.campaignIds.join(',');
      }

      return this.fetchAllChunks<ApiCampaign>(
        `/facebook/ads/campaigns/${accountId}`,
        workspaceId,
        extraParams,
        'campaigns'
      );
    },

    /**
     * Получить adsets (параллельная загрузка чанков)
     */
    async getAdSets(
      workspaceId: string,
      params: { adAccountIds?: string[]; campaignIds?: string[]; adsetIds?: string[] }
    ): Promise<ApiAdSet[]> {
      const accountId = params.adAccountIds?.[0];
      if (!accountId) {
        console.warn('getAdSets: No adAccountId provided');
        return [];
      }
      
      const extraParams: Record<string, string> = {};
      if (params.campaignIds?.length) {
        extraParams.campaignIds = params.campaignIds.join(',');
      }
      if (params.adsetIds?.length) {
        extraParams.adsetIds = params.adsetIds.join(',');
      }

      return this.fetchAllChunks<ApiAdSet>(
        `/facebook/ads/adsets/${accountId}`,
        workspaceId,
        extraParams,
        'adsets'
      );
    },

    /**
     * Получить ads (параллельная загрузка чанков)
     */
    async getAds(
      workspaceId: string,
      params: { adAccountIds?: string[]; campaignIds?: string[]; adsetIds?: string[]; adIds?: string[] }
    ): Promise<ApiAd[]> {
      const accountId = params.adAccountIds?.[0];
      if (!accountId) {
        console.warn('getAds: No adAccountId provided');
        return [];
      }
      
      const extraParams: Record<string, string> = {};
      if (params.campaignIds?.length) {
        extraParams.campaignIds = params.campaignIds.join(',');
      }
      if (params.adsetIds?.length) {
        extraParams.adsetIds = params.adsetIds.join(',');
      }
      if (params.adIds?.length) {
        extraParams.adIds = params.adIds.join(',');
      }

      return this.fetchAllChunks<ApiAd>(
        `/facebook/ads/ads/${accountId}`,
        workspaceId,
        extraParams,
        'ads'
      );
    },

    /**
     * Получить креативы
     */
    async getCreatives(
      workspaceId: string,
      params: { adAccountId?: string; adIds?: string[] }
    ): Promise<ApiCreative[]> {
      return client.get<ApiCreative[]>('/facebook/ads/creatives', {
        params: {
          workspaceId,
          adAccountId: params.adAccountId,
          adIds: params.adIds?.join(','),
        },
      });
    },

    /**
     * Получить метрики креативов через Asset Breakdowns
     * Возвращает: { adId: { breakdown_type: [{ asset, impressions, clicks, spend, reach, actions, action_values }] } }
     */
    async getCreativeInsights(
      workspaceId: string,
      params: { adIds: string[]; dateFrom: string; dateTo: string }
    ): Promise<Record<string, Record<string, any[]>>> {
      return client.get<Record<string, Record<string, any[]>>>('/facebook/ads/creative-insights', {
        params: {
          workspaceId,
          adIds: params.adIds.join(','),
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      });
    },

    /**
     * Получить insights (статистика)
     */
    async getInsights(data: InsightsRequest): Promise<InsightsResponse> {
      if (!data.adAccountId) {
        throw new Error('adAccountId is required for fetching insights');
      }
      return client.get<InsightsResponse>(`/facebook-marketing/insights/${data.adAccountId}`, {
        params: {
          workspaceId: data.workspaceId,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          level: data.level
        }
      });
    },

    /**
     * Получить доступные окна атрибуции из сохранённых raw insights
     */
    async getAttributionSettings(accountId: string): Promise<{
      success: boolean;
      attributionSettings: Array<{ value: string; label: string; count: number }>;
    }> {
      if (!accountId) {
        return { success: false, attributionSettings: [] };
      }
      return client.get(`/facebook-marketing/attribution-settings/${accountId}`);
    },
  },

  // CAPI Events
  capiEvents: {
    async list(params: GetCapiEventsRequest): Promise<ApiCapiEventsResponse> {
      const { workspaceId, ...rest } = params;
      const query: Record<string, any> = { workspaceId };

      Object.entries(rest).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        if (Array.isArray(value) && value.length === 0) {
          return;
        }
        if (typeof value === 'string' && value.trim() === '') {
          return;
        }
        query[key] = value;
      });

      return client.get<ApiCapiEventsResponse>('/facebook/ads/capi-events', {
        params: query,
      });
    },

    async detail(params: { workspaceId: string; eventId: string }): Promise<ApiCapiEventDetail> {
      return client.get<ApiCapiEventDetail>(`/facebook/ads/capi-events/${params.eventId}`, {
        params: { workspaceId: params.workspaceId },
      });
    },
  },

  // Token Audit
  tokenAudit: {
    async getAll(workspaceId: string, limit = 50, offset = 0): Promise<TokenAuditResponse> {
      return client.get<TokenAuditResponse>('/facebook/token-audit', {
        params: { workspaceId, limit, offset },
      });
    },
  },
};

// Types for Token Audit
export interface TokenAuditEvent {
  id: string;
  createdAt: string | null;
  eventType: string;
  scopes: string;
  status: 'success' | 'error';
  details: any;
}

export interface TokenAuditResponse {
  events: TokenAuditEvent[];
  total: number;
}

// ====== NOTIFICATIONS API ======

export interface Notification {
  id: string;
  workspaceId: string;
  /** ID воркспейса-источника для глобальных уведомлений */
  sourceWorkspaceId?: string;
  /** Название воркспейса-источника для отображения */
  sourceWorkspaceName?: string;
  /** Глобальное уведомление видно во всех workspace */
  isGlobal?: boolean;
  type: 
    | 'sync_complete' 
    | 'sync_failed' 
    | 'initial_sync_started'
    | 'initial_sync_paused'
    | 'report_ready'
    | 'initial_sync_resumed'
    | 'incremental_sync'
    | 'deadline_approaching' 
    | 'deadline_overdue';
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const notificationsApi = {
  async getAll(workspaceId: string, options?: { limit?: number; unreadOnly?: boolean; checkDeadlines?: boolean }): Promise<NotificationsResponse> {
    return client.get<NotificationsResponse>(`/facebook/notifications/${workspaceId}`, {
      params: {
        limit: options?.limit,
        unreadOnly: options?.unreadOnly,
        checkDeadlines: options?.checkDeadlines
      }
    });
  },

  async getUnreadCount(workspaceId: string): Promise<{ unreadCount: number }> {
    return client.get<{ unreadCount: number }>(`/facebook/notifications/${workspaceId}/count`);
  },

  async markAsRead(workspaceId: string, id: string): Promise<Notification> {
    return client.patch<Notification>(`/facebook/notifications/${workspaceId}/${id}/read`);
  },

  async markAllAsRead(workspaceId: string): Promise<{ affected: number }> {
    return client.patch<{ affected: number }>(`/facebook/notifications/${workspaceId}/read-all`);
  },

  async delete(workspaceId: string, id: string): Promise<{ success: boolean }> {
    return client.delete<{ success: boolean }>(`/facebook/notifications/${workspaceId}/${id}`);
  }
};

export default fbAdsApi;
