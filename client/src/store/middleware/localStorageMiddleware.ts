import logger from '@/lib/logger';
import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import * as reportStore from '@/lib/reportStore';
import * as metricPresetStore from '@/lib/metricPresetStore';

const STORAGE_KEY = 'redux-state-v2';
const DEBOUNCE_MS = 300; // Debounce для предотвращения блокировки UI
const BATCH_INTERVAL_MS = 1000; // Интервал батчевой записи

const PERSISTED_STATE_KEYS = [
  'projects',
  'reports',
  'metricPresets',
  'notes',
  'calculatedMetrics',
  'accounts',
  'campaigns',
  'adsets',
  'ads',
  'permissions',
  'pixels',
  'audiences',
  'user',
] as const;

// Состояние для debounced/batched записи
let pendingState: Record<string, unknown> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isWriting = false;

/**
 * Асинхронная запись в localStorage через requestIdleCallback
 * Не блокирует main thread, выполняется в idle time браузера
 */
function scheduleWrite(state: Record<string, unknown>): void {
  pendingState = state;
  
  // Очищаем предыдущий таймер
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // Debounce: ждём DEBOUNCE_MS после последнего action
  debounceTimer = setTimeout(() => {
    if (!pendingState || isWriting) return;
    
    const stateToWrite = pendingState;
    pendingState = null;
    isWriting = true;
    
    // Используем requestIdleCallback для записи в idle time
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(
        () => writeToStorage(stateToWrite),
        { timeout: BATCH_INTERVAL_MS }
      );
    } else {
      // Fallback для Safari/старых браузеров - setTimeout с минимальной задержкой
      setTimeout(() => writeToStorage(stateToWrite), 0);
    }
  }, DEBOUNCE_MS);
}

/**
 * Фактическая запись в localStorage
 * Выполняется асинхронно, не блокирует UI
 */
function writeToStorage(state: Record<string, unknown>): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    // Игнорируем ошибки записи (quota exceeded и т.д.)
    if (import.meta.env.DEV) {
      console.warn('[localStorage] Write failed:', error);
    }
  } finally {
    isWriting = false;
  }
}

/**
 * Middleware для авто-сохранения state в localStorage
 * Использует debounce + requestIdleCallback для максимальной производительности
 */
export const localStorageMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Собираем state для записи
  const state = store.getState() as Record<string, any>;
  const serializedState: Record<string, unknown> = {};
  
  for (const key of PERSISTED_STATE_KEYS) {
    if (state[key] !== undefined) {
      serializedState[key] = state[key];
    }
  }
  
  // Планируем асинхронную запись (не блокирует UI)
  scheduleWrite(serializedState);
  
  return result;
};

// Load state from localStorage on startup
export function loadStateFromLocalStorage() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return undefined;
  }

  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized) {
      const parsed = JSON.parse(serialized);
      if (!parsed || typeof parsed !== 'object') {
        return migrateOldData();
      }

      return parsed;
    }
    
    // Migrate old data if new format doesn't exist
    return migrateOldData();
  } catch (error) {
    return undefined;;
  }
}

// Migrate data from old format (reportStore) to Redux
function migrateOldData() {
  try {
    // Check if old data exists
    const oldProjectsData = localStorage.getItem('projects');
    if (!oldProjectsData) {
      return undefined;
    }
    
    const projects = JSON.parse(oldProjectsData);
    const reports: Record<string, any[]> = {};
    const metricPresets: Record<string, any[]> = {};
    
    // Migrate reports and metric presets for each project
    projects.forEach((project: any) => {
      reportStore.migrateOldData(project.id);
      const projectState = reportStore.getProjectState(project.id);
      if (projectState.reports.length > 0) {
        reports[project.id] = projectState.reports;
      }
      
      // Migrate metric presets
      const presetState = metricPresetStore.getMetricPresetsState(project.id);
      if (presetState.presets.length > 0) {
        metricPresets[project.id] = presetState.presets;
      }
    });
    
    // Get currentProjectId from old ProjectContext
    let currentProjectId: string | null = null;
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId && projects.some((p: any) => p.id === savedProjectId)) {
      currentProjectId = savedProjectId;
    }
    
    return {
      projects: {
        projects,
        currentProjectId,
      },
      reports: {
        reports,
        currentReportId: null,
      },
      metricPresets: {
        presets: metricPresets,
        currentPresetId: null,
      },
    };
  } catch (error) {
    logger.error('Error migrating old data:', error);
    return undefined;
  }
}
