import logger from '@/lib/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi, { type ApiAdAccount } from '../../api/fbAds';
import { getActiveWorkspaceIdFromStorage } from '../../utils/flowiseSession';
import type { AdAccount } from './accountsSlice';

interface AccountsThunkState {
    user: {
        currentUser: {
            activeWorkspaceId?: string;
        } | null;
    };
}

const mapApiAdAccountToState = (account: ApiAdAccount): AdAccount => ({
    id: account.adAccountId || account.id,
    dbId: account.id,
    adAccountId: account.adAccountId,
    name: account.name,
    currency: account.currency,
    status: account.status,
    spendCap: account.spendCap,
    balance: account.balance,
    campaigns: account.campaigns ?? 0,
    activeCampaigns: account.activeCampaigns ?? 0,
    assetType: account.assetType,
    lastSyncedAt: account.lastSyncedAt,
    createdDate: account.createdDate,
    updatedDate: account.updatedDate,
});

export const fetchAdAccounts = createAsyncThunk<AdAccount[], void, { rejectValue: string }>(
    'accounts/fetchAll',
    async (_, { getState, rejectWithValue }) => {
        try {
            const state = getState() as AccountsThunkState;
            const workspaceId =
                state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

            if (!workspaceId) {
                throw new Error('Workspace is not selected');
            }

            const response = await fbAdsApi.adAccounts.getAll(workspaceId);
            return response.map(mapApiAdAccountToState);
        } catch (error: any) {
            logger.error('[Accounts Thunk] Fetch failed:', error);
            const message = error?.response?.data?.message || error.message || 'Failed to load ad accounts';
            return rejectWithValue(message);
        }
    }
);
