import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser, selectCurrentProject } from '@/store/selectors';
import { getActiveWorkspaceIdFromStorage } from '@/utils/flowiseSession';

/**
 * Хук возвращает актуальный workspaceId текущего пользователя.
 * Источники данных (в порядке приоритета):
 * 1. Redux user slice (activeWorkspaceId)
 * 2. localStorage (fallback для standalone режима)
 * 3. currentProject.workspaceId (fallback из загруженного проекта)
 */
export function useWorkspace() {
  const currentUser = useAppSelector(selectCurrentUser);
  const currentProject = useAppSelector(selectCurrentProject);
  const storedWorkspaceId = getActiveWorkspaceIdFromStorage();
  
  // Приоритет: user → localStorage → project
  const workspaceId = currentUser?.activeWorkspaceId 
    ?? storedWorkspaceId 
    ?? currentProject?.workspaceId;

  return {
    workspaceId,
    isLoading: !currentUser && !storedWorkspaceId && !currentProject,
    error: workspaceId ? null : 'Рабочее пространство не выбрано',
  };
}
