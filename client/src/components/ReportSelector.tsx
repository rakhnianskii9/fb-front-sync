import { useState, memo } from "react";
import { X, Search, Pin, MoreVertical, Copy, Trash2, Edit, Tag, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Report {
  id: string;
  code?: number;
  name: string;
  updated: string;
  pinned: boolean;
  tags?: string[];
}

interface ReportSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  reports: Report[];
  onTogglePin: (reportId: string) => void;
  onClone?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  onRename?: (reportId: string, newName: string) => void;
  onUpdateTags?: (reportId: string, tags: string[]) => void;
  onOpenReport?: (reportId: string) => void;
}

function ReportSelectorInner({ 
  isOpen, 
  onClose, 
  reports, 
  onTogglePin,
  onClone,
  onDelete,
  onRename,
  onUpdateTags,
  onOpenReport
}: ReportSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameReportId, setRenameReportId] = useState<string>("");
  const [newReportName, setNewReportName] = useState("");
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [tagsReportId, setTagsReportId] = useState<string>("");
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  if (!isOpen) return null;

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePinSelected = () => {
    if (selectedReport) {
      onTogglePin(selectedReport);
      setSelectedReport("");
    }
  };

  const handleClone = (reportId: string) => {
    onClone?.(reportId);
  };

  const handleDelete = (reportId: string) => {
    onDelete?.(reportId);
    if (selectedReport === reportId) {
      setSelectedReport("");
    }
  };

  const handleRenameClick = (reportId: string, currentName: string) => {
    setRenameReportId(reportId);
    setNewReportName(currentName);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (newReportName.trim() && renameReportId) {
      onRename?.(renameReportId, newReportName.trim());
      setRenameDialogOpen(false);
      setRenameReportId("");
      setNewReportName("");
    }
  };

  const handleEditTagsClick = (reportId: string, currentTags: string[]) => {
    setTagsReportId(reportId);
    setEditingTags(currentTags || []);
    setTagInput("");
    setTagsDialogOpen(true);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !editingTags.includes(tag)) {
      setEditingTags([...editingTags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagsSubmit = () => {
    if (tagsReportId) {
      onUpdateTags?.(tagsReportId, editingTags);
      setTagsDialogOpen(false);
      setTagsReportId("");
      setEditingTags([]);
      setTagInput("");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card border border-card-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-card-border">
          <h2 className="text-h1 text-card-foreground">Select Reports</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover-elevate active-elevate-2"
            data-testid="button-close-selector"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="p-6 border-b border-card-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-search-reports"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <RadioGroup value={selectedReport} onValueChange={setSelectedReport}>
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-md hover-elevate active-elevate-2 border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <RadioGroupItem
                      value={report.id}
                      id={report.id}
                      data-testid={`radio-report-${report.id}`}
                    />
                    <label htmlFor={report.id} className="flex-1 cursor-pointer">
                      <p className="text-body text-card-foreground font-medium">{report.name}</p>
                      {report.tags && report.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {report.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="gap-1">
                              {tag}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newTags = report.tags?.filter(t => t !== tag) || [];
                                  onUpdateTags?.(report.id, newTags);
                                }}
                                className="ml-1 hover:text-destructive"
                                data-testid={`button-remove-tag-${report.id}-${index}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-body-sm text-muted-foreground mt-1">Created: {report.updated}</p>
                    </label>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(report.id);
                      }}
                      className={`p-2 rounded-md hover-elevate active-elevate-2 ${
                        report.pinned ? 'text-primary' : 'text-muted-foreground'
                      }`}
                      data-testid={`button-pin-${report.id}`}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-md hover-elevate active-elevate-2"
                          data-testid={`button-actions-${report.id}`}
                        >
                          <MoreVertical className="w-4 h-4 text-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleClone(report.id)} data-testid={`action-clone-${report.id}`}>
                          <Copy className="w-4 h-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRenameClick(report.id, report.name)} data-testid={`action-rename-${report.id}`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleEditTagsClick(report.id, report.tags || [])} 
                          data-testid={`action-edit-tags-${report.id}`}
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Edit Tags
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(report.id)}
                          className="text-destructive focus:text-destructive"
                          data-testid={`action-delete-${report.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="p-6 border-t border-card-border flex justify-end">
          <button
            onClick={() => {
              if (selectedReport && onOpenReport) {
                onOpenReport(selectedReport);
                onClose();
              }
            }}
            disabled={!selectedReport}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed text-label font-medium"
            data-testid="button-open-report"
          >
            Open
          </button>
        </div>
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Report</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newReportName}
              onChange={(e) => setNewReportName(e.target.value)}
              placeholder="Enter new report name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
              data-testid="input-rename-report"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              data-testid="button-cancel-rename"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!newReportName.trim()}
              data-testid="button-submit-rename"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tags</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag and press Enter"
              data-testid="input-tag"
            />
            {editingTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editingTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="gap-1" data-testid={`tag-${index}`}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-tag-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTagsDialogOpen(false)}
              data-testid="button-cancel-tags"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTagsSubmit}
              data-testid="button-submit-tags"
            >
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(ReportSelectorInner);
