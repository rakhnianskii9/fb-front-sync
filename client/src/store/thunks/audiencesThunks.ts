import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi from '../../api/fbAds';
import { setAudiences } from '../slices/audiencesSlice';

/**
 * Загрузка аудиторий из backend
 */
export const fetchAudiences = createAsyncThunk(
  'audiences/fetch',
  async (workspaceId: string, { dispatch }) => {
    const audiences = await fbAdsApi.audiences.getAll(workspaceId);
    dispatch(setAudiences(audiences));
    return audiences;
  }
);

/**
 * Добавление аудитории
 */
export const addAudienceThunk = createAsyncThunk(
  'audiences/add',
  async ({ workspaceId, audienceId }: { workspaceId: string; audienceId: string }, { dispatch }) => {
    const audience = await fbAdsApi.audiences.add(workspaceId, audienceId);
    // Перезагружаем список после добавления
    await dispatch(fetchAudiences(workspaceId));
    return audience;
  }
);

/**
 * Удаление аудитории
 */
export const removeAudienceThunk = createAsyncThunk(
  'audiences/remove',
  async ({ workspaceId, audienceId }: { workspaceId: string; audienceId: string }, { dispatch }) => {
    await fbAdsApi.audiences.remove(workspaceId, audienceId);
    // Перезагружаем список после удаления
    await dispatch(fetchAudiences(workspaceId));
  }
);
