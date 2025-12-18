import logger from '@/lib/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi, { type ApiCreative } from '../../api/fbAds';
import { getActiveWorkspaceIdFromStorage } from '../../utils/flowiseSession';
import type { CreativeItem } from './creativesSlice';

interface CreativesThunkState {
  user: {
    currentUser: {
      activeWorkspaceId?: string;
    } | null;
  };
}

export interface FetchCreativesArgs {
  adAccountIds?: string[];
  adIds?: string[];
}

export interface FetchCreativeInsightsArgs {
  adIds: string[];
  dateFrom: string;
  dateTo: string;
}

const mapApiCreativeToState = (item: ApiCreative): CreativeItem => ({
  id: item.id,
  creativeId: item.creativeId,
  adAccountId: item.adAccountId ?? null,
  name: item.name ?? null,
  title: item.title ?? null,
  body: item.body ?? null,
  linkUrl: item.linkUrl ?? null,
  imageUrl: item.imageUrl ?? null,
  videoId: item.videoId ?? null,
  thumbnailUrl: item.thumbnailUrl ?? null,
  callToActionType: item.callToActionType ?? null,
  lastSyncedAt: item.lastSyncedAt ?? null,
});

export const fetchCreatives = createAsyncThunk<CreativeItem[], FetchCreativesArgs | undefined, { rejectValue: string }>(
  'creatives/fetchAll',
  async (filters, { getState, rejectWithValue }) => {
    try {
      const state = getState() as CreativesThunkState;
      const workspaceId =
        state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

      if (!workspaceId) {
        throw new Error('Workspace is not selected');
      }

      const adAccountIds = filters?.adAccountIds && filters.adAccountIds.length > 0 ? filters.adAccountIds : undefined;
      const adIds = filters?.adIds && filters.adIds.length > 0 ? filters.adIds : undefined;

      // Если есть adIds, делаем один запрос — backend найдёт креативы по связи ad→creative
      if (adIds && adIds.length > 0) {
        const creatives = await fbAdsApi.marketing.getCreatives(workspaceId, { 
          adIds 
        });
        return creatives.map(mapApiCreativeToState);
      }

      // Если нет adIds, но есть accountIds — загружаем все креативы аккаунтов
      if (!adAccountIds || adAccountIds.length === 0) {
        return [];
      }

      // Загружаем креативы для каждого аккаунта параллельно
      const promises = adAccountIds.map(async (accountId) => {
        try {
          return await fbAdsApi.marketing.getCreatives(workspaceId, { 
            adAccountId: accountId
          });
        } catch (e) {
          logger.error(`Failed to fetch creatives for account ${accountId}`, e);
          return [];
        }
      });

      const responses = await Promise.all(promises);
      const allCreatives = responses.flat();

      return allCreatives.map(mapApiCreativeToState);
    } catch (error: any) {
      logger.error('[Creatives Thunk] Fetch failed:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to load creatives';
      return rejectWithValue(message);
    }
  }
);

/**
 * Загрузить метрики креативов через Asset Breakdowns
 * Возвращает: { adId: { breakdown_type: [{ asset, impressions, clicks, spend, reach, actions, action_values }] } }
 */
export const fetchCreativeInsights = createAsyncThunk<
  Record<string, Record<string, any[]>>, 
  FetchCreativeInsightsArgs, 
  { rejectValue: string }
>(
  'creatives/fetchInsights',
  async (args, { getState, rejectWithValue }) => {
    try {
      const state = getState() as CreativesThunkState;
      const workspaceId =
        state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

      if (!workspaceId) {
        throw new Error('Workspace is not selected');
      }

      if (!args.adIds || args.adIds.length === 0) {
        return {};
      }

      const insights = await fbAdsApi.marketing.getCreativeInsights(workspaceId, {
        adIds: args.adIds,
        dateFrom: args.dateFrom,
        dateTo: args.dateTo,
      });

      return insights;
    } catch (error: any) {
      logger.error('[Creatives Insights Thunk] Fetch failed:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to load creative insights';
      return rejectWithValue(message);
    }
  }
);
