import logger from '@/lib/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import fbAdsApi from '../../api/fbAds';
import type { ApiProject, CreateProjectRequest, UpdateProjectRequest } from '../../api/fbAds';
import type { Project } from './projectsSlice';
import type { RootState } from '../index';
import { getActiveWorkspaceIdFromStorage, getUserIdFromStorage } from '../../utils/flowiseSession';

// Получить workspaceId из Redux state
const getWorkspaceId = (getState: () => unknown): string => {
  const state = getState() as RootState;
  const workspaceId =
    state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage();

  if (!workspaceId) {
    throw new Error('Workspace is not selected');
  }

  return workspaceId;
};

// Получить userId из Redux state
const getUserId = (getState: () => unknown): string => {
  const state = getState() as RootState;
  return state.user.currentUser?.id || getUserIdFromStorage() || '';
};

// Утилита для конвертации API response в локальный формат
const mapApiProjectToProject = (apiProject: ApiProject): Project => ({
  id: apiProject.id,
  workspaceId: apiProject.workspaceId,
  code: apiProject.code,
  name: apiProject.name,
  description: apiProject.description || '',
  createdAt: apiProject.createdDate,
  pinned: apiProject.pinned,
  tags: apiProject.tags,
  status: apiProject.status,
});

/**
 * Загрузить все проекты workspace
 */
export const fetchProjects = createAsyncThunk<Project[], void, { rejectValue: string }>(
  'projects/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      const workspaceId = getWorkspaceId(getState);
      const response = await fbAdsApi.projects.getAll(workspaceId);
      return response.map(mapApiProjectToProject);
    } catch (error: any) {
      logger.error('[Projects Thunk] Fetch failed:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to load projects');
    }
  }
);

/**
 * Создать новый проект
 */
export const createProject = createAsyncThunk<
  Project,
  Omit<CreateProjectRequest, 'workspaceId'>,
  { rejectValue: string }
>('projects/create', async (data, { rejectWithValue, getState }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const apiProject = await fbAdsApi.projects.create({ ...data, workspaceId });
    return mapApiProjectToProject(apiProject);
  } catch (error: any) {
    logger.error('[Projects Thunk] Create failed:', error);
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create project');
  }
});

/**
 * Обновить проект
 */
export const updateProject = createAsyncThunk<
  Project,
  { id: string; updates: Omit<UpdateProjectRequest, 'workspaceId'> },
  { rejectValue: string }
>('projects/update', async ({ id, updates }, { rejectWithValue, getState }) => {
  try {
    const workspaceId = getWorkspaceId(getState);
    const apiProject = await fbAdsApi.projects.update(id, { ...updates, workspaceId });
    return mapApiProjectToProject(apiProject);
  } catch (error: any) {
    logger.error('[Projects Thunk] Update failed:', error);
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update project');
  }
});

/**
 * Удалить проект
 */
export const deleteProject = createAsyncThunk<string, string, { rejectValue: string }>(
  'projects/delete',
  async (id, { rejectWithValue, getState }) => {
    try {
      const workspaceId = getWorkspaceId(getState);
      await fbAdsApi.projects.delete(id, workspaceId);
      return id;
    } catch (error: any) {
      logger.error('[Projects Thunk] Delete failed:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete project');
    }
  }
);

/**
 * Клонировать проект
 */
export const cloneProject = createAsyncThunk<Project, string, { rejectValue: string }>(
  'projects/clone',
  async (id, { rejectWithValue, getState }) => {
    try {
      const workspaceId = getWorkspaceId(getState);
      const apiProject = await fbAdsApi.projects.clone(id, { workspaceId });
      return mapApiProjectToProject(apiProject);
    } catch (error: any) {
      logger.error('[Projects Thunk] Clone failed:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to clone project');
    }
  }
);

/**
 * Переключить pin проекта
 */
export const toggleProjectPin = createAsyncThunk<Project, string, { rejectValue: string }>(
  'projects/togglePin',
  async (id, { rejectWithValue, getState }) => {
    try {
      const workspaceId = getWorkspaceId(getState);
      const apiProject = await fbAdsApi.projects.togglePin(id, { workspaceId });
      return mapApiProjectToProject(apiProject);
    } catch (error: any) {
      logger.error('[Projects Thunk] Toggle pin failed:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to toggle pin');
    }
  }
);
