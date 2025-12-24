import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchUserSettings, fetchSystemUsers, updateSystemUserToken } from '../thunks/settingsThunks';

export interface SystemUser {
  id: string;
  systemUserId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: string;
  tokenMasked: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  businessId: string | null;
  businessName: string | null;
  primaryPageName: string | null;
  connectionStatus: 'active' | 'pending' | 'error';
  lastSyncedAt: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
  selectedPixelId?: string | null;
}

interface SettingsState {
  userSettings: UserSettings | null;
  systemUsers: SystemUser[];
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  userSettings: null,
  systemUsers: [],
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setUserSettings: (state, action: PayloadAction<UserSettings>) => {
      state.userSettings = action.payload;
    },
    setSystemUsers: (state, action: PayloadAction<SystemUser[]>) => {
      state.systemUsers = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUserSettings
      .addCase(fetchUserSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.userSettings = action.payload;
      })
      .addCase(fetchUserSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user settings';
      })
      // fetchSystemUsers
      .addCase(fetchSystemUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.systemUsers = action.payload;
      })
      .addCase(fetchSystemUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch system users';
      })
      // updateSystemUserToken
      .addCase(updateSystemUserToken.fulfilled, (state, action) => {
        // Обновляем токен в списке system users
        const index = state.systemUsers.findIndex(su => su.systemUserId === action.meta.arg.systemUserId);
        if (index !== -1) {
          state.systemUsers[index] = action.payload;
        }
      });
  },
});

export const { setUserSettings, setSystemUsers } = settingsSlice.actions;

export default settingsSlice.reducer;
