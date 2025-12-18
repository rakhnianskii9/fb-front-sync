import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import { FlowiseStoredWorkspace, readFlowiseUser } from '../../utils/flowiseSession';

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'en' | 'ru';
  notificationsEnabled: boolean;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  activeWorkspaceId?: string;
  workspaces: FlowiseStoredWorkspace[];
  settings: UserSettings;
}

interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  settingsLoading: boolean;
  settingsError: string | null;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  language: 'ru',
  notificationsEnabled: true,
};

// Функция поднимает пользователя из Flowise localStorage
const bootstrapUser = (): User | null => {
  const flowiseUser = readFlowiseUser();
  if (!flowiseUser || !flowiseUser.id) return null;

  const activeWorkspaceId =
    flowiseUser.activeWorkspaceId ||
    flowiseUser.assignedWorkspaces?.find((workspace) => workspace?.id)?.id;

  return {
    id: flowiseUser.id,
    username: flowiseUser.name || flowiseUser.email || 'Flowise User',
    email: flowiseUser.email,
    activeWorkspaceId,
    workspaces: flowiseUser.assignedWorkspaces ?? [],
    settings: { ...defaultSettings },
  };
};

// Загрузка настроек UI пользователя (theme, language, notifications)
export const fetchUserUISettings = createAsyncThunk<UserSettings>(
  'user/fetchSettings',
  async () => {
    const data = await apiClient.get<UserSettings>('/facebook/user-settings');
    return data;
  }
);

export const updateUserSettingsAPI = createAsyncThunk<
  UserSettings,
  Partial<UserSettings>
>(
  'user/updateSettings',
  async (settings) => {
    const data = await apiClient.put<UserSettings>(
      '/facebook/user-settings',
      settings
    );
    return data;
  }
);

const bootstrappedUser = bootstrapUser();

const initialState: UserState = {
  currentUser: bootstrappedUser,
  isAuthenticated: Boolean(bootstrappedUser),
  settingsLoading: false,
  settingsError: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
    },
    updateUserSettings: (state, action: PayloadAction<Partial<UserSettings>>) => {
      if (state.currentUser) {
        state.currentUser.settings = {
          ...state.currentUser.settings,
          ...action.payload,
        };
      }
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
    setActiveWorkspaceId: (state, action: PayloadAction<string>) => {
      if (state.currentUser) {
        state.currentUser.activeWorkspaceId = action.payload;
      }
    },
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserUISettings.pending, (state) => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(fetchUserUISettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        if (state.currentUser) {
          state.currentUser.settings = action.payload;
        }
      })
      .addCase(fetchUserUISettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.error.message || 'Failed to fetch settings';
      })
      .addCase(updateUserSettingsAPI.pending, (state) => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(updateUserSettingsAPI.fulfilled, (state, action) => {
        state.settingsLoading = false;
        if (state.currentUser) {
          state.currentUser.settings = action.payload;
        }
      })
      .addCase(updateUserSettingsAPI.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.error.message || 'Failed to update settings';
      });
  },
});

export const {
  setUser,
  updateUserSettings,
  updateUserProfile,
  setActiveWorkspaceId,
  logout,
} = userSlice.actions;

export const selectCurrentUser = (state: { user: UserState }) =>
  state.user.currentUser;
export const selectUserSettings = (state: { user: UserState }) =>
  state.user.currentUser?.settings;
export const selectUserWorkspaces = (state: { user: UserState }) =>
  state.user.currentUser?.workspaces || [];
export const selectActiveWorkspace = (state: { user: UserState }) => {
  const user = state.user.currentUser;
  if (!user?.activeWorkspaceId || !user?.workspaces) return null;
  return user.workspaces.find(w => w.id === user.activeWorkspaceId) || null;
};
export const selectSettingsLoading = (state: { user: UserState }) =>
  state.user.settingsLoading;
export const selectSettingsError = (state: { user: UserState }) =>
  state.user.settingsError;

export default userSlice.reducer;
