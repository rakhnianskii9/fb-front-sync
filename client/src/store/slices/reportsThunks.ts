import logger from '@/lib/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi, { type CreateReportRequest, type UpdateReportRequest } from '../../api/fbAds';
import type { RootState } from '../index';
import type { Report, ReportStatus, DataRangeInfo } from './reportsSlice';
import { mapApiReportToReport } from './reportsMapper';
import { getActiveWorkspaceIdFromStorage } from '../../utils/flowiseSession';

const getWorkspaceId = (getState: () => unknown): string => {
  const state = getState() as RootState;
  const workspaceId =
    state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

  if (!workspaceId) {
    throw new Error('Workspace is not selected');
  }

  return workspaceId;
};

const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return 'Failed to process report request';
};

export const fetchReportsByProject = createAsyncThunk<
  { projectId: string; reports: Report[] },
  { projectId: string },
  { rejectValue: string }
>('reports/fetchByProject', async ({ projectId }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const apiReports = await fbAdsApi.reports.getAll(workspaceId, projectId);
    const reports = apiReports.map(mapApiReportToReport);
    return { projectId, reports };
  } catch (error: any) {
    logger.error('[Reports Thunk] Fetch failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

type CreateReportPayload = {
  projectId: string;
} & Omit<CreateReportRequest, 'workspaceId' | 'projectId'>;

export const createReportThunk = createAsyncThunk<
  { projectId: string; report: Report },
  CreateReportPayload,
  { rejectValue: string }
>('reports/create', async ({ projectId, ...data }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const apiReport = await fbAdsApi.reports.create({
      projectId,
      workspaceId,
      ...data,
    });
    const report = mapApiReportToReport(apiReport);
    return { projectId, report };
  } catch (error: any) {
    logger.error('[Reports Thunk] Create failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

export type UpdateReportPayload = {
  projectId: string;
  reportId: string;
  updates: Omit<UpdateReportRequest, 'workspaceId'>;
};

export const updateReportThunk = createAsyncThunk<
  { projectId: string; report: Report },
  UpdateReportPayload,
  { rejectValue: string }
>('reports/update', async ({ projectId, reportId, updates }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const apiReport = await fbAdsApi.reports.update(reportId, {
      workspaceId,
      ...updates,
    });

    // Some backend responses don't echo optional fields (like tags) back.
    // If user explicitly updated tags, keep the requested value so UI reflects it immediately.
    const report = mapApiReportToReport(apiReport);
    if (updates.tags !== undefined) {
      report.tags = Array.isArray(updates.tags) ? updates.tags : [];
    }
    return { projectId, report };
  } catch (error: any) {
    logger.error('[Reports Thunk] Update failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// Toggle pin status for a report
export const toggleReportPinThunk = createAsyncThunk<
  { projectId: string; reportId: string; pinned: boolean },
  { projectId: string; reportId: string },
  { rejectValue: string }
>('reports/togglePin', async ({ projectId, reportId }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const state = getState() as any;
    const reports = state.reports?.reports?.[projectId] || [];
    const report = reports.find((r: any) => r.id === reportId);
    const newPinned = !report?.pinned;
    
    await fbAdsApi.reports.update(reportId, { workspaceId, pinned: newPinned });
    return { projectId, reportId, pinned: newPinned };
  } catch (error: any) {
    logger.error('[Reports Thunk] Toggle pin failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

type DeleteReportPayload = {
  projectId: string;
  reportId: string;
};

export const deleteReportThunk = createAsyncThunk<
  { projectId: string; reportId: string },
  DeleteReportPayload,
  { rejectValue: string }
>('reports/delete', async ({ projectId, reportId }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    await fbAdsApi.reports.delete(reportId, workspaceId);
    return { projectId, reportId };
  } catch (error: any) {
    logger.error('[Reports Thunk] Delete failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// === Sync Operations ===

type StartSyncPayload = {
  projectId: string;
  reportId: string;
  configId: string;
  days?: number;
  priority?: number;
};

type SyncStatusResult = {
  reportId: string;
  status: ReportStatus;
  dataRange: DataRangeInfo | null;
  syncProgress: number;
  syncStartedAt: string | null;
  syncCompletedAt: string | null;
  syncError: string | null;
};

// Запуск синхронизации отчёта
export const startSyncThunk = createAsyncThunk<
  SyncStatusResult,
  StartSyncPayload,
  { rejectValue: string }
>('reports/startSync', async ({ projectId, reportId, configId, days, priority }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    // Запускаем синхронизацию
    await fbAdsApi.reports.startSync(reportId, {
      workspaceId,
      configId,
      days,
      priority
    });
    // Возвращаем начальный статус syncing (реальный статус будет через polling)
    return {
      reportId,
      status: 'syncing' as ReportStatus,
      dataRange: null,
      syncProgress: 0,
      syncStartedAt: new Date().toISOString(),
      syncCompletedAt: null,
      syncError: null
    };
  } catch (error: any) {
    logger.error('[Reports Thunk] Start sync failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// Расширение диапазона данных
export const extendRangeThunk = createAsyncThunk<
  SyncStatusResult,
  { projectId: string; reportId: string; targetDays: number; configId?: string },
  { rejectValue: string }
>('reports/extendRange', async ({ projectId, reportId, targetDays, configId }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    // Запускаем расширение (configId опционален — бэкенд получит его сам)
    await fbAdsApi.reports.extendRange(reportId, {
      workspaceId,
      ...(configId && { configId }),
      targetDays
    });
    // Возвращаем начальный статус extending (реальный статус будет через polling)
    return {
      reportId,
      status: 'extending' as ReportStatus,
      dataRange: null,
      syncProgress: 0,
      syncStartedAt: new Date().toISOString(),
      syncCompletedAt: null,
      syncError: null
    };
  } catch (error: any) {
    logger.error('[Reports Thunk] Extend range failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// Отмена синхронизации
export const cancelSyncThunk = createAsyncThunk<
  { reportId: string; status: ReportStatus },
  { projectId: string; reportId: string; reason?: string },
  { rejectValue: string }
>('reports/cancelSync', async ({ projectId, reportId, reason }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    await fbAdsApi.reports.cancelSync(reportId, workspaceId, reason);
    return { reportId, status: 'ready' as ReportStatus };
  } catch (error: any) {
    logger.error('[Reports Thunk] Cancel sync failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// Получение статуса синхронизации
export const getSyncStatusThunk = createAsyncThunk<
  SyncStatusResult,
  { reportId: string },
  { rejectValue: string }
>('reports/getSyncStatus', async ({ reportId }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const result = await fbAdsApi.reports.getSyncStatus(reportId, workspaceId);
    return {
      reportId,
      status: result.status as ReportStatus,
      dataRange: result.dataRange || null,
      syncProgress: result.syncProgress || 0,
      syncStartedAt: result.syncStartedAt || null,
      syncCompletedAt: result.syncCompletedAt || null,
      syncError: result.syncError || null
    };
  } catch (error: any) {
    logger.error('[Reports Thunk] Get sync status failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// === Touch / Restore Operations ===

// Обновление lastOpenedAt при открытии отчёта
export const touchReportThunk = createAsyncThunk<
  { reportId: string; lastOpenedAt: string },
  { reportId: string },
  { rejectValue: string }
>('reports/touch', async ({ reportId }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const result = await fbAdsApi.reports.touch(reportId, workspaceId);
    return { reportId, lastOpenedAt: result.lastOpenedAt };
  } catch (error: any) {
    logger.error('[Reports Thunk] Touch failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// Восстановление удалённого отчёта
export const restoreReportThunk = createAsyncThunk<
  { projectId: string; reportId: string },
  { projectId: string; reportId: string },
  { rejectValue: string }
>('reports/restore', async ({ projectId, reportId }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    await fbAdsApi.reports.restore(reportId, workspaceId);
    return { projectId, reportId };
  } catch (error: any) {
    logger.error('[Reports Thunk] Restore failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// === Auto-Refresh Operations ===

type AutoRefreshLimitResult = {
  limit: number;
  current: number;
  remaining: number;
};

// Переключение auto-refresh
export const toggleAutoRefreshThunk = createAsyncThunk<
  { reportId: string; autoRefresh: boolean; limitInfo: AutoRefreshLimitResult },
  { reportId: string; enabled: boolean },
  { rejectValue: string }
>('reports/toggleAutoRefresh', async ({ reportId, enabled }, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const result = await fbAdsApi.reports.toggleAutoRefresh(reportId, {
      workspaceId,
      enabled
    });
    return {
      reportId,
      autoRefresh: result.autoRefresh,
      limitInfo: {
        limit: result.limit,
        current: result.current,
        remaining: result.remaining
      }
    };
  } catch (error: any) {
    logger.error('[Reports Thunk] Toggle auto-refresh failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});

// Получение лимита auto-refresh для workspace
export const getAutoRefreshLimitThunk = createAsyncThunk<
  AutoRefreshLimitResult,
  void,
  { rejectValue: string }
>('reports/getAutoRefreshLimit', async (_, { getState, rejectWithValue }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    return await fbAdsApi.reports.getAutoRefreshLimit(workspaceId);
  } catch (error: any) {
    logger.error('[Reports Thunk] Get auto-refresh limit failed:', error);
    return rejectWithValue(getErrorMessage(error));
  }
});
