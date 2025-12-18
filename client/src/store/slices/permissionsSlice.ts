import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../api/client';

export interface PermissionGroup {
  id: string;
  title: string;
  description: string;
  permissions: string[];
  enabled: boolean;
  refreshFrequency: string;
  beta?: boolean;
  token?: string;
  connectedAt?: string;
}

interface PermissionsState {
  groups: PermissionGroup[];
  loading: boolean;
  error: string | null;
}

interface PermissionsApiGroup {
  id: string;
  title: string;
  description: string;
  scopes: string[];
  beta?: boolean;
}

// ✅ Загрузка актуальных scopes из backend API
export const fetchPermissionGroups = createAsyncThunk(
  'permissions/fetchGroups',
  async (workspaceId?: string) => {
    const response = await apiClient.get<{ groups: PermissionsApiGroup[] }>('/facebook/scopes', {
      params: workspaceId ? { workspaceId } : {},
    });
    return response.groups;
  }
);

const initialState: PermissionsState = {
  groups: [], // ✅ Пустой массив - будет заполнен из API
  loading: false,
  error: null,
};

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setPermissionGroups: (state, action: PayloadAction<PermissionGroup[]>) => {
      state.groups = action.payload;
    },
    togglePermissionGroup: (state, action: PayloadAction<string>) => {
      const group = state.groups.find(g => g.id === action.payload);
      if (group) {
        group.enabled = !group.enabled;
      }
    },
    updatePermissionGroup: (state, action: PayloadAction<{ id: string; updates: Partial<PermissionGroup> }>) => {
      const index = state.groups.findIndex(g => g.id === action.payload.id);
      if (index !== -1) {
        state.groups[index] = { ...state.groups[index], ...action.payload.updates };
      }
    },
    connectPermissionGroup: (state, action: PayloadAction<{ id: string; token: string }>) => {
      const group = state.groups.find(g => g.id === action.payload.id);
      if (group) {
        group.enabled = true;
        group.token = action.payload.token;
        group.connectedAt = new Date().toISOString();
      }
    },
    disconnectPermissionGroup: (state, action: PayloadAction<string>) => {
      const group = state.groups.find(g => g.id === action.payload);
      if (group) {
        group.enabled = false;
        delete group.token;
        delete group.connectedAt;
      }
    },
    setRefreshFrequency: (state, action: PayloadAction<{ id: string; frequency: string }>) => {
      const group = state.groups.find(g => g.id === action.payload.id);
      if (group) {
        group.refreshFrequency = action.payload.frequency;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPermissionGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPermissionGroups.fulfilled, (state, action) => {
        state.loading = false;
        // ✅ Scopes приходят из backend - единый источник истины
        state.groups = action.payload.map((group: any) => ({
          id: group.id,
          title: group.title,
          description: group.description,
          permissions: group.scopes, // backend называет их scopes
          enabled: false, // по умолчанию выключены
          refreshFrequency: "24h",
          beta: group.beta || false,
        }));
      })
      .addCase(fetchPermissionGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch permission groups';
      });
  },
});

export const {
  setPermissionGroups,
  togglePermissionGroup,
  updatePermissionGroup,
  connectPermissionGroup,
  disconnectPermissionGroup,
  setRefreshFrequency,
} = permissionsSlice.actions;

// Селекторы
export const selectPermissionGroups = (state: { permissions: PermissionsState }) => state.permissions.groups;
export const selectPermissionsLoading = (state: { permissions: PermissionsState }) => state.permissions.loading;
export const selectPermissionsError = (state: { permissions: PermissionsState }) => state.permissions.error;

export default permissionsSlice.reducer;
