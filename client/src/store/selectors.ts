import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';

const EMPTY_ARRAY: never[] = [];

export const selectCurrentProjectId = (state: RootState) => state.projects.currentProjectId;
export const selectProjects = (state: RootState) => state.projects.projects;
export const selectAllReports = (state: RootState) => state.reports.reports;
export const selectCurrentReportId = (state: RootState) => state.reports.currentReportId;
export const selectAllMetricPresets = (state: RootState) => state.metricPresets.presets;

export const selectCurrentProjectReports = createSelector(
  [selectCurrentProjectId, selectAllReports],
  (currentProjectId, allReports) => {
    if (!currentProjectId) return EMPTY_ARRAY;
    return allReports[currentProjectId] || EMPTY_ARRAY;
  }
);

export const selectCurrentProject = createSelector(
  [selectCurrentProjectId, selectProjects],
  (currentProjectId, projects) => {
    if (!currentProjectId) return null;
    return projects.find(p => p.id === currentProjectId) || null;
  }
);

export const selectCurrentReport = createSelector(
  [selectCurrentProjectReports, selectCurrentReportId],
  (reports, currentReportId) => {
    if (!currentReportId) return null;
    return reports.find(r => r.id === currentReportId) || null;
  }
);

export const selectCurrentProjectMetricPresets = createSelector(
  [selectCurrentProjectId, selectAllMetricPresets],
  (currentProjectId, allPresets) => {
    if (!currentProjectId) return EMPTY_ARRAY;
    return allPresets[currentProjectId] || EMPTY_ARRAY;
  }
);

export const selectAllNotes = (state: RootState) => state.notes.notes;

export const selectCurrentProjectNotes = createSelector(
  [selectCurrentProjectId, selectAllNotes],
  (currentProjectId, allNotes) => {
    if (!currentProjectId) return EMPTY_ARRAY;
    return allNotes.filter(n => n.projectId === currentProjectId);
  }
);

export const selectUserNotes = createSelector(
  [selectCurrentProjectNotes],
  (notes) => notes.filter(n => n.type === 'user')
);

export const selectAINotes = createSelector(
  [selectCurrentProjectNotes],
  (notes) => notes.filter(n => n.type === 'ai')
);

export const selectAccounts = (state: RootState) => state.accounts.accounts || [];
export const selectAccountsConnectionStatus = (state: RootState) => state.accounts.isConnected;
export const selectAccountsLastSync = (state: RootState) => state.accounts.lastSync;
export const selectAccountsLoading = (state: RootState) => state.accounts.loading;
export const selectAccountsError = (state: RootState) => state.accounts.error;

export const selectCampaigns = (state: RootState) => state.campaigns.campaigns;
export const selectCampaignsLoading = (state: RootState) => state.campaigns.loading;
export const selectCampaignsError = (state: RootState) => state.campaigns.error;

export const selectAdSets = (state: RootState) => state.adsets.adsets;
export const selectAdSetsLoading = (state: RootState) => state.adsets.loading;
export const selectAdSetsError = (state: RootState) => state.adsets.error;

export const selectAds = (state: RootState) => state.ads.ads;
export const selectAdsLoading = (state: RootState) => state.ads.loading;
export const selectAdsError = (state: RootState) => state.ads.error;

export const selectCreatives = (state: RootState) => state.creatives.creatives;
export const selectCreativesLoading = (state: RootState) => state.creatives.loading;
export const selectCreativesError = (state: RootState) => state.creatives.error;
export const selectCreativeInsights = (state: RootState) => state.creatives.insights;
export const selectCreativeInsightsLoading = (state: RootState) => state.creatives.insightsLoading;
export const selectCreativeInsightsError = (state: RootState) => state.creatives.insightsError;

export const selectPermissionGroups = (state: RootState) => state.permissions.groups;
export const selectEnabledPermissionGroups = createSelector(
  [selectPermissionGroups],
  (groups) => groups.filter(g => g.enabled)
);

export const selectPixels = (state: RootState) => state.pixels.pixels || [];
export const selectDatasetInfo = (state: RootState) => state.pixels.datasetInfo || [];
export const selectPixelsLastSync = (state: RootState) => state.pixels.lastSync;
export const selectPixelsTestEventState = (state: RootState) => state.pixels.testEvent;

export const selectAudiences = (state: RootState) => state.audiences.audiences || [];
export const selectAudiencesLastSync = (state: RootState) => state.audiences.lastSync;

export const selectUserSettingsData = (state: RootState) => state.settings.userSettings;
export const selectSystemUsers = (state: RootState) => state.settings.systemUsers;
export const selectSettingsLoading = (state: RootState) => state.settings.loading;
export const selectSettingsError = (state: RootState) => state.settings.error;

export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectIsAuthenticated = (state: RootState) => state.user.isAuthenticated;
export const selectUserSettings = (state: RootState) => state.user.currentUser?.settings;

export const selectSyncStatusCurrent = (state: RootState) => state.syncStatus.current;
export const selectSyncStatusHistory = (state: RootState) => state.syncStatus.history;
export const selectSyncStatusLoading = (state: RootState) => state.syncStatus.loading;
export const selectSyncStatusError = (state: RootState) => state.syncStatus.error;

export const selectCapiEventsState = (state: RootState) => state.capiEvents;
export const selectCapiEvents = (state: RootState) => state.capiEvents.items;
export const selectCapiEventsTotal = (state: RootState) => state.capiEvents.total;
export const selectCapiEventsLimit = (state: RootState) => state.capiEvents.filters.limit;
export const selectCapiEventsOffset = (state: RootState) => state.capiEvents.filters.offset;
export const selectCapiEventsFilters = (state: RootState) => state.capiEvents.filters;
export const selectCapiEventsLoading = (state: RootState) => state.capiEvents.loading;
export const selectCapiEventsError = (state: RootState) => state.capiEvents.error;
export const selectCapiEventsDetail = (state: RootState) => state.capiEvents.detail;
export const selectCapiEventsSelectedId = (state: RootState) => state.capiEvents.selectedEventId;

// Селекторы для доступных метрик (на основе загруженных данных)
export const selectAvailableMetricIds = (state: RootState) => state.availableMetrics.metricIds;
