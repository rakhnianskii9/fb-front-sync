import { createSlice } from '@reduxjs/toolkit';
import { fetchCampaigns } from './campaignsThunks';

export interface Campaign {
  id: string; // business identifier (campaignId)
  dbId: string;
  campaignId: string;
  adAccountId: string;
  name: string | null;
  status: string | null;
  objective: string | null;
  effectiveStatus: string | null;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  startTime: string | null;
  stopTime: string | null;
  createdTime: string | null;
  updatedTime: string | null;
  lastSyncedAt: string | null;
}

interface CampaignsState {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
}

const initialState: CampaignsState = {
  campaigns: [],
  loading: false,
  error: null,
};

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    clearCampaigns: (state) => {
      state.campaigns = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = action.payload;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.campaigns = [];
        state.error =
          typeof action.payload === 'string' ? action.payload : action.error.message || 'Failed to load campaigns';
      });
  },
});

export const { clearCampaigns } = campaignsSlice.actions;
export default campaignsSlice.reducer;
