import { createSlice } from '@reduxjs/toolkit';
import { fetchCreatives, fetchCreativeInsights } from './creativesThunks';

export interface CreativeItem {
  id: string; // UUID из БД
  creativeId: string; // Facebook creative ID
  adAccountId: string | null;
  name: string | null;
  title: string | null;
  body: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  callToActionType: string | null;
  lastSyncedAt: string | null;
}

interface CreativesState {
  creatives: CreativeItem[];
  loading: boolean;
  error: string | null;
  // Метрики креативов: { adId: { breakdown_type: [{ asset, metrics }] } }
  insights: Record<string, Record<string, any[]>>;
  insightsLoading: boolean;
  insightsError: string | null;
}

const initialState: CreativesState = {
  creatives: [],
  loading: false,
  error: null,
  insights: {},
  insightsLoading: false,
  insightsError: null,
};

const creativesSlice = createSlice({
  name: 'creatives',
  initialState,
  reducers: {
    clearCreatives: (state) => {
      state.creatives = [];
      state.error = null;
    },
    clearCreativeInsights: (state) => {
      state.insights = {};
      state.insightsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCreatives
      .addCase(fetchCreatives.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCreatives.fulfilled, (state, action) => {
        state.loading = false;
        state.creatives = action.payload;
      })
      .addCase(fetchCreatives.rejected, (state, action) => {
        state.loading = false;
        state.creatives = [];
        state.error =
          typeof action.payload === 'string' ? action.payload : action.error.message || 'Failed to load creatives';
      })
      // fetchCreativeInsights
      .addCase(fetchCreativeInsights.pending, (state) => {
        state.insightsLoading = true;
        state.insightsError = null;
      })
      .addCase(fetchCreativeInsights.fulfilled, (state, action) => {
        state.insightsLoading = false;
        state.insights = action.payload;
      })
      .addCase(fetchCreativeInsights.rejected, (state, action) => {
        state.insightsLoading = false;
        state.insights = {};
        state.insightsError =
          typeof action.payload === 'string' ? action.payload : action.error.message || 'Failed to load creative insights';
      });
  },
});

export const { clearCreatives, clearCreativeInsights } = creativesSlice.actions;
export default creativesSlice.reducer;
