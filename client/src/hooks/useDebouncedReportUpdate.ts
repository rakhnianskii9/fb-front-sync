/**
 * useDebouncedReportUpdate — хук для отложенного сохранения изменений report на сервер
 * 
 * Проблема: каждый клик (таб, метрика, дата) сразу вызывает PUT на сервер
 * Решение: debounce 500ms — группирует изменения, один запрос на пачку
 */
import { useCallback, useRef, useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateReportThunk } from '@/store/slices/reportsThunks';
import { updateReportOptimistic, type Report } from '@/store/slices/reportsSlice';
import type { UpdateReportRequest } from '@/api/fbAds';
import { logger } from '@/lib/logger';

// Время ожидания после последнего изменения перед отправкой на сервер
const DEBOUNCE_MS = 500;

// Тип для обновлений — часть Report, которую можно обновить
type UpdatesPartial = Partial<Omit<Report, 'id' | 'projectId' | 'createdAt'>>;

// Тип для API-запроса (без workspaceId)
type ApiUpdates = Omit<UpdateReportRequest, 'workspaceId'>;

interface DebouncedUpdateOptions {
  projectId: string | null;
  reportId: string | null;
  // Если true — показывать toast при ошибке (по умолчанию false)
  showErrorToast?: boolean;
}

/**
 * Хук возвращает функцию queueUpdate(), которая:
 * 1. Мгновенно обновляет Redux (оптимистично)
 * 2. Накапливает изменения
 * 3. Через DEBOUNCE_MS отправляет их на сервер одним запросом
 * 
 * Если projectId или reportId равны null — возвращает no-op функции
 */
export function useDebouncedReportUpdate(options: DebouncedUpdateOptions) {
  const { projectId, reportId, showErrorToast = false } = options;
  const dispatch = useAppDispatch();
  
  // Накопленные изменения
  const pendingUpdatesRef = useRef<UpdatesPartial>({});
  // Таймер debounce
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Флаг — сохранение в процессе
  const isSavingRef = useRef(false);
  
  // Очистка при unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // Функция отправки на сервер
  const flushToServer = useCallback(async () => {
    // Если нет IDs — ничего не делаем
    if (!projectId || !reportId) return;
    
    const updates = pendingUpdatesRef.current;
    pendingUpdatesRef.current = {};
    
    if (Object.keys(updates).length === 0) {
      return;
    }
    
    isSavingRef.current = true;
    
    try {
      logger.log('[DebouncedUpdate] Flushing to server:', Object.keys(updates));
      await dispatch(updateReportThunk({
        projectId,
        reportId,
        // Cast to API type — поля совместимы
        updates: updates as ApiUpdates,
      })).unwrap();
    } catch (error: any) {
      logger.warn('[DebouncedUpdate] Server save failed:', error?.message);
      // TODO: если showErrorToast — показать toast
      // Можно добавить retry логику
    } finally {
      isSavingRef.current = false;
    }
  }, [dispatch, projectId, reportId]);
  
  /**
   * queueUpdate — добавить изменение в очередь
   * 
   * @param updates — частичные изменения report (activeTab, selectedMetrics, etc)
   * @param immediate — если true, сразу отправить (для критичных изменений)
   */
  const queueUpdate = useCallback((updates: UpdatesPartial, immediate = false) => {
    // Если нет reportId — ничего не делаем
    if (!reportId) return;
    
    // 1. Мгновенно обновить Redux (оптимистично)
    dispatch(updateReportOptimistic({
      reportId,
      updates,
    }));
    
    // 2. Накопить изменения
    pendingUpdatesRef.current = {
      ...pendingUpdatesRef.current,
      ...updates,
    };
    
    // 3. Сбросить таймер
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // 4. Запланировать отправку
    if (immediate) {
      flushToServer();
    } else {
      timerRef.current = setTimeout(flushToServer, DEBOUNCE_MS);
    }
  }, [dispatch, reportId, flushToServer]);
  
  /**
   * flushNow — принудительно отправить все накопленные изменения
   * Использовать перед навигацией или закрытием страницы
   */
  const flushNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    flushToServer();
  }, [flushToServer]);
  
  /**
   * hasPendingUpdates — есть ли несохранённые изменения
   */
  const hasPendingUpdates = useCallback(() => {
    return Object.keys(pendingUpdatesRef.current).length > 0 || isSavingRef.current;
  }, []);
  
  return {
    queueUpdate,
    flushNow,
    hasPendingUpdates,
  };
}
