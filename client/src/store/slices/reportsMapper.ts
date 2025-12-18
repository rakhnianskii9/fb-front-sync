import type { ApiReport } from '../../api/fbAds';
import type { Report, ReportSelections, TabType, ReportStatus } from './reportsSlice';

const DEFAULT_TAB: TabType = 'campaigns';
const VALID_TABS: TabType[] = ['campaigns', 'adsets', 'ads', 'creatives'];
const VALID_STATUSES: ReportStatus[] = ['pending', 'syncing', 'ready', 'extending', 'error', 'deleted'];

// Валидация и нормализация activeTab
const normalizeActiveTab = (tab?: string | null): TabType => {
  if (tab && VALID_TABS.includes(tab as TabType)) {
    return tab as TabType;
  }
  return DEFAULT_TAB;
};

// Валидация и нормализация status
const normalizeStatus = (status?: string | null): ReportStatus => {
  if (status && VALID_STATUSES.includes(status as ReportStatus)) {
    return status as ReportStatus;
  }
  return 'ready';
};

const normalizeSelections = (selections?: Partial<ReportSelections> | null): ReportSelections => ({
  accounts: Array.isArray(selections?.accounts) ? selections.accounts : [],
  campaigns: Array.isArray(selections?.campaigns) ? selections.campaigns : [],
  adsets: Array.isArray(selections?.adsets) ? selections.adsets : [],
  ads: Array.isArray(selections?.ads) ? selections.ads : [],
  creatives: Array.isArray(selections?.creatives) ? selections.creatives : [],
});

export const mapApiReportToReport = (apiReport: ApiReport): Report => ({
  id: apiReport.id,
  code: apiReport.code,
  name: apiReport.name,
  projectId: apiReport.projectId,
  selections: normalizeSelections(apiReport.selections as Partial<ReportSelections> | null),
  activeTab: normalizeActiveTab(apiReport.activeTab),
  selectedMetrics: Array.isArray(apiReport.selectedMetrics) ? apiReport.selectedMetrics : [],
  createdAt: apiReport.createdDate,
  updatedAt: apiReport.updatedDate || apiReport.createdDate,
  pinned: apiReport.pinned ?? false,
  tags: Array.isArray(apiReport.tags) ? apiReport.tags : [],
  dateFrom: apiReport.dateFrom ?? null,
  dateTo: apiReport.dateTo ?? null,
  chartSlots: apiReport.chartSlots ?? undefined,
  metricCards: apiReport.metricCards ?? undefined,
  // Report-First Sync fields
  status: normalizeStatus(apiReport.status),
  dataRange: apiReport.dataRange ?? undefined,
  syncProgress: typeof apiReport.syncProgress === 'number' ? apiReport.syncProgress : undefined,
  syncStartedAt: apiReport.syncStartedAt ?? null,
  syncCompletedAt: apiReport.syncCompletedAt ?? null,
  syncError: typeof apiReport.syncError === 'string' ? apiReport.syncError : null,
  autoRefresh: apiReport.autoRefresh ?? false,
  lastOpenedAt: apiReport.lastOpenedAt ?? null,
  deletedAt: apiReport.deletedAt ?? null,
});
