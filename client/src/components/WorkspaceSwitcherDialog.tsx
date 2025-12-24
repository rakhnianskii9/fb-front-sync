import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser, selectUserWorkspaces, setActiveWorkspaceId } from "@/store/slices/userSlice";
import { resetProjectsState } from "@/store/slices/projectsSlice";
import { resetReportsState } from "@/store/slices/reportsSlice";
import { resetAccountsState } from "@/store/slices/accountsSlice";
import { clearCampaigns } from "@/store/slices/campaignsSlice";
import { clearAdSets } from "@/store/slices/adsetsSlice";
import { clearAds } from "@/store/slices/adsSlice";
import { persistActiveWorkspaceId } from "@/utils/flowiseSession";
import { fetchAdAccounts } from "@/store/slices/accountsThunks";
import { fetchProjects } from "@/store/slices/projectsThunks";

interface WorkspaceSwitcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Диалог переключения рабочего пространства */
export function WorkspaceSwitcherDialog({ open, onOpenChange }: WorkspaceSwitcherDialogProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectCurrentUser);
  const workspaces = useAppSelector(selectUserWorkspaces);
  const activeWorkspaceId = currentUser?.activeWorkspaceId;
  const availableWorkspaces = useMemo(
    () => workspaces.filter((workspace) => Boolean(workspace?.id)),
    [workspaces]
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>(activeWorkspaceId);

  useEffect(() => {
    if (!open) return;
    const fallback = activeWorkspaceId || availableWorkspaces[0]?.id;
    setSelectedWorkspaceId(fallback);
  }, [activeWorkspaceId, availableWorkspaces, open]);

  const handleClose = () => onOpenChange(false);

  const handleApply = () => {
    if (!selectedWorkspaceId || selectedWorkspaceId === activeWorkspaceId) {
      handleClose();
      return;
    }
    // ВАЖНО: Сначала очистить state, потом менять workspaceId
    // Это предотвращает показ проектов из старого workspace
    dispatch(resetProjectsState());
    dispatch(resetReportsState());
    dispatch(resetAccountsState());
    dispatch(clearCampaigns());
    dispatch(clearAdSets());
    dispatch(clearAds());
    // Теперь меняем workspaceId - useEffect в компонентах загрузит новые данные
    dispatch(setActiveWorkspaceId(selectedWorkspaceId));
    persistActiveWorkspaceId(selectedWorkspaceId);
    // Загрузка новых данных (также произойдёт через useEffect с activeWorkspaceId)
    dispatch(fetchProjects());
    dispatch(fetchAdAccounts());
    navigate("/projects");
    handleClose();
  };

  const isApplyDisabled = !selectedWorkspaceId || selectedWorkspaceId === activeWorkspaceId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border text-card-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Switch Workspace</DialogTitle>
          <DialogDescription>
            Select a workspace to update the list of ad accounts.
          </DialogDescription>
        </DialogHeader>

        {availableWorkspaces.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-select">Workspace</Label>
              <Select
                value={selectedWorkspaceId ?? ""}
                onValueChange={(value) => setSelectedWorkspaceId(value)}
              >
                <SelectTrigger id="workspace-select" className="bg-secondary text-secondary-foreground">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {availableWorkspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id ?? ''}>
                      {workspace.name || workspace.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No workspaces available. Check your access permissions or try again later.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isApplyDisabled || availableWorkspaces.length === 0}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
