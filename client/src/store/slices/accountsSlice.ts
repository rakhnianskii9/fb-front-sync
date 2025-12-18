import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchAdAccounts } from './accountsThunks';

export interface AdAccount {
  id: string;
  dbId: string;
  adAccountId: string;
  name: string | null;
  currency: string | null;
  status: string | null;
  spendCap: string | null;
  balance: string | null;
  campaigns: number;
  activeCampaigns: number;
  assetType: string;
  lastSyncedAt: string | null;
  createdDate: string | null;
  updatedDate: string | null;
}

interface AccountsState {
  accounts: AdAccount[];
  isConnected: boolean;
  lastSync: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AccountsState = {
  accounts: [],
  isConnected: false,
  lastSync: null,
  loading: false,
  error: null,
};

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setAccounts: (state, action: PayloadAction<AdAccount[]>) => {
      state.accounts = action.payload;
      state.lastSync = new Date().toISOString();
      state.isConnected = action.payload.length > 0;
    },
    addAccount: (state, action: PayloadAction<AdAccount>) => {
      state.accounts.push(action.payload);
      state.isConnected = state.accounts.length > 0;
    },
    updateAccount: (state, action: PayloadAction<{ id: string; updates: Partial<AdAccount> }>) => {
      const index = state.accounts.findIndex((acc) => acc.id === action.payload.id);
      if (index !== -1) {
        state.accounts[index] = { ...state.accounts[index], ...action.payload.updates };
      }
    },
    deleteAccount: (state, action: PayloadAction<string>) => {
      state.accounts = state.accounts.filter((acc) => acc.id !== action.payload);
      state.isConnected = state.accounts.length > 0;
    },
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    syncAccounts: (state) => {
      state.lastSync = new Date().toISOString();
    },
    resetAccountsState: () => ({
      accounts: [],
      isConnected: false,
      lastSync: null,
      loading: false,
      error: null,
    })
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload;
        state.isConnected = action.payload.length > 0;
        state.lastSync = new Date().toISOString();
      })
      .addCase(fetchAdAccounts.rejected, (state, action) => {
        state.loading = false;
        state.accounts = [];
        state.isConnected = false;
        state.error =
          typeof action.payload === 'string'
            ? action.payload
            : action.error.message || 'Failed to load ad accounts';
      });
  },
});

export const {
  setAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  setConnectionStatus,
  syncAccounts,
  resetAccountsState,
} = accountsSlice.actions;

export default accountsSlice.reducer;
