import { configureStore, Reducer, UnknownAction, combineReducers } from '@reduxjs/toolkit';
import projectsReducer from './slices/projectsSlice';
import reportsReducer from './slices/reportsSlice';
import metricPresetsReducer from './slices/metricPresetsSlice';
import notesReducer from './slices/notesSlice';
import calculatedMetricsReducer from './slices/calculatedMetricsSlice';
import accountsReducer from './slices/accountsSlice';
import campaignsReducer from './slices/campaignsSlice';
import adsetsReducer from './slices/adsetsSlice';
import adsReducer from './slices/adsSlice';
import creativesReducer from './slices/creativesSlice';
import permissionsReducer from './slices/permissionsSlice';
import pixelsReducer from './slices/pixelsSlice';
import audiencesReducer from './slices/audiencesSlice';
import settingsReducer from './slices/settingsSlice';
import userReducer from './slices/userSlice';
import syncStatusReducer from './slices/syncStatusSlice';
import { localStorageMiddleware, loadStateFromLocalStorage } from './middleware/localStorageMiddleware';
import capiEventsReducer from './slices/capiEventsSlice';
import availableMetricsReducer from './slices/availableMetricsSlice';

const rootReducer = combineReducers({
  projects: projectsReducer,
  reports: reportsReducer,
  metricPresets: metricPresetsReducer,
  notes: notesReducer,
  calculatedMetrics: calculatedMetricsReducer,
  accounts: accountsReducer,
  campaigns: campaignsReducer,
  adsets: adsetsReducer,
  ads: adsReducer,
  creatives: creativesReducer,
  permissions: permissionsReducer,
  pixels: pixelsReducer,
  audiences: audiencesReducer,
  settings: settingsReducer,
  user: userReducer,
  syncStatus: syncStatusReducer,
  capiEvents: capiEventsReducer,
  availableMetrics: availableMetricsReducer,
});

type RootReducerState = ReturnType<typeof rootReducer>;

const preloadedState = typeof window !== 'undefined' ? loadStateFromLocalStorage() as Partial<RootReducerState> : undefined;

export const store = configureStore({
  reducer: rootReducer,
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Включаем проверку сериализуемости для раннего обнаружения багов
      // Игнорируем только специфичные actions где это неизбежно
      serializableCheck: {
        // Игнорируем actions с File/Blob объектами (загрузка файлов)
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Игнорируем пути где могут быть Date объекты
        ignoredPaths: [
          'reports.items.dateRange',
          'syncStatus.lastSyncTime',
        ],
      },
      // Проверка иммутабельности только в DEV (performance)
      immutableCheck: import.meta.env.DEV,
    }).concat(localStorageMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
