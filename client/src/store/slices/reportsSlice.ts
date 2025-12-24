import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  fetchReportsByProject, 
  createReportThunk, 
  updateReportThunk, 
  deleteReportThunk,
  toggleReportPinThunk,
  startSyncThunk,
  extendRangeThunk,
  cancelSyncThunk,
  getSyncStatusThunk,
  touchReportThunk,
  restoreReportThunk,
  toggleAutoRefreshThunk,
  getAutoRefreshLimitThunk
} from './reportsThunks';

export type TabType = 'campaigns' | 'adsets' | 'ads' | 'creatives';
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'mixed' | 'scatter' | 'radar' | 'funnel';
export type BreakdownType = 'age' | 'gender' | 'country' | 'region' | 'dma' | 'device_platform' | 'publisher_platform' | 'platform_position' | 'impression_device' | 'product_id' | 'hourly_stats_aggregated_by_advertiser_time_zone' | 'hourly_stats_aggregated_by_audience_time_zone';

export interface ChartSlotConfig {
  slotIndex: number;
  metrics: string[];
  title: string;
  showLegend: boolean;
  showGrid: boolean;
  chartType?: ChartType;
  // Brush range for viewport - stored to preserve user's zoom/scroll
  brushStartIndex?: number;
  brushEndIndex?: number;
}

export interface MetricCardConfig {
  metricId: string;
  order: number;
}

export type ReportStatus = 'pending' | 'syncing' | 'ready' | 'extending' | 'error' | 'deleted';

export interface DataRangeInfo {
  loadedDays: number;
  requestedDays: number;
  startDate: string;
  endDate: string;
}

export interface ReportSelections {
  accounts: string[];
  campaigns: string[];
  adsets: string[];
  ads: string[];
  creatives: string[];
}

export interface Report {
  id: string;
  code?: number;
  name: string;
  projectId: string;
  selections: ReportSelections;
  activeTab: TabType;
  selectedMetrics: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  tags: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  attribution?: string; // Attribution window (7d_click_1d_view, 28d_click_1d_view, etc.)
  chartSlots?: ChartSlotConfig[];
  metricCards?: MetricCardConfig[];
  visibleChartSlots?: number[]; // Indices of visible charts [0, 1, 2]
  breakdowns?: BreakdownType[]; // Selected breakdowns for data grouping
  // Report-First Sync fields
  status?: ReportStatus;
  dataRange?: DataRangeInfo;
  syncProgress?: number;
  syncStartedAt?: string | null;
  syncCompletedAt?: string | null;
  syncError?: string | null;
  autoRefresh?: boolean;
  lastOpenedAt?: string | null;
  deletedAt?: string | null;
}

interface ReportsState {
  reports: Record<string, Report[]>; // projectId -> reports[]
  currentReportId: string | null;
  loadingByProject: Record<string, boolean>;
  errorByProject: Record<string, string | null>;
  mutationStatus: 'idle' | 'loading';
  mutationError: string | null;
  // Auto-refresh limit info
  autoRefreshLimit: number;
  autoRefreshCurrent: number;
  autoRefreshRemaining: number;
  // Sync status loading
  syncStatusLoading: Record<string, boolean>;
}

const initialState: ReportsState = {
  reports: {},
  currentReportId: null,
  loadingByProject: {},
  errorByProject: {},
  mutationStatus: 'idle',
  mutationError: null,
  autoRefreshLimit: 5,
  autoRefreshCurrent: 0,
  autoRefreshRemaining: 5,
  syncStatusLoading: {},
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setReports: (state, action: PayloadAction<{ projectId: string; reports: Report[] }>) => {
      state.reports[action.payload.projectId] = action.payload.reports;
    },
    addReport: (state, action: PayloadAction<Report>) => {
      const projectId = action.payload.projectId;
      if (!state.reports[projectId]) {
        state.reports[projectId] = [];
      }
      state.reports[projectId].unshift(action.payload);
      state.currentReportId = action.payload.id;
    },
    updateReport: (state, action: PayloadAction<{ projectId: string; reportId: string; updates: Partial<Report> }>) => {
      const reports = state.reports[action.payload.projectId];
      if (reports) {
        const index = reports.findIndex(r => r.id === action.payload.reportId);
        if (index !== -1) {
          reports[index] = {
            ...reports[index],
            ...action.payload.updates,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    },
    deleteReport: (state, action: PayloadAction<{ projectId: string; reportId: string }>) => {
      const reports = state.reports[action.payload.projectId];
      if (reports) {
        state.reports[action.payload.projectId] = reports.filter(r => r.id !== action.payload.reportId);
        if (state.currentReportId === action.payload.reportId) {
          const remaining = state.reports[action.payload.projectId];
          state.currentReportId = remaining.length > 0 ? remaining[0].id : null;
        }
      }
    },
    setCurrentReport: (state, action: PayloadAction<string | null>) => {
      state.currentReportId = action.payload;
    },
    updateSelections: (state, action: PayloadAction<{ projectId: string; reportId: string; selections: Report['selections'] }>) => {
      const reports = state.reports[action.payload.projectId];
      if (reports) {
        const index = reports.findIndex(r => r.id === action.payload.reportId);
        if (index !== -1) {
          reports[index].selections = action.payload.selections;
          reports[index].updatedAt = new Date().toISOString();
        }
      }
    },
    clearProjectReports: (state, action: PayloadAction<string>) => {
      delete state.reports[action.payload];
      state.currentReportId = null;
    },
    updateChartSlot: (state, action: PayloadAction<{
      projectId: string;
      reportId: string;
      slotConfig: ChartSlotConfig;
    }>) => {
      const { projectId, reportId, slotConfig } = action.payload;
      const report = state.reports[projectId]?.find(r => r.id === reportId);
      if (report) {
        if (!report.chartSlots) {
          report.chartSlots = [];
        }
        const existingIndex = report.chartSlots.findIndex(
          slot => slot.slotIndex === slotConfig.slotIndex
        );
        if (existingIndex >= 0) {
          report.chartSlots[existingIndex] = slotConfig;
        } else {
          report.chartSlots.push(slotConfig);
        }
        report.updatedAt = new Date().toISOString();
      }
    },
    removeChartSlot: (state, action: PayloadAction<{
      projectId: string;
      reportId: string;
      slotIndex: number;
    }>) => {
      const { projectId, reportId, slotIndex } = action.payload;
      const report = state.reports[projectId]?.find(r => r.id === reportId);
      if (report && report.chartSlots) {
        report.chartSlots = report.chartSlots.filter(
          slot => slot.slotIndex !== slotIndex
        );
        report.updatedAt = new Date().toISOString();
      }
    },
    updateChartBrushRange: (state, action: PayloadAction<{
      projectId: string;
      reportId: string;
      slotIndex: number;
      brushStartIndex: number;
      brushEndIndex: number;
    }>) => {
      const { projectId, reportId, slotIndex, brushStartIndex, brushEndIndex } = action.payload;
      const report = state.reports[projectId]?.find(r => r.id === reportId);
      if (report && report.chartSlots) {
        const slot = report.chartSlots.find(s => s.slotIndex === slotIndex);
        if (slot) {
          slot.brushStartIndex = brushStartIndex;
          slot.brushEndIndex = brushEndIndex;
        }
      }
      // Note: No updatedAt change - brush range is transient UI state, not persisted to backend
    },
    updateMetricCards: (state, action: PayloadAction<{
      projectId: string;
      reportId: string;
      metricCards: MetricCardConfig[];
    }>) => {
      const { projectId, reportId, metricCards } = action.payload;
      const report = state.reports[projectId]?.find(r => r.id === reportId);
      if (report) {
        report.metricCards = metricCards;
        report.updatedAt = new Date().toISOString();
      }
    },
    updateVisibleChartSlots: (state, action: PayloadAction<{
      projectId: string;
      reportId: string;
      visibleChartSlots: number[];
    }>) => {
      const { projectId, reportId, visibleChartSlots } = action.payload;
      const report = state.reports[projectId]?.find(r => r.id === reportId);
      if (report) {
        report.visibleChartSlots = visibleChartSlots;
        report.updatedAt = new Date().toISOString();
      }
    },
    updateBreakdowns: (state, action: PayloadAction<{
      projectId: string;
      reportId: string;
      breakdowns: BreakdownType[];
    }>) => {
      const { projectId, reportId, breakdowns } = action.payload;
      const report = state.reports[projectId]?.find(r => r.id === reportId);
      if (report) {
        report.breakdowns = breakdowns;
        report.updatedAt = new Date().toISOString();
      }
    },
    /**
     * updateReportOptimistic — мгновенное обновление report в Redux без projectId
     * Используется для оптимистичных обновлений перед отправкой на сервер
     * Ищет report по reportId во всех проектах
     */
    updateReportOptimistic: (state, action: PayloadAction<{
      reportId: string;
      updates: Partial<Report>;
    }>) => {
      const { reportId, updates } = action.payload;
      // Ищем report во всех проектах
      for (const projectId of Object.keys(state.reports)) {
        const reports = state.reports[projectId];
        const index = reports.findIndex(r => r.id === reportId);
        if (index !== -1) {
          reports[index] = {
            ...reports[index],
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          return; // Нашли и обновили
        }
      }
    },
    resetReportsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportsByProject.pending, (state, action) => {
        const { projectId } = action.meta.arg;
        state.loadingByProject[projectId] = true;
        state.errorByProject[projectId] = null;
      })
      .addCase(fetchReportsByProject.fulfilled, (state, action) => {
        const { projectId, reports } = action.payload;
        state.loadingByProject[projectId] = false;
        state.errorByProject[projectId] = null;
        state.reports[projectId] = reports;

        if (!reports.some((report) => report.id === state.currentReportId)) {
          state.currentReportId = reports.length > 0 ? reports[0].id : null;
        }
      })
      .addCase(fetchReportsByProject.rejected, (state, action) => {
        const { projectId } = action.meta.arg;
        state.loadingByProject[projectId] = false;
        const message = typeof action.payload === 'string' ? action.payload : action.error.message;
        state.errorByProject[projectId] = message || null;
      })
      .addCase(createReportThunk.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(createReportThunk.fulfilled, (state, action) => {
        state.mutationStatus = 'idle';
        state.mutationError = null;
        const { projectId, report } = action.payload;

        if (!state.reports[projectId]) {
          state.reports[projectId] = [];
        }

        state.reports[projectId] = [report, ...state.reports[projectId].filter((item) => item.id !== report.id)];
        state.currentReportId = report.id;
      })
      .addCase(createReportThunk.rejected, (state, action) => {
        state.mutationStatus = 'idle';
        const message = typeof action.payload === 'string' ? action.payload : action.error.message;
        state.mutationError = message || null;
      })
      .addCase(updateReportThunk.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(updateReportThunk.fulfilled, (state, action) => {
        state.mutationStatus = 'idle';
        state.mutationError = null;
        const { projectId, report } = action.payload;
        const projectReports = state.reports[projectId];

        if (!projectReports) {
          state.reports[projectId] = [report];
          return;
        }

        const index = projectReports.findIndex((item) => item.id === report.id);
        if (index !== -1) {
          // Сравниваем selectedMetrics чтобы избежать лишнего re-render
          const existing = projectReports[index];
          const sameMetrics = 
            existing.selectedMetrics?.length === report.selectedMetrics?.length &&
            existing.selectedMetrics?.every((m, i) => m === report.selectedMetrics?.[i]);
          
          if (sameMetrics) {
            // Обновляем только изменённые поля, сохраняя ссылку на selectedMetrics
            projectReports[index] = { ...report, selectedMetrics: existing.selectedMetrics };
          } else {
            projectReports[index] = report;
          }
        } else {
          projectReports.unshift(report);
        }
      })
      .addCase(updateReportThunk.rejected, (state, action) => {
        state.mutationStatus = 'idle';
        const message = typeof action.payload === 'string' ? action.payload : action.error.message;
        state.mutationError = message || null;
      })
      .addCase(deleteReportThunk.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(deleteReportThunk.fulfilled, (state, action) => {
        state.mutationStatus = 'idle';
        state.mutationError = null;
        const { projectId, reportId } = action.payload;
        const projectReports = state.reports[projectId];

        if (!projectReports) {
          return;
        }

        state.reports[projectId] = projectReports.filter((item) => item.id !== reportId);

        if (state.currentReportId === reportId) {
          const updated = state.reports[projectId];
          state.currentReportId = updated.length > 0 ? updated[0].id : null;
        }
      })
      .addCase(deleteReportThunk.rejected, (state, action) => {
        state.mutationStatus = 'idle';
        const message = typeof action.payload === 'string' ? action.payload : action.error.message;
        state.mutationError = message || null;
      })
      // === Pin Operations ===
      .addCase(toggleReportPinThunk.fulfilled, (state, action) => {
        const { projectId, reportId, pinned } = action.payload;
        const projectReports = state.reports[projectId];
        if (projectReports) {
          const report = projectReports.find((r) => r.id === reportId);
          if (report) {
            report.pinned = pinned;
          }
        }
      })
      // === Sync Operations ===
      .addCase(startSyncThunk.pending, (state, action) => {
        const { reportId } = action.meta.arg;
        state.syncStatusLoading[reportId] = true;
      })
      .addCase(startSyncThunk.fulfilled, (state, action) => {
        const { reportId, status, dataRange, syncProgress, syncStartedAt, syncCompletedAt, syncError } = action.payload;
        state.syncStatusLoading[reportId] = false;
        // Обновляем отчёт во всех проектах
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.status = status;
            report.dataRange = dataRange ?? undefined;
            report.syncProgress = syncProgress;
            report.syncStartedAt = syncStartedAt;
            report.syncCompletedAt = syncCompletedAt;
            report.syncError = syncError;
          }
        }
      })
      .addCase(startSyncThunk.rejected, (state, action) => {
        const { reportId } = action.meta.arg;
        state.syncStatusLoading[reportId] = false;
      })
      .addCase(extendRangeThunk.pending, (state, action) => {
        const { reportId } = action.meta.arg;
        state.syncStatusLoading[reportId] = true;
        // Immediately set status to 'extending' so UI shows loading state
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.status = 'extending';
          }
        }
      })
      .addCase(extendRangeThunk.fulfilled, (state, action) => {
        const { reportId, status, dataRange, syncProgress, syncStartedAt, syncCompletedAt, syncError } = action.payload;
        state.syncStatusLoading[reportId] = false;
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.status = status;
            report.dataRange = dataRange ?? undefined;
            report.syncProgress = syncProgress;
            report.syncStartedAt = syncStartedAt;
            report.syncCompletedAt = syncCompletedAt;
            report.syncError = syncError;
          }
        }
      })
      .addCase(extendRangeThunk.rejected, (state, action) => {
        const { reportId } = action.meta.arg;
        state.syncStatusLoading[reportId] = false;
        // Reset status back to 'ready' or 'error' on failure
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.status = 'error';
            report.syncError = action.error.message || 'Failed to extend range';
          }
        }
      })
      .addCase(cancelSyncThunk.fulfilled, (state, action) => {
        const { reportId, status } = action.payload;
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.status = status;
            report.syncProgress = 0;
          }
        }
      })
      .addCase(getSyncStatusThunk.pending, (state, action) => {
        const { reportId } = action.meta.arg;
        state.syncStatusLoading[reportId] = true;
      })
      .addCase(getSyncStatusThunk.fulfilled, (state, action) => {
        const { reportId, status, dataRange, syncProgress, syncStartedAt, syncCompletedAt, syncError } = action.payload;
        state.syncStatusLoading[reportId] = false;
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.status = status;
            report.dataRange = dataRange ?? undefined;
            report.syncProgress = syncProgress;
            report.syncStartedAt = syncStartedAt;
            report.syncCompletedAt = syncCompletedAt;
            report.syncError = syncError;
          }
        }
      })
      .addCase(getSyncStatusThunk.rejected, (state, action) => {
        const { reportId } = action.meta.arg;
        state.syncStatusLoading[reportId] = false;
      })
      // === Touch / Restore ===
      .addCase(touchReportThunk.fulfilled, (state, action) => {
        const { reportId, lastOpenedAt } = action.payload;
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.lastOpenedAt = lastOpenedAt;
          }
        }
      })
      .addCase(restoreReportThunk.fulfilled, (state, action) => {
        const { reportId } = action.payload;
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.status = 'ready';
            report.deletedAt = null;
          }
        }
      })
      // === Auto-Refresh ===
      .addCase(toggleAutoRefreshThunk.fulfilled, (state, action) => {
        const { reportId, autoRefresh, limitInfo } = action.payload;
        for (const projectReports of Object.values(state.reports)) {
          const report = projectReports.find(r => r.id === reportId);
          if (report) {
            report.autoRefresh = autoRefresh;
          }
        }
        state.autoRefreshLimit = limitInfo.limit;
        state.autoRefreshCurrent = limitInfo.current;
        state.autoRefreshRemaining = limitInfo.remaining;
      })
      .addCase(getAutoRefreshLimitThunk.fulfilled, (state, action) => {
        state.autoRefreshLimit = action.payload.limit;
        state.autoRefreshCurrent = action.payload.current;
        state.autoRefreshRemaining = action.payload.remaining;
      });
  },
});

export const {
  setReports,
  addReport,
  updateReport,
  deleteReport,
  setCurrentReport,
  updateSelections,
  clearProjectReports,
  updateChartSlot,
  removeChartSlot,
  updateChartBrushRange,
  updateMetricCards,
  updateVisibleChartSlots,
  updateBreakdowns,
  updateReportOptimistic,
  resetReportsState,
} = reportsSlice.actions;

export default reportsSlice.reducer;

// === Селекторы ===
export const selectAutoRefreshLimit = (state: { reports: ReportsState }) => ({
  limit: state.reports.autoRefreshLimit,
  current: state.reports.autoRefreshCurrent,
  remaining: state.reports.autoRefreshRemaining,
});

export const selectSyncStatusLoading = (reportId: string) => 
  (state: { reports: ReportsState }) => state.reports.syncStatusLoading[reportId] || false;

export const selectReportSyncInfo = (projectId: string, reportId: string) =>
  (state: { reports: ReportsState }) => {
    const report = state.reports.reports[projectId]?.find(r => r.id === reportId);
    if (!report) return null;
    return {
      status: report.status,
      dataRange: report.dataRange,
      syncProgress: report.syncProgress,
      syncStartedAt: report.syncStartedAt,
      syncCompletedAt: report.syncCompletedAt,
      syncError: report.syncError,
      autoRefresh: report.autoRefresh,
    };
  };
