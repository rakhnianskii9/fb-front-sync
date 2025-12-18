import logger from '@/lib/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi, { type ApiAdSet } from '../../api/fbAds';
import { getActiveWorkspaceIdFromStorage } from '../../utils/flowiseSession';
import type { AdSet } from './adsetsSlice';

interface AdSetsThunkState {
  user: {
    currentUser: {
      activeWorkspaceId?: string;
    } | null;
  };
}

export interface FetchAdSetsArgs {
  adAccountIds?: string[];
  campaignIds?: string[];
  adsetIds?: string[];
}

const mapApiAdSetToState = (item: ApiAdSet): AdSet => ({
  id: item.adsetId,
  dbId: item.id,
  adsetId: item.adsetId,
  campaignId: item.campaignId,
  name: item.name,
  status: item.status,
  effectiveStatus: item.effectiveStatus,
  optimizationGoal: item.optimizationGoal,
  billingEvent: item.billingEvent,
  bidAmount: item.bidAmount,
  dailyBudget: item.dailyBudget,
  lifetimeBudget: item.lifetimeBudget,
  startTime: item.startTime,
  endTime: item.endTime,
  createdTime: item.createdTime,
  updatedTime: item.updatedTime,
  lastSyncedAt: item.lastSyncedAt,
});

export const fetchAdSets = createAsyncThunk<AdSet[], FetchAdSetsArgs | undefined, { rejectValue: string }>(
  'adsets/fetchAll',
  async (filters, { getState, rejectWithValue }) => {
    try {
      const state = getState() as AdSetsThunkState;
      const workspaceId =
        state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

      if (!workspaceId) {
        throw new Error('Workspace is not selected');
      }

      const normalizedFilters: FetchAdSetsArgs = {
        adAccountIds: filters?.adAccountIds && filters.adAccountIds.length > 0 ? filters.adAccountIds : undefined,
        campaignIds: filters?.campaignIds && filters.campaignIds.length > 0 ? filters.campaignIds : undefined,
        adsetIds: filters?.adsetIds && filters.adsetIds.length > 0 ? filters.adsetIds : undefined,
      };

      if (!normalizedFilters.adAccountIds || normalizedFilters.adAccountIds.length === 0) {
        return [];
      }

      const promises = normalizedFilters.adAccountIds.map(async accountId => {
        try {
          return await fbAdsApi.marketing.getAdSets(workspaceId, { ...normalizedFilters, adAccountIds: [accountId] });
        } catch (e) {
          logger.error(`Failed to fetch adsets for account ${accountId}`, e);
          return [];
        }
      });

      const responses = await Promise.all(promises);
      const allAdSets = responses.flat();

      return allAdSets.map(mapApiAdSetToState);
    } catch (error: any) {
      logger.error('[AdSets Thunk] Fetch failed:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to load ad sets';
      return rejectWithValue(message);
    }
  }
);
