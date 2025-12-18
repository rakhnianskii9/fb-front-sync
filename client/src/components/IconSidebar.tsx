import { useState } from "react";
import { ArrowLeft, BarChart3, Contact, Folder, LayoutGrid, Settings, NotebookPen, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { WorkspaceSwitcherDialog } from "@/components/WorkspaceSwitcherDialog";
import NotificationBell from "@/components/NotificationBell";
import { selectActiveWorkspace } from "@/store/slices/userSlice";
import { getActiveWorkspaceIdFromStorage } from "@/utils/flowiseSession";

export default function IconSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentProjectId = useAppSelector((state) => state.projects.currentProjectId);
  const activeWorkspace = useAppSelector(selectActiveWorkspace);
  const effectiveWorkspaceId = activeWorkspace?.id || getActiveWorkspaceIdFromStorage();
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);

  const handleSelectionClick = () => {
    navigate('/selection');
  };

  const isActive = (path: string) => {
    if (path === '/projects') {
      return location.pathname === '/' || location.pathname === '/projects';
    }
    return location.pathname === path;
  };

  const handleBackClick = () => {
    window.location.href = "/chatflows";
  };

  return (
    <div className="hidden lg:flex w-16 bg-sidebar border-r border-sidebar-border h-screen flex-col items-center py-4 flex-shrink-0">
      <button
        onClick={() => navigate('/projects')}
        className={`w-10 h-10 flex items-center justify-center rounded-md mb-2 ${
          isActive('/projects')
            ? 'bg-primary text-primary-foreground'
            : 'hover-elevate active-elevate-2 text-sidebar-foreground'
        }`}
        data-testid="button-nav-folder"
      >
        <Folder className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => currentProjectId && handleSelectionClick()}
        disabled={!currentProjectId}
        className={`w-10 h-10 flex items-center justify-center rounded-md mb-2 ${
          !currentProjectId
            ? 'opacity-50 cursor-not-allowed text-sidebar-foreground'
            : isActive('/selection')
            ? 'bg-primary text-primary-foreground'
            : 'hover-elevate active-elevate-2 text-sidebar-foreground'
        }`}
        data-testid="button-nav-grid"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => currentProjectId && navigate('/analytics')}
        disabled={!currentProjectId}
        className={`w-10 h-10 flex items-center justify-center rounded-md mb-2 ${
          !currentProjectId
            ? 'opacity-50 cursor-not-allowed text-sidebar-foreground'
            : isActive('/analytics')
            ? 'bg-primary text-primary-foreground'
            : 'hover-elevate active-elevate-2 text-sidebar-foreground'
        }`}
        data-testid="button-nav-chart"
      >
        <BarChart3 className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => currentProjectId && navigate('/notes')}
        disabled={!currentProjectId}
        className={`w-10 h-10 flex items-center justify-center rounded-md mb-2 ${
          !currentProjectId
            ? 'opacity-50 cursor-not-allowed text-sidebar-foreground'
            : isActive('/notes')
            ? 'bg-primary text-primary-foreground'
            : 'hover-elevate active-elevate-2 text-sidebar-foreground'
        }`}
        data-testid="button-nav-notes"
      >
        <NotebookPen className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => navigate('/crm')}
        className={`w-10 h-10 flex items-center justify-center rounded-md mb-2 ${
          isActive('/crm')
            ? 'bg-primary text-primary-foreground'
            : 'hover-elevate active-elevate-2 text-sidebar-foreground'
        }`}
        data-testid="button-nav-crm"
      >
        <Contact className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => navigate('/settings')}
        className={`w-10 h-10 flex items-center justify-center rounded-md mb-2 ${
          isActive('/settings')
            ? 'bg-primary text-primary-foreground'
            : 'hover-elevate active-elevate-2 text-sidebar-foreground'
        }`}
        data-testid="button-nav-settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          onClick={handleBackClick}
          className="w-10 h-10 flex items-center justify-center rounded-md hover-elevate active-elevate-2 text-sidebar-foreground"
          data-testid="button-nav-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {effectiveWorkspaceId && (
          <NotificationBell workspaceId={effectiveWorkspaceId} className="w-10 h-10" />
        )}

        <button
          onClick={() => setIsWorkspaceDialogOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover-elevate active-elevate-2 text-sidebar-foreground"
          data-testid="button-nav-workspace"
        >
          <UserRound className="w-5 h-5" />
        </button>
      </div>

      <WorkspaceSwitcherDialog
        open={isWorkspaceDialogOpen}
        onOpenChange={setIsWorkspaceDialogOpen}
      />
    </div>
  );
}
