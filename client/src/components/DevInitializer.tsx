import { useEffect, useRef } from 'react';
import logger from "@/lib/logger";
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '@/store/hooks';
import { setCurrentProject, fetchProjects } from '@/store/slices/projectsSlice';
import { setCurrentReport } from '@/store/slices/reportsSlice';
import { fetchReportsByProject, getAutoRefreshLimitThunk } from '@/store/slices/reportsThunks';
import { persistActiveWorkspaceId } from '@/utils/flowiseSession';
import { useWorkspace } from '@/hooks/useWorkspace';

/**
 * AppInitializer — инициализация приложения при старте
 * 
 * Задачи:
 * 1. Установить workspaceId из URL params (если есть)
 * 2. Загрузить проекты и выбрать первый (если URL params есть)
 * 3. Автовыбор проекта если пользователь на landing page
 */
export function DevInitializer() {
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useWorkspace();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const init = async () => {
      const urlWorkspaceId = searchParams.get('workspaceId');
      const urlProjectId = searchParams.get('projectId');
      const urlReportId = searchParams.get('reportId');

      // 0. Set Workspace if provided in URL
      if (urlWorkspaceId) {
        logger.log('🔧 AppInitializer: Setting workspaceId from URL:', urlWorkspaceId);
        persistActiveWorkspaceId(urlWorkspaceId);
      }

      // 1. Explicit URL params — приоритетный путь
      if (urlProjectId) {
        initialized.current = true;
        logger.log('🔧 AppInitializer: Initializing from URL params...');
        
        // Load projects to ensure we have the project object in store
        await dispatch(fetchProjects());
        dispatch(setCurrentProject(urlProjectId));
        
        // Load reports
        await dispatch(fetchReportsByProject({ projectId: urlProjectId }));
        
        // Загрузить лимит auto-refresh
        dispatch(getAutoRefreshLimitThunk());
        
        if (urlReportId) {
          dispatch(setCurrentReport(urlReportId));
        }
        
        // Redirect to analytics if we are at a landing page
        if (location.pathname === '/' || location.pathname === '/projects') {
          navigate('/analytics');
        }
        return;
      }

      // 2. Просто загружаем проекты если есть workspaceId — без автоматического редиректа
      // Пользователь сам выберет проект и отчёт
      if (workspaceId && (location.pathname === '/' || location.pathname === '/projects')) {
        initialized.current = true;
        logger.log('🔧 AppInitializer: Loading projects (no auto-redirect)...');
        await dispatch(fetchProjects());
      }
    };

    init();
  }, [dispatch, searchParams, navigate, location.pathname, workspaceId]);

  return null;
}
