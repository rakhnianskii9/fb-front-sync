import logger from '@/lib/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi, { type ApiCampaign } from '../../api/fbAds';
import { getActiveWorkspaceIdFromStorage } from '../../utils/flowiseSession';
import type { Campaign } from './campaignsSlice';

interface CampaignsThunkState {
  user: {
    currentUser: {
      activeWorkspaceId?: string;
    } | null;
  };
}

export interface FetchCampaignsArgs {
  adAccountIds?: string[];
  campaignIds?: string[];
}

const mapApiCampaignToState = (item: ApiCampaign): Campaign => ({
  id: item.campaignId,
  dbId: item.id,
  campaignId: item.campaignId,
  adAccountId: item.adAccountId,
  name: item.name,
  status: item.status,
  objective: item.objective,
  effectiveStatus: item.effectiveStatus,
  dailyBudget: item.dailyBudget,
  lifetimeBudget: item.lifetimeBudget,
  startTime: item.startTime,
  stopTime: item.stopTime,
  createdTime: item.createdTime,
  updatedTime: item.updatedTime,
  lastSyncedAt: item.lastSyncedAt,
});

export const fetchCampaigns = createAsyncThunk<Campaign[], FetchCampaignsArgs | undefined, { rejectValue: string }>(
  'campaigns/fetchAll',
  async (filters, { getState, rejectWithValue }) => {
    try {
      const state = getState() as CampaignsThunkState;
      const workspaceId =
        state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

      if (!workspaceId) {
        throw new Error('Workspace is not selected');
      }

      const normalizedFilters: FetchCampaignsArgs = {
        adAccountIds: filters?.adAccountIds && filters.adAccountIds.length > 0 ? filters.adAccountIds : undefined,
        campaignIds: filters?.campaignIds && filters.campaignIds.length > 0 ? filters.campaignIds : undefined,
      };

      if (!normalizedFilters.adAccountIds || normalizedFilters.adAccountIds.length === 0) {
        return [];
      }

      const promises = normalizedFilters.adAccountIds.map(async accountId => {
        try {
          return await fbAdsApi.marketing.getCampaigns(workspaceId, { ...normalizedFilters, adAccountIds: [accountId] });
        } catch (e) {
          logger.error(`Failed to fetch campaigns for account ${accountId}`, e);
          return [];
        }
      });

      const responses = await Promise.all(promises);
      const allCampaigns = responses.flat();

      return allCampaigns.map(mapApiCampaignToState);
    } catch (error: any) {
      logger.error('[Campaigns Thunk] Fetch failed:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to load campaigns';
      return rejectWithValue(message);
    }
  }
);
