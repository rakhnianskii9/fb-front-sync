import logger from '@/lib/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi, { type ApiFacebookSyncStatusResponse } from '../../api/fbAds';
import { getActiveWorkspaceIdFromStorage } from '../../utils/flowiseSession';

interface SyncStatusThunkState {
  user: {
    currentUser: {
      activeWorkspaceId?: string;
    } | null;
  };
}

interface FetchSyncStatusArgs {
  limit?: number;
}

export const fetchSyncStatus = createAsyncThunk<
  ApiFacebookSyncStatusResponse,
  FetchSyncStatusArgs | undefined,
  { state: SyncStatusThunkState; rejectValue: string }
>('syncStatus/fetchHistory', async (args, { getState, rejectWithValue }) => {
  try {
    const state = getState() as SyncStatusThunkState;
    const workspaceId =
      state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

    if (!workspaceId) {
      throw new Error('Workspace is not selected');
    }

    const response = await fbAdsApi.syncStatus.getHistory(workspaceId, args?.limit);
    return response;
  } catch (error: any) {
    logger.error('[SyncStatus] Fetch failed:', error);
    const message = error?.response?.data?.message || error.message || 'Failed to load sync status';
    return rejectWithValue(message);
  }
});
