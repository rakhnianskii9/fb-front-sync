import { createSlice } from '@reduxjs/toolkit';
import { fetchAds } from './adsThunks';

export interface AdItem {
  id: string; // business identifier (adId)
  dbId: string;
  adId: string;
  adsetId: string;
  name: string | null;
  status: string | null;
  effectiveStatus: string | null;
  creativeId: string | null;
  createdTime: string | null;
  updatedTime: string | null;
  lastSyncedAt: string | null;
}

interface AdsState {
  ads: AdItem[];
  loading: boolean;
  error: string | null;
}

const initialState: AdsState = {
  ads: [],
  loading: false,
  error: null,
};

const adsSlice = createSlice({
  name: 'ads',
  initialState,
  reducers: {
    clearAds: (state) => {
      state.ads = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAds.fulfilled, (state, action) => {
        state.loading = false;
        state.ads = action.payload;
      })
      .addCase(fetchAds.rejected, (state, action) => {
        state.loading = false;
        state.ads = [];
        state.error =
          typeof action.payload === 'string' ? action.payload : action.error.message || 'Failed to load ads';
      });
  },
});

export const { clearAds } = adsSlice.actions;
export default adsSlice.reducer;
