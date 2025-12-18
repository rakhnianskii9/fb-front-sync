import { useState, useMemo, useEffect } from "react";
import logger from "@/lib/logger";
import { Plus, Search, MoreVertical, Pin, Copy, Tag, Trash2, PinOff, Clock, PlayCircle, CheckCircle, XCircle, GripVertical, X, Filter, Check, ExternalLink, ChevronRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns/format";
import { cn } from "@/lib/utils";
import { NoteEditor } from "@/components/NoteEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkspace } from "@/hooks/useWorkspace";
import { getActiveWorkspaceIdFromStorage } from "@/utils/flowiseSession";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { 
  selectUserNotes, 
  selectAINotes, 
  selectCurrentProjectId, 
  selectCurrentProjectNotes,
  selectCampaigns,
  selectAdSets,
  selectAds
} from "@/store/selectors";
import { addNote, deleteNote, toggleNotePin, duplicateNote, updateNote, fetchNotes } from "@/store/slices/notesSlice";
import { useToast } from "@/hooks/use-toast";
import type { Note, NoteRelatedTo } from "@shared/schema";

/**
 * Удаляет HTML-теги из строки, оставляя только текст
 * Безопасный метод без innerHTML (защита от XSS)
 */
function stripHtml(html: string): string {
  if (!html) return '';
  // Безопасный метод: регулярное выражение вместо innerHTML
  return html
    .replace(/<[^>]*>/g, '') // удаляем все теги
    .replace(/&nbsp;/g, ' ') // заменяем &nbsp;
    .replace(/&amp;/g, '&')  // декодируем &amp;
    .replace(/&lt;/g, '<')   // декодируем &lt;
    .replace(/&gt;/g, '>')   // декодируем &gt;
    .replace(/&quot;/g, '"') // декодируем &quot;
    .replace(/&#39;/g, "'") // декодируем &#39;
    .trim();
}

// Types for column filters
type SortDirection = 'asc' | 'desc';
type TextConditionOperator = 'contains' | 'not-contains' | 'equal';
type NumericConditionOperator = 'greater' | 'less' | 'equal' | 'between';
type StatusConditionOperator = 'status';

type ColumnSort = {
  direction: SortDirection;
};

type TextCondition = {
  type: 'text';
  operator: TextConditionOperator;
  value: string;
};

type NumericCondition = {
  type: 'numeric';
  operator: NumericConditionOperator;
  value: string;
  valueTo?: string;
};

type StatusCondition = {
  type: 'status';
  values: string[];
};

type DateCondition = {
  type: 'date';
  operator: 'before' | 'after' | 'on';
  value: string;
};

type ColumnCondition = TextCondition | NumericCondition | StatusCondition | DateCondition;

interface FilterMenuProps {
  columnId: string;
  columnType: 'text' | 'numeric' | 'status' | 'date';
  currentSort: ColumnSort | null;
  currentCondition: ColumnCondition | null;
  onApplySort: (sort: ColumnSort | null) => void;
  onApplyCondition: (condition: ColumnCondition | null) => void;
  onClose?: () => void;
}

//Note statuses
const NOTE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

const NOTE_PRIORITIES = [
  { value: 'high', label: '🔥🔥🔥' },
  { value: 'medium', label: '🔥🔥' },
  { value: 'low', label: '🔥' },
  { value: 'none', label: 'No Priority' },
];

function FilterMenu({ columnId, columnType, currentSort, currentCondition, onApplySort, onApplyCondition, onClose }: FilterMenuProps) {
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(currentSort?.direction || null);
  const [conditionOperator, setConditionOperator] = useState<string | null>(
    currentCondition ? (currentCondition.type === 'status' ? 'status' : currentCondition.operator) : null
  );
  const [inputValue, setInputValue] = useState<string>(
    currentCondition && 'value' in currentCondition ? currentCondition.value : ''
  );
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(currentCondition && currentCondition.type === 'status' ? currentCondition.values : [])
  );

  const handleApplySort = () => {
    if (sortDirection) {
      onApplySort({ direction: sortDirection });
    } else {
      onApplySort(null);
    }
  };

  const handleApplyCondition = () => {
    if (columnType === 'status' && selectedStatuses.size > 0) {
      onApplyCondition({ type: 'status', values: Array.from(selectedStatuses) });
    } else if (columnType === 'text' && conditionOperator && inputValue.trim()) {
      onApplyCondition({ type: 'text', operator: conditionOperator as TextConditionOperator, value: inputValue });
    } else if (columnType === 'date' && conditionOperator && inputValue) {
      onApplyCondition({ type: 'date', operator: conditionOperator as 'before' | 'after' | 'on', value: inputValue });
    } else if (!conditionOperator || (!inputValue.trim() && columnType !== 'date')) {
      onApplyCondition(null);
    }
  };

  const handleReset = () => {
    setSortDirection(null);
    setConditionOperator(null);
    setInputValue('');
    setSelectedStatuses(new Set());
    onApplySort(null);
    onApplyCondition(null);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const needsInput = conditionOperator && conditionOperator !== '';
  const statuses = columnId === 'status' ? NOTE_STATUSES : columnId === 'priority' ? NOTE_PRIORITIES : [];

  return (
    <div className="w-72 p-3 space-y-3">
      <div className="space-y-2 pb-2 border-b border-border">
        <div className="text-sm font-medium">Sort</div>
        <div className="flex gap-1">
          <button
            onClick={() => setSortDirection(sortDirection === 'desc' ? null : 'desc')}
            className={`flex-1 px-2.5 py-1.5 text-sm text-center rounded-md transition-colors ${
              sortDirection === 'desc'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted border border-input'
            }`}
          >
            {columnType === 'numeric' ? 'High→Low' : columnType === 'date' ? 'Newest→Oldest' : 'Z→A'}
          </button>
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? null : 'asc')}
            className={`flex-1 px-2.5 py-1.5 text-sm text-center rounded-md transition-colors ${
              sortDirection === 'asc'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted border border-input'
            }`}
          >
            {columnType === 'numeric' ? 'Low→High' : columnType === 'date' ? 'Oldest→Newest' : 'A→Z'}
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm font-medium">Conditions</div>
        {columnType === 'status' ? (
          <div className="space-y-1.5">
            {statuses.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={selectedStatuses.has(status.value)}
                  onCheckedChange={() => toggleStatus(status.value)}
                  className="bg-background border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor={`status-${status.value}`} className="cursor-pointer">
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Select
              value={conditionOperator || ''}
              onValueChange={(value) => setConditionOperator(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[200] bg-background">
                {columnType === 'date' ? (
                  <>
                    <SelectItem value="before">Before</SelectItem>
                    <SelectItem value="after">After</SelectItem>
                    <SelectItem value="on">On</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="not-contains">Does not contain</SelectItem>
                    <SelectItem value="equal">Equal to</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {needsInput && (
              columnType === 'date' ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8",
                        !inputValue && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      <span className="text-sm">
                        {inputValue ? format(new Date(inputValue), "dd.MM.yyyy") : "Select date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={inputValue ? new Date(inputValue) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setInputValue(date.toISOString());
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  placeholder="Enter text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="h-8 text-sm"
                />
              )
            )}
          </>
        )}
      </div>

      <div className="flex gap-1.5 pt-2">
        <Button size="sm" variant="outline" onClick={handleReset} className="flex-1 h-8 text-sm">
          Reset
        </Button>
        <Button 
          size="sm" 
          onClick={() => {
            handleApplySort();
            handleApplyCondition();
            onClose?.();
          }} 
          className="flex-1 h-8 text-sm"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}


interface SortableColumnHeaderProps {
  columnId: string;
  columnName: string;
  columnType: 'text' | 'numeric' | 'status' | 'date';
  currentSort: ColumnSort | null;
  currentCondition: ColumnCondition | null;
  onApplySort: (sort: ColumnSort | null) => void;
  onApplyCondition: (condition: ColumnCondition | null) => void;
}

function SortableColumnHeader({ 
  columnId, 
  columnName, 
  columnType,
  currentSort,
  currentCondition,
  onApplySort,
  onApplyCondition 
}: SortableColumnHeaderProps) {
  const [open, setOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasFilter = currentSort || currentCondition;

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider relative bg-muted z-20"
      data-testid={`table-header-${columnId}`}
    >
      <div className="flex items-center justify-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
        <span className="whitespace-nowrap">{columnName}</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button 
              className={`p-0.5 hover:bg-muted-foreground/10 rounded ${hasFilter ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`}
              data-testid={`button-filter-${columnId}`}
            >
              <Filter className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="start" sideOffset={5}>
            <FilterMenu
              columnId={columnId}
              columnType={columnType}
              currentSort={currentSort}
              currentCondition={currentCondition}
              onApplySort={onApplySort}
              onApplyCondition={onApplyCondition}
              onClose={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </th>
  );
}

export default function NotesPage() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { workspaceId: hookWorkspaceId } = useWorkspace();
  const effectiveWorkspaceId = hookWorkspaceId || getActiveWorkspaceIdFromStorage();
  const currentProjectId = useAppSelector(selectCurrentProjectId);
  const userNotes = useAppSelector(selectUserNotes);
  const aiNotes = useAppSelector(selectAINotes);
  const allProjectNotes = useAppSelector(selectCurrentProjectNotes);

  const campaigns = useAppSelector(selectCampaigns);
  const adsets = useAppSelector(selectAdSets);
  const ads = useAppSelector(selectAds);

  const selectableItems = useMemo(() => {
    return [
      ...campaigns.map(c => ({ type: 'campaign' as const, id: c.id, name: c.name || c.campaignId })),
      ...adsets.map(a => ({ type: 'adset' as const, id: a.id, name: a.name || a.adsetId })),
      ...ads.map(a => ({ type: 'ad' as const, id: a.id, name: a.name || a.adId })),
      // Creatives are not yet in store, skipping for now
    ];
  }, [campaigns, adsets, ads]);

  const [activeTab, setActiveTab] = useState<"user" | "ai">("user");
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'in_progress' | 'completed' | 'closed' | null>(null);

  useEffect(() => {
    if (effectiveWorkspaceId) {
      dispatch(fetchNotes(effectiveWorkspaceId));
    }
  }, [dispatch, effectiveWorkspaceId]);

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedNotes([]);
  }, [activeTab]);
  const [relatedDialogOpen, setRelatedDialogOpen] = useState(false);
  const [relatedSearchQuery, setRelatedSearchQuery] = useState("");
  const [selectedRelatedItems, setSelectedRelatedItems] = useState<NoteRelatedTo[]>([]);
  const [currentNoteForRelated, setCurrentNoteForRelated] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [currentNoteForTags, setCurrentNoteForTags] = useState<string | null>(null);
  const [deadlinePopoverOpen, setDeadlinePopoverOpen] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [columnSorts, setColumnSorts] = useState<Record<string, ColumnSort>>({});
  const [columnConditions, setColumnConditions] = useState<Record<string, ColumnCondition>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'title',
    'description',
    'status',
    'relatedTo',
    'priority',
    'deadline',
    'tags'
  ]);
  const [editingTitleNoteId, setEditingTitleNoteId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const currentNotes = activeTab === "user" ? userNotes : aiNotes;

  const statusCounts = useMemo(() => {
    return {
      pending: allProjectNotes.filter(n => n.status === 'pending').length,
      in_progress: allProjectNotes.filter(n => n.status === 'in_progress').length,
      completed: allProjectNotes.filter(n => n.status === 'completed').length,
      closed: allProjectNotes.filter(n => n.status === 'closed').length,
    };
  }, [allProjectNotes]);

  const filteredNotes = useMemo(() => {
    let result = [...currentNotes];

    // Apply status filter
    if (statusFilter) {
      result = result.filter(note => note.status === statusFilter);
    }

    // Apply column conditions
    Object.entries(columnConditions).forEach(([columnId, condition]) => {
      if (condition.type === 'status') {
        if (columnId === 'priority') {
          result = result.filter(note => condition.values.includes(note.priority));
        }
      } else if (condition.type === 'text') {
        result = result.filter(note => {
          let value = '';
          if (columnId === 'title') {
            value = note.title.toLowerCase();
          } else if (columnId === 'description') {
            value = note.description.toLowerCase();
          } else if (columnId === 'relatedTo') {
            value = note.relatedTo.map(item => `${item.type}: ${item.name}`).join(' ').toLowerCase();
          } else if (columnId === 'tags') {
            value = note.tags.join(', ').toLowerCase();
          }
          
          const filterValue = condition.value.toLowerCase();
          
          switch (condition.operator) {
            case 'contains':
              return value.includes(filterValue);
            case 'not-contains':
              return !value.includes(filterValue);
            case 'equal':
              return value === filterValue;
            default:
              return true;
          }
        });
      } else if (condition.type === 'date' && columnId === 'deadline') {
        result = result.filter(note => {
          if (!note.deadline) return condition.operator === 'on' ? false : true;
          
          const noteDate = new Date(note.deadline);
          const filterDate = new Date(condition.value);
          
          // Reset times to compare just dates
          noteDate.setHours(0, 0, 0, 0);
          filterDate.setHours(0, 0, 0, 0);
          
          switch (condition.operator) {
            case 'before':
              return noteDate < filterDate;
            case 'after':
              return noteDate > filterDate;
            case 'on':
              return noteDate.getTime() === filterDate.getTime();
            default:
              return true;
          }
        });
      }
    });

    // Apply column sorts
    Object.entries(columnSorts).forEach(([columnId, sort]) => {
      result = [...result].sort((a, b) => {
        let aVal: any, bVal: any;
        
        if (columnId === 'title') {
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
        } else if (columnId === 'relatedTo') {
          aVal = a.relatedTo.map(item => item.name).join(' ').toLowerCase();
          bVal = b.relatedTo.map(item => item.name).join(' ').toLowerCase();
        } else if (columnId === 'priority') {
          const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
        } else if (columnId === 'deadline') {
          aVal = a.deadline ? new Date(a.deadline).getTime() : 0;
          bVal = b.deadline ? new Date(b.deadline).getTime() : 0;
        } else if (columnId === 'description') {
          aVal = a.description.toLowerCase();
          bVal = b.description.toLowerCase();
        } else if (columnId === 'tags') {
          aVal = a.tags.join(' ').toLowerCase();
          bVal = b.tags.join(' ').toLowerCase();
        } else {
          aVal = '';
          bVal = '';
        }
        
        if (aVal === bVal) return 0;
        
        if (sort.direction === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    });

    // Always sort pinned first
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    return result;
  }, [currentNotes, statusFilter, columnSorts, columnConditions]);

  // Only show selected notes that are currently visible
  const visibleSelectedNotes = useMemo(() => {
    const visibleIds = new Set(filteredNotes.map(note => note.id));
    return selectedNotes.filter(id => visibleIds.has(id));
  }, [selectedNotes, filteredNotes]);

  const filteredSelectableItems = useMemo(() => {
    return selectableItems.filter(item =>
      item.name.toLowerCase().includes(relatedSearchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(relatedSearchQuery.toLowerCase())
    );
  }, [relatedSearchQuery, selectableItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDelete = (noteId: string) => {
    if (!currentProjectId || !effectiveWorkspaceId) return;
    dispatch(deleteNote({ id: noteId, workspaceId: effectiveWorkspaceId }));
    toast({
      title: "Note deleted",
      description: "The note has been removed successfully",
    });
  };

  const handleDuplicate = (noteId: string) => {
    if (!currentProjectId || !effectiveWorkspaceId) return;
    dispatch(duplicateNote({ id: noteId, workspaceId: effectiveWorkspaceId }));
    toast({
      title: "Note duplicated",
      description: "A copy of the note has been created",
    });
  };

  const handleTogglePin = (noteId: string) => {
    if (!currentProjectId || !effectiveWorkspaceId) return;
    const note = currentNotes.find(n => n.id === noteId);
    if (note) {
      dispatch(toggleNotePin({ id: noteId, workspaceId: effectiveWorkspaceId, pinned: !note.pinned }));
    }
  };

  const handleOpenNote = (noteId: string) => {
    const note = currentNotes.find(n => n.id === noteId);
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.description);
      setNoteEditorOpen(true);
    }
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteEditorOpen(true);
  };

  const handleSaveNote = async () => {
    logger.log('[NotesPage] handleSaveNote called:', { currentProjectId, effectiveWorkspaceId, noteTitle, noteContent });
    
    if (!currentProjectId || !effectiveWorkspaceId) {
      console.warn('[NotesPage] Missing projectId or workspaceId:', { currentProjectId, effectiveWorkspaceId });
      toast({
        title: "Error",
        description: "Project or workspace not selected",
        variant: "destructive",
      });
      return;
    }
    
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast({
        title: "Error",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (editingNote) {
        // Update existing note
        await dispatch(updateNote({
          id: editingNote.id,
          data: {
            workspaceId: effectiveWorkspaceId,
            title: noteTitle.trim(),
            description: noteContent.trim(),
          }
        })).unwrap();
        toast({
          title: "Note updated",
          description: "Your changes have been saved",
        });
      } else {
        // Create new note
        logger.log('[NotesPage] Creating note with:', {
          workspaceId: effectiveWorkspaceId,
          projectId: currentProjectId,
          title: noteTitle.trim(),
          description: noteContent.trim(),
        });
        await dispatch(addNote({
          workspaceId: effectiveWorkspaceId,
          projectId: currentProjectId,
          title: noteTitle.trim(),
          description: noteContent.trim(),
          type: 'user',
          priority: 'medium',
          status: 'pending',
          relatedTo: [],
          tags: [],
          pinned: false,
        })).unwrap();
        toast({
          title: "Note created",
          description: "New note has been added",
        });
      }
      
      setNoteEditorOpen(false);
      setEditingNote(null);
      setNoteTitle("");
      setNoteContent("");
    } catch (error: any) {
      logger.error('[NotesPage] Failed to save note:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save note",
        variant: "destructive",
      });
    }
  };

  const toggleSelectNote = (noteId: string) => {
    setSelectedNotes(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNotes.length === filteredNotes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(filteredNotes.map(note => note.id));
    }
  };

  const handleCloseSelected = () => {
    if (!currentProjectId || !effectiveWorkspaceId) return;

    visibleSelectedNotes.forEach(noteId => {
      dispatch(updateNote({
        id: noteId,
        data: { workspaceId: effectiveWorkspaceId, status: 'closed' }
      }));
    });

    toast({
      title: "Notes closed",
      description: `${visibleSelectedNotes.length} note(s) closed successfully`,
    });

    setSelectedNotes([]);
  };

  const handleStatusCardClick = (status: 'pending' | 'in_progress' | 'completed' | 'closed') => {
    if (statusFilter === status) {
      setStatusFilter(null);
    } else {
      setStatusFilter(status);
    }
  };

  const handleStartEditTitle = (noteId: string, currentTitle: string) => {
    setEditingTitleNoteId(noteId);
    setEditingTitleValue(currentTitle);
  };

  const handleSaveTitle = (noteId: string) => {
    if (!currentProjectId || !effectiveWorkspaceId || !editingTitleValue.trim()) {
      setEditingTitleNoteId(null);
      return;
    }

    dispatch(updateNote({
      id: noteId,
      data: { workspaceId: effectiveWorkspaceId, title: editingTitleValue.trim() }
    }));

    setEditingTitleNoteId(null);
    setEditingTitleValue("");
  };

  const handleCancelEditTitle = () => {
    setEditingTitleNoteId(null);
    setEditingTitleValue("");
  };

  const handleOpenRelatedDialogForNote = (noteId: string) => {
    if (!currentProjectId) return;
    const note = currentNotes.find(n => n.id === noteId);
    if (note) {
      setSelectedRelatedItems(note.relatedTo || []);
      setRelatedSearchQuery("");
      setExpandedItems([]);
      setCurrentNoteForRelated(noteId);
      setRelatedDialogOpen(true);
    }
  };

  const toggleExpandItem = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleToggleRelatedItem = (item: NoteRelatedTo) => {
    const exists = selectedRelatedItems.find(i => i.id === item.id);
    if (exists) {
      setSelectedRelatedItems(selectedRelatedItems.filter(i => i.id !== item.id));
    } else {
      setSelectedRelatedItems([...selectedRelatedItems, item]);
    }
  };

  const handleRemoveRelatedItem = (itemId: string) => {
    setSelectedRelatedItems(selectedRelatedItems.filter(i => i.id !== itemId));
  };

  const handleSaveRelatedItems = () => {
    if (!currentProjectId || !effectiveWorkspaceId) return;
    
    if (currentNoteForRelated) {
      dispatch(updateNote({
        id: currentNoteForRelated,
        data: { workspaceId: effectiveWorkspaceId, relatedTo: selectedRelatedItems }
      }));
    }
    
    toast({
      title: "Related items updated",
      description: `${selectedRelatedItems.length} items selected`,
    });
    setRelatedDialogOpen(false);
    setCurrentNoteForRelated(null);
  };

  const handleStatusChange = (noteId: string, status: Note['status']) => {
    if (!currentProjectId || !effectiveWorkspaceId) return;
    dispatch(updateNote({
      id: noteId,
      data: { workspaceId: effectiveWorkspaceId, status }
    }));
    toast({
      title: "Status updated",
      description: "Note status has been updated successfully.",
    });
  };

  const handlePriorityChange = (noteId: string, priority: Note['priority']) => {
    if (!currentProjectId || !effectiveWorkspaceId) return;
    dispatch(updateNote({
      id: noteId,
      data: { workspaceId: effectiveWorkspaceId, priority }
    }));
  };

  const handleOpenTagsDialog = (noteId: string) => {
    if (!currentProjectId) return;
    const note = currentNotes.find(n => n.id === noteId);
    if (note) {
      setEditingTags(note.tags || []);
      setTagInput("");
      setCurrentNoteForTags(noteId);
      setTagsDialogOpen(true);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !editingTags.includes(trimmedTag)) {
      setEditingTags([...editingTags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditingTags(editingTags.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSaveTags = () => {
    if (!currentProjectId || !effectiveWorkspaceId || !currentNoteForTags) return;
    
    dispatch(updateNote({
      id: currentNoteForTags,
      data: { workspaceId: effectiveWorkspaceId, tags: editingTags }
    }));
    
    toast({
      title: "Tags updated",
      description: "Note tags have been saved",
    });
    setTagsDialogOpen(false);
    setCurrentNoteForTags(null);
  };

  const getPriorityColor = (priority: Note['priority']) => {
    return 'bg-transparent text-foreground';
  };

  const getPriorityLabel = (priority: Note['priority']) => {
    switch (priority) {
      case 'high': return '🔥🔥🔥';
      case 'medium': return '🔥🔥';
      case 'low': return '🔥';
      case 'none': return '';
      default: return '';
    }
  };

  const getTagColor = (tag: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    ];
    const index = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Build hierarchical tree from related items
  const buildRelatedTree = (items: NoteRelatedTo[]) => {
    const hierarchy = ['campaign', 'adset', 'ad', 'creative'];
    const grouped: Record<string, NoteRelatedTo[]> = {};
    
    items.forEach(item => {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item);
    });

    const result: { item: NoteRelatedTo; level: number }[] = [];
    
    hierarchy.forEach((type, level) => {
      if (grouped[type]) {
        grouped[type].forEach(item => {
          result.push({ item, level });
        });
      }
    });

    return result;
  };

  const getColumnContent = (note: Note, columnId: string) => {
    switch (columnId) {
      case 'title':
        return (
          <div className="flex justify-center">
            {editingTitleNoteId === note.id ? (
              <Input
                value={editingTitleValue}
                onChange={(e) => setEditingTitleValue(e.target.value)}
                onBlur={() => handleSaveTitle(note.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveTitle(note.id);
                  } else if (e.key === 'Escape') {
                    handleCancelEditTitle();
                  }
                }}
                autoFocus
                className="h-8 text-sm"
                data-testid={`input-edit-title-${note.id}`}
              />
            ) : (
              <span 
                className="font-medium text-foreground text-sm cursor-pointer hover:opacity-70" 
                onClick={() => handleStartEditTitle(note.id, note.title)}
                data-testid={`text-title-${note.id}`}
              >
                {note.title}
              </span>
            )}
          </div>
        );
      case 'description':
        const plainText = stripHtml(note.description);
        return (
          <div className="flex justify-center">
            <div 
              className="max-w-[200px] h-[40px] overflow-hidden text-ellipsis text-sm text-muted-foreground cursor-pointer hover:opacity-70"
              onClick={() => handleOpenNote(note.id)}
              title={plainText}
              data-testid={`text-description-${note.id}`}
            >
              <span className="line-clamp-2">{plainText || 'No description'}</span>
            </div>
          </div>
        );
      case 'status':
        const getStatusColor = (status: Note['status']) => {
          switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
          }
        };
        const getStatusLabel = (status: Note['status']) => {
          switch (status) {
            case 'pending': return 'Pending';
            case 'in_progress': return 'In Progress';
            case 'completed': return 'Completed';
            case 'closed': return 'Closed';
            default: return status;
          }
        };
        return (
          <div className="flex justify-center">
            <Select
              value={note.status}
              onValueChange={(value) => handleStatusChange(note.id, value as Note['status'])}
            >
              <SelectTrigger 
                className={`h-7 w-[130px] ${getStatusColor(note.status)} border-0`}
                data-testid={`select-status-${note.id}`}
              >
                <SelectValue>{getStatusLabel(note.status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" data-testid={`status-option-pending-${note.id}`}>
                  Pending
                </SelectItem>
                <SelectItem value="in_progress" data-testid={`status-option-in-progress-${note.id}`}>
                  In Progress
                </SelectItem>
                <SelectItem value="completed" data-testid={`status-option-completed-${note.id}`}>
                  Completed
                </SelectItem>
                <SelectItem value="closed" data-testid={`status-option-closed-${note.id}`}>
                  Closed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'relatedTo':
        return (
          <div className="flex justify-center">
            <div 
              className="cursor-pointer hover:opacity-80 text-xs max-w-full overflow-hidden"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenRelatedDialogForNote(note.id);
              }}
              data-testid={`related-items-${note.id}`}
            >
              {note.relatedTo.length === 0 ? (
                <span className="text-muted-foreground">Click to add</span>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {note.relatedTo.slice(0, 3).map((item, idx) => (
                    <span key={idx} className="truncate text-xs" title={item.name}>
                      <span className="text-muted-foreground">{item.type}:</span> {item.name}
                    </span>
                  ))}
                  {note.relatedTo.length > 3 && (
                    <span className="text-muted-foreground text-xs">+{note.relatedTo.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'priority':
        return (
          <div className="flex justify-center">
            <Select
              value={note.priority}
              onValueChange={(value) => handlePriorityChange(note.id, value as Note['priority'])}
            >
              <SelectTrigger 
                className={`h-7 w-[110px] ${getPriorityColor(note.priority)} border-0`}
                data-testid={`select-priority-${note.id}`}
              >
                <SelectValue>{getPriorityLabel(note.priority)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high" data-testid={`priority-option-high-${note.id}`}>
                  🔥🔥🔥
                </SelectItem>
                <SelectItem value="medium" data-testid={`priority-option-medium-${note.id}`}>
                  🔥🔥
                </SelectItem>
                <SelectItem value="low" data-testid={`priority-option-low-${note.id}`}>
                  🔥
                </SelectItem>
                <SelectItem value="none" data-testid={`priority-option-none-${note.id}`}>
                  No Priority
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'deadline':
        return (
          <div className="flex justify-center">
            <Popover 
              open={deadlinePopoverOpen === note.id} 
              onOpenChange={(open) => setDeadlinePopoverOpen(open ? note.id : null)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal h-8 px-3",
                    !note.deadline && "text-muted-foreground"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  <span className="text-sm">
                    {note.deadline ? format(new Date(note.deadline), "dd.MM.yyyy") : "Select date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={note.deadline ? new Date(note.deadline) : undefined}
                  onSelect={(date) => {
                    if (date && effectiveWorkspaceId) {
                      // При выборе даты автоматически включаем уведомления
                      dispatch(updateNote({
                        id: note.id,
                        data: { 
                          workspaceId: effectiveWorkspaceId, 
                          deadline: date.toISOString(),
                          reminderEnabled: true 
                        }
                      }));
                      setDeadlinePopoverOpen(null);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      case 'tags':
        return (
          <div className="flex justify-center">
            <div 
              className="flex flex-wrap gap-1 cursor-pointer hover:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTagsDialog(note.id);
              }}
              data-testid={`tags-cell-${note.id}`}
            >
              {note.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTagColor(tag)}`}
                  data-testid={`badge-tag-${note.id}-${idx}`}
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                  +{note.tags.length - 2}
                </span>
              )}
              {note.tags.length === 0 && (
                <span className="text-xs text-muted-foreground">Click to add</span>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getColumnName = (columnId: string): string => {
    const names: Record<string, string> = {
      title: 'Title',
      description: 'Note',
      status: 'Status',
      relatedTo: 'Related To',
      priority: 'Priority',
      deadline: 'Deadline',
      tags: 'Tags',
    };
    return names[columnId] || columnId;
  };

  if (!currentProjectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Please select a project</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-display-lg text-foreground">User Notes & AI Insights</h1>
            {visibleSelectedNotes.length > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {visibleSelectedNotes.length} selected
                </span>
                <Button 
                  onClick={handleCloseSelected} 
                  variant="destructive"
                  data-testid="button-close-selected" 
                  size="sm"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Close All
                </Button>
              </div>
            ) : (
              <Button onClick={handleCreateNote} data-testid="button-add-note" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            )}
          </div>
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card 
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'pending' ? 'ring-2 ring-yellow-600 dark:ring-yellow-400' : ''
              }`}
              onClick={() => handleStatusCardClick('pending')}
              data-testid="card-status-pending"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold text-foreground">{statusCounts.pending}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </Card>
            
            <Card 
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'in_progress' ? 'ring-2 ring-blue-600 dark:ring-blue-400' : ''
              }`}
              onClick={() => handleStatusCardClick('in_progress')}
              data-testid="card-status-in-progress"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold text-foreground">{statusCounts.in_progress}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>
            
            <Card 
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'completed' ? 'ring-2 ring-green-600 dark:ring-green-400' : ''
              }`}
              onClick={() => handleStatusCardClick('completed')}
              data-testid="card-status-completed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-foreground">{statusCounts.completed}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                statusFilter === 'closed' ? 'ring-2 ring-red-600 dark:ring-red-400' : ''
              }`}
              onClick={() => handleStatusCardClick('closed')}
              data-testid="card-status-closed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Closed</p>
                  <p className="text-3xl font-bold text-foreground">{statusCounts.closed}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Tabs Header - directly above table */}
      <div className="flex-none bg-background">
        <div className="px-6 flex gap-4">
          <button
            onClick={() => setActiveTab("user")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === "user"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-user-notes"
          >
            <span className="font-medium">User Notes</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === "ai"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-ai-recommendations"
          >
            <span className="font-medium">AI</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {activeTab === "user"
                ? "No user notes yet. Click 'Add Note' to create one."
                : "No AI recommendations yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="w-full" data-testid="table-notes">
                  <thead className="bg-muted sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 text-left sticky left-0 bg-muted z-30 w-12" data-testid="table-header-checkbox">
                        <Checkbox
                          checked={selectedNotes.length === filteredNotes.length && filteredNotes.length > 0}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <SortableContext
                        items={columnOrder}
                        strategy={horizontalListSortingStrategy}
                      >
                        {columnOrder.map((columnId) => {
                          const columnType = (columnId === 'priority' || columnId === 'status') ? 'status' : 
                                           (columnId === 'created') ? 'date' : 'text';
                          return (
                            <SortableColumnHeader
                              key={columnId}
                              columnId={columnId}
                              columnName={getColumnName(columnId)}
                              columnType={columnType}
                              currentSort={columnSorts[columnId] || null}
                              currentCondition={columnConditions[columnId] || null}
                              onApplySort={(sort) => {
                                setColumnSorts(prev => {
                                  const updated = { ...prev };
                                  if (sort) {
                                    updated[columnId] = sort;
                                  } else {
                                    delete updated[columnId];
                                  }
                                  return updated;
                                });
                              }}
                              onApplyCondition={(condition) => {
                                setColumnConditions(prev => {
                                  const updated = { ...prev };
                                  if (condition) {
                                    updated[columnId] = condition;
                                  } else {
                                    delete updated[columnId];
                                  }
                                  return updated;
                                });
                              }}
                            />
                          );
                        })}
                      </SortableContext>
                      <th className="w-24 px-6 py-3 bg-muted z-20"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {filteredNotes.map((note) => (
                      <tr
                        key={note.id}
                        className="hover:bg-muted/50 transition-colors h-[60px] max-h-[60px]"
                        data-testid={`row-note-${note.id}`}
                      >
                        <td className="px-4 py-4 sticky left-0 bg-background">
                          <Checkbox
                            checked={selectedNotes.includes(note.id)}
                            onCheckedChange={() => toggleSelectNote(note.id)}
                            data-testid={`checkbox-note-${note.id}`}
                          />
                        </td>
                        {columnOrder.map((columnId) => (
                          <td key={columnId} className="px-6 py-4 text-center">
                            {getColumnContent(note, columnId)}
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(note.id);
                              }}
                              className="p-2 rounded hover-elevate active-elevate-2"
                              data-testid={`button-pin-${note.id}`}
                            >
                              <Pin className={`w-4 h-4 flex-shrink-0 ${note.pinned ? 'text-primary' : 'text-muted-foreground'}`} />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-2 rounded hover-elevate active-elevate-2 hover:bg-muted transition-colors"
                                  data-testid={`button-menu-${note.id}`}
                                >
                                  <MoreVertical className="w-4 h-4 text-foreground flex-shrink-0" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(note.id);
                                  }}
                                  data-testid={`menu-copy-${note.id}`}
                                  className="cursor-pointer"
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTagsDialog(note.id);
                                  }}
                                  data-testid={`menu-tag-${note.id}`}
                                  className="cursor-pointer"
                                >
                                  <Tag className="w-4 h-4 mr-2" />
                                  Edit Tags
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(note.id);
                                  }}
                                  data-testid={`menu-delete-${note.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DndContext>
            </div>
          </div>
        )}
      </div>

      {/* Related Items Dialog */}
      <Dialog open={relatedDialogOpen} onOpenChange={setRelatedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Related Items</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={relatedSearchQuery}
              onChange={(e) => setRelatedSearchQuery(e.target.value)}
              placeholder="Search campaigns, ad sets, ads, creatives..."
              data-testid="input-search-related"
              className="mb-4"
            />
            
            {selectedRelatedItems.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Selected Items:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRelatedItems.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1" data-testid={`selected-related-${index}`}>
                      {item.type}: {item.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveRelatedItem(item.id)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-related-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="border rounded-md max-h-80 overflow-y-auto">
              {/* Campaigns (top level) */}
              {filteredSelectableItems.filter(item => item.type === 'campaign').map((campaign, index) => {
                const isSelected = selectedRelatedItems.some(i => i.id === campaign.id);
                const isExpanded = expandedItems.includes(campaign.id);
                
                return (
                  <div key={campaign.id}>
                    <div
                      className={`flex items-center justify-between p-3 border-b cursor-pointer hover:bg-muted/50 ${
                        isSelected ? 'bg-muted' : ''
                      }`}
                      data-testid={`selectable-item-campaign-${index}`}
                    >
                      <div className="flex items-center gap-3 flex-1" onClick={() => handleToggleRelatedItem(campaign)}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRelatedItem(campaign)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <p className="text-sm font-medium">{campaign.name}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandItem(campaign.id);
                        }}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                    
                    {/* Ad Sets (when campaign expanded) */}
                    {isExpanded && filteredSelectableItems.filter(item => item.type === 'adset').map((adset, adsetIdx) => {
                      const adsetSelected = selectedRelatedItems.some(i => i.id === adset.id);
                      const adsetExpanded = expandedItems.includes(adset.id);
                      
                      return (
                        <div key={adset.id}>
                          <div
                            className={`flex items-center justify-between p-3 border-b cursor-pointer hover:bg-muted/50 ${
                              adsetSelected ? 'bg-muted' : ''
                            }`}
                            style={{ paddingLeft: '32px' }}
                            data-testid={`selectable-item-adset-${adsetIdx}`}
                          >
                            <div className="flex items-center gap-3 flex-1" onClick={() => handleToggleRelatedItem(adset)}>
                              <Checkbox
                                checked={adsetSelected}
                                onCheckedChange={() => handleToggleRelatedItem(adset)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <p className="text-sm font-medium">{adset.name}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandItem(adset.id);
                              }}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <ChevronRight className={`w-4 h-4 transition-transform ${adsetExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </div>
                          
                          {/* Ads (when adset expanded) */}
                          {adsetExpanded && filteredSelectableItems.filter(item => item.type === 'ad').map((ad, adIdx) => {
                            const adSelected = selectedRelatedItems.some(i => i.id === ad.id);
                            const adExpanded = expandedItems.includes(ad.id);
                            
                            return (
                              <div key={ad.id}>
                                <div
                                  className={`flex items-center justify-between p-3 border-b cursor-pointer hover:bg-muted/50 ${
                                    adSelected ? 'bg-muted' : ''
                                  }`}
                                  style={{ paddingLeft: '64px' }}
                                  data-testid={`selectable-item-ad-${adIdx}`}
                                >
                                  <div className="flex items-center gap-3 flex-1" onClick={() => handleToggleRelatedItem(ad)}>
                                    <Checkbox
                                      checked={adSelected}
                                      onCheckedChange={() => handleToggleRelatedItem(ad)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <p className="text-sm font-medium">{ad.name}</p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandItem(ad.id);
                                    }}
                                    className="p-1 hover:bg-muted rounded"
                                  >
                                    <ChevronRight className={`w-4 h-4 transition-transform ${adExpanded ? 'rotate-90' : ''}`} />
                                  </button>
                                </div>
                                
                                {/* TODO: Creatives (when ad expanded) - not yet in store */}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRelatedItems([]);
                setRelatedDialogOpen(false);
              }}
              data-testid="button-clear-related"
            >
              Clear
            </Button>
            <Button
              onClick={handleSaveRelatedItems}
              data-testid="button-save-related"
            >
              Save ({selectedRelatedItems.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags Dialog */}
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
                  <Badge key={index} variant="secondary" className="gap-1" data-testid={`editing-tag-${index}`}>
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
              onClick={handleSaveTags}
              data-testid="button-save-tags"
            >
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Editor Dialog */}
      <Dialog open={noteEditorOpen} onOpenChange={setNoteEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "Create Note"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                data-testid="input-note-title"
              />
            </div>
            <NoteEditor
              content={noteContent}
              onChange={setNoteContent}
              placeholder="Start writing your note..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteEditorOpen(false)}
              data-testid="button-cancel-note"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={!noteTitle.trim()}
              data-testid="button-save-note"
            >
              {editingNote ? "Save Changes" : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
