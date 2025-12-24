import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ApiFacebookSyncStatusSnapshot } from '../../api/fbAds';
import { fetchSyncStatus } from '../thunks/syncStatusThunks';

export interface SyncStatusState {
  current: ApiFacebookSyncStatusSnapshot | null;
  history: ApiFacebookSyncStatusSnapshot[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: SyncStatusState = {
  current: null,
  history: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

const syncStatusSlice = createSlice({
  name: 'syncStatus',
  initialState,
  reducers: {
    /**
     * Полностью очищает состояние синхронизации при смене workspace.
     */
    resetSyncStatus: () => ({ ...initialState }),
    /**
     * Применяет снапшот из SSE или других источников и сохраняет историю.
     */
    applySyncSnapshot: (state, action: PayloadAction<ApiFacebookSyncStatusSnapshot>) => {
      const snapshot = action.payload;
      const historyWithoutCurrent = state.history.filter((item) => item.jobId !== snapshot.jobId);
      state.history = [snapshot, ...historyWithoutCurrent].slice(0, 20);

      const shouldReplaceCurrent =
        !state.current ||
        state.current.jobId === snapshot.jobId ||
        (snapshot.updatedAt && state.current.updatedAt && snapshot.updatedAt > state.current.updatedAt);

      if (shouldReplaceCurrent) {
        state.current = snapshot;
      }

      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSyncStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSyncStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.current;
        state.history = action.payload.history || [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchSyncStatus.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === 'string'
            ? action.payload
            : action.error.message || 'Failed to get sync status';
      });
  },
});

export const { resetSyncStatus, applySyncSnapshot } = syncStatusSlice.actions;
export default syncStatusSlice.reducer;
