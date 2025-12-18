import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi from '../../api/fbAds';

/**
 * Загрузка настроек пользователя (business info, connection health)
 */
export const fetchUserSettings = createAsyncThunk(
  'settings/fetchUserSettings',
  async (workspaceId: string) => {
    const settings = await fbAdsApi.userSettings.get(workspaceId);
    return settings;
  }
);

/**
 * Загрузка system users
 */
export const fetchSystemUsers = createAsyncThunk(
  'settings/fetchSystemUsers',
  async (workspaceId: string) => {
    const systemUsers = await fbAdsApi.systemUsers.getAll(workspaceId);
    return systemUsers;
  }
);

/**
 * Обновление токена system user
 */
export const updateSystemUserToken = createAsyncThunk(
  'settings/updateSystemUserToken',
  async ({ workspaceId, systemUserId, token }: { workspaceId: string; systemUserId: string; token: string }) => {
    const result = await fbAdsApi.systemUsers.updateToken(workspaceId, systemUserId, token);
    return result;
  }
);
