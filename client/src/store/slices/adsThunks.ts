import logger from '@/lib/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi, { type ApiAd } from '../../api/fbAds';
import { getActiveWorkspaceIdFromStorage } from '../../utils/flowiseSession';
import type { AdItem } from './adsSlice';

interface AdsThunkState {
  user: {
    currentUser: {
      activeWorkspaceId?: string;
    } | null;
  };
}

export interface FetchAdsArgs {
  adAccountIds?: string[];
  campaignIds?: string[];
  adsetIds?: string[];
  adIds?: string[];
}

const mapApiAdToState = (item: ApiAd): AdItem => ({
  id: item.adId,
  dbId: item.id,
  adId: item.adId,
  adsetId: item.adsetId,
  name: item.name,
  status: item.status,
  effectiveStatus: item.effectiveStatus,
  creativeId: item.creativeId,
  createdTime: item.createdTime,
  updatedTime: item.updatedTime,
  lastSyncedAt: item.lastSyncedAt,
});

export const fetchAds = createAsyncThunk<AdItem[], FetchAdsArgs | undefined, { rejectValue: string }>(
  'ads/fetchAll',
  async (filters, { getState, rejectWithValue }) => {
    try {
      const state = getState() as AdsThunkState;
      const workspaceId =
        state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

      if (!workspaceId) {
        throw new Error('Workspace is not selected');
      }

      const normalizedFilters: FetchAdsArgs = {
        adAccountIds: filters?.adAccountIds && filters.adAccountIds.length > 0 ? filters.adAccountIds : undefined,
        campaignIds: filters?.campaignIds && filters.campaignIds.length > 0 ? filters.campaignIds : undefined,
        adsetIds: filters?.adsetIds && filters.adsetIds.length > 0 ? filters.adsetIds : undefined,
        adIds: filters?.adIds && filters.adIds.length > 0 ? filters.adIds : undefined,
      };

      if (!normalizedFilters.adAccountIds || normalizedFilters.adAccountIds.length === 0) {
        return [];
      }

      const promises = normalizedFilters.adAccountIds.map(async accountId => {
        try {
          return await fbAdsApi.marketing.getAds(workspaceId, { ...normalizedFilters, adAccountIds: [accountId] });
        } catch (e) {
          logger.error(`Failed to fetch ads for account ${accountId}`, e);
          return [];
        }
      });

      const responses = await Promise.all(promises);
      const allAds = responses.flat();

      return allAds.map(mapApiAdToState);
    } catch (error: any) {
      logger.error('[Ads Thunk] Fetch failed:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to load ads';
      return rejectWithValue(message);
    }
  }
);
