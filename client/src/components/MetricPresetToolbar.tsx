import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoreVertical, Pin, Trash2, Check, Search, Copy } from "lucide-react";
import { PresetSelector } from "@/components/ui/preset-selector";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  addMetricPreset,
  updateMetricPreset,
  deleteMetricPreset,
  toggleMetricPresetPin,
  duplicateMetricPreset,
} from "@/store/slices/metricPresetsSlice";
import { updateReport } from "@/store/slices/reportsSlice";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  selectCurrentProjectId,
  selectCurrentProjectReports,
  selectCurrentReportId,
  selectCurrentReport,
  selectCurrentProjectMetricPresets,
} from "@/store/selectors";

function MetricPresetToolbarInner() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  
  const currentProjectId = useAppSelector(selectCurrentProjectId);
  const reports = useAppSelector(selectCurrentProjectReports);
  const currentReportId = useAppSelector(selectCurrentReportId);
  const currentReport = useAppSelector(selectCurrentReport);
  
  const presets = useAppSelector(selectCurrentProjectMetricPresets);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  if (!currentProjectId || !currentReport) return null;

  const currentMetrics = currentReport.selectedMetrics || [];

  const isCurrentPresetMatch = (presetMetrics: string[]) => {
    if (currentMetrics.length !== presetMetrics.length) return false;
    const sorted1 = [...currentMetrics].sort();
    const sorted2 = [...presetMetrics].sort();
    return sorted1.every((m, i) => m === sorted2[i]);
  };

  const activePreset = presets.find(p => isCurrentPresetMatch(p.selectedMetrics));

  const handleSavePreset = () => {
    if (currentMetrics.length === 0) {
      toast({
        title: "No metrics selected",
        description: "Please select at least one metric before saving a preset",
        variant: "destructive",
      });
      return;
    }
    
    const baseName = presetName.trim() || "New Preset";
    
    const preset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: baseName,
      projectId: currentProjectId,
      selectedMetrics: [...currentMetrics],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      tags: [],
    };

    dispatch(addMetricPreset(preset));
    
    toast({
      title: "Preset saved",
      description: `"${baseName}" has been saved successfully`,
    });
    
    setSaveDialogOpen(false);
    setPresetName("");
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    dispatch(updateReport({
      projectId: currentProjectId,
      reportId: currentReport.id,
      updates: { selectedMetrics: preset.selectedMetrics },
    }));

    toast({
      title: "Preset loaded",
      description: `"${preset.name}" metrics applied`,
    });
    
    setSelectDialogOpen(false);
  };

  const handleStartEditingName = () => {
    if (activePreset) {
      setIsEditingName(true);
      setEditedName(activePreset.name);
    }
  };

  const handleSaveName = () => {
    if (!activePreset || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    const trimmedName = editedName.trim();
    dispatch(updateMetricPreset({
      projectId: currentProjectId,
      presetId: activePreset.id,
      updates: { name: trimmedName },
    }));
    
    toast({
      title: "Preset renamed",
      description: `Renamed to "${trimmedName}"`,
    });
    
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const handleTogglePin = (presetId: string) => {
    dispatch(toggleMetricPresetPin({ projectId: currentProjectId, presetId }));
  };

  const handleDelete = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    dispatch(deleteMetricPreset({ projectId: currentProjectId, presetId }));
    
    toast({
      title: "Preset deleted",
      description: `"${preset.name}" has been removed`,
    });
  };

  const handleDuplicate = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    dispatch(duplicateMetricPreset({ projectId: currentProjectId, presetId }));
    
    toast({
      title: "Preset duplicated",
      description: `Created a copy of "${preset.name}"`,
    });
  };

  const sortedPresets = [...presets].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredPresets = sortedPresets.filter(preset =>
    preset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <PresetSelector
        activePresetName={activePreset?.name || null}
        isEditing={isEditingName}
        editedName={editedName}
        onEditedNameChange={setEditedName}
        onStartEdit={handleStartEditingName}
        onSaveEdit={handleSaveName}
        onEditKeyDown={handleNameKeyDown}
        onSelectClick={() => setSelectDialogOpen(true)}
        onSaveClick={() => setSaveDialogOpen(true)}
        disabled={!activePreset}
        saveDisabled={currentMetrics.length === 0}
        presetNameSize="base"
        selectButtonSize="xs"
        saveButtonHeight="md"
      />

      <Dialog open={selectDialogOpen} onOpenChange={setSelectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <div className="px-6 pt-6 pb-4 border-b">
            <h2 className="text-2xl font-bold">Recent Presets</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {presets.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No saved presets yet
              </div>
            ) : (
              <div className="space-y-3">
                {sortedPresets.map((preset) => {
                    const timeDiff = Date.now() - new Date(preset.updatedAt || preset.createdAt).getTime();
                    const minutes = Math.floor(timeDiff / 60000);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const timeAgo = days > 0 ? `${days} day${days > 1 ? 's' : ''} ago` :
                                    hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ago` :
                                    minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''} ago` :
                                    'just now';
                    
                    return (
                      <div
                        key={preset.id}
                        className="group flex items-center justify-between gap-3 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => handleLoadPreset(preset.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base truncate mb-1">{preset.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Updated {timeAgo}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(preset.id);
                            }}
                          >
                            <Pin className={`w-4 h-4 ${preset.pinned ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(preset.id);
                              }}>
                                <Pin className="w-4 h-4 mr-2" />
                                {preset.pinned ? "Unpin" : "Pin"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(preset.id);
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(preset.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Metric Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Preset Name</label>
              <Input
                placeholder="e.g., Core Performance Metrics"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSavePreset();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This preset will save {currentMetrics.length} selected metric{currentMetrics.length !== 1 ? 's' : ''}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset}>
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(MetricPresetToolbarInner);
