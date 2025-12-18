import { createSlice } from '@reduxjs/toolkit';
import { fetchAdSets } from './adsetsThunks';

export interface AdSet {
  id: string; // business identifier (adsetId)
  dbId: string;
  adsetId: string;
  campaignId: string;
  name: string | null;
  status: string | null;
  effectiveStatus: string | null;
  optimizationGoal: string | null;
  billingEvent: string | null;
  bidAmount: string | null;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  startTime: string | null;
  endTime: string | null;
  createdTime: string | null;
  updatedTime: string | null;
  lastSyncedAt: string | null;
}

interface AdSetsState {
  adsets: AdSet[];
  loading: boolean;
  error: string | null;
}

const initialState: AdSetsState = {
  adsets: [],
  loading: false,
  error: null,
};

const adsetsSlice = createSlice({
  name: 'adsets',
  initialState,
  reducers: {
    clearAdSets: (state) => {
      state.adsets = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdSets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdSets.fulfilled, (state, action) => {
        state.loading = false;
        state.adsets = action.payload;
      })
      .addCase(fetchAdSets.rejected, (state, action) => {
        state.loading = false;
        state.adsets = [];
        state.error =
          typeof action.payload === 'string' ? action.payload : action.error.message || 'Failed to load ad sets';
      });
  },
});

export const { clearAdSets } = adsetsSlice.actions;
export default adsetsSlice.reducer;
