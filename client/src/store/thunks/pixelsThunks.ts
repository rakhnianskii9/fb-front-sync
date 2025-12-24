import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi, { SendPixelTestEventRequest } from '../../api/fbAds';
import { AppDispatch } from '..';
import {
  setPixels,
  setTestEventError,
  setTestEventLoading,
  setTestEventSuccess,
} from '../slices/pixelsSlice';

/**
 * Загрузка пикселей из backend
 */
export const fetchPixels = createAsyncThunk(
  'pixels/fetch',
  async (workspaceId: string, { dispatch }) => {
    const pixels = await fbAdsApi.pixels.getAll(workspaceId);
    dispatch(setPixels(pixels));
    return pixels;
  }
);

/**
 * Добавление пикселя
 */
export const addPixelThunk = createAsyncThunk(
  'pixels/add',
  async ({ workspaceId, pixelId }: { workspaceId: string; pixelId: string }, { dispatch }) => {
    const pixel = await fbAdsApi.pixels.add(workspaceId, pixelId);
    // Перезагружаем список после добавления
    await dispatch(fetchPixels(workspaceId));
    return pixel;
  }
);

/**
 * Удаление пикселя
 */
export const removePixelThunk = createAsyncThunk(
  'pixels/remove',
  async ({ workspaceId, pixelId }: { workspaceId: string; pixelId: string }, { dispatch }) => {
    await fbAdsApi.pixels.remove(workspaceId, pixelId);
    // Перезагружаем список после удаления
    await dispatch(fetchPixels(workspaceId));
  }
);

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const maybeError = error as { message?: string; response?: { data?: { message?: string } } };
    return (
      maybeError.response?.data?.message ||
      maybeError.message ||
      'Failed to send test event'
    );
  }
  return 'Failed to send test event';
};

export const sendPixelTestEventThunk =
  (payload: SendPixelTestEventRequest) =>
  async (dispatch: AppDispatch) => {
    try {
      dispatch(setTestEventLoading());
      const response = await fbAdsApi.pixels.sendTestEvent(payload);
      dispatch(setTestEventSuccess(response));
      return response;
    } catch (error) {
      dispatch(setTestEventError(getErrorMessage(error)));
      throw error;
    }
  };
