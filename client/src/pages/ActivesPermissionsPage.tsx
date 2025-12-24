import { useState, useEffect, useMemo, useCallback } from "react";
import logger from "@/lib/logger";
import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Facebook, Database, Link2, Globe, MessageSquare, ShoppingBag, RefreshCw, Copy, GripVertical, Filter, Check, ExternalLink, AlertCircle, Activity, TrendingUp, Target, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/useWorkspace";
import TabNavigation from "@/components/TabNavigation";
import { TestEventModal } from "@/components/TestEventModal";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  selectPermissionGroups,
  selectAccounts,
  selectPixels,
  selectAudiences,
  selectUserSettingsData,
  selectDatasetInfo,
  selectPixelsTestEventState,
  selectCapiEvents,
  selectCapiEventsTotal,
  selectCapiEventsFilters,
  selectCapiEventsLoading,
  selectCapiEventsError,
  selectCapiEventsDetail,
  selectCapiEventsSelectedId,
} from "@/store/selectors";
import { setRefreshFrequency, togglePermissionGroup, connectPermissionGroup, fetchPermissionGroups } from "@/store/slices/permissionsSlice";
import { setAccounts } from "@/store/slices/accountsSlice";
import { resetTestEventState } from "@/store/slices/pixelsSlice";
import { setAudiences } from "@/store/slices/audiencesSlice";
import { fetchAdAccounts } from "@/store/slices/accountsThunks";
import { fetchPixels, sendPixelTestEventThunk } from "@/store/thunks/pixelsThunks";
import fbAdsApi from "@/api/fbAds";
import { fetchAudiences } from "@/store/thunks/audiencesThunks";
import { fetchUserSettings, fetchSystemUsers } from "@/store/thunks/settingsThunks";
import {
  fetchCapiEvents,
  fetchCapiEventDetail,
  updateFilters as updateCapiEventsFilters,
  setPagination as setCapiEventsPagination,
  setSelectedEventId,
  resetEventDetail,
  type CapiEventsDatePreset,
} from "@/store/slices/capiEventsSlice";
import type { CapiEventStatus } from "@/api/fbAds";
import type { PermissionGroup } from "@/store/slices/permissionsSlice";
import { copyTextToClipboard } from "@/utils/clipboard";
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
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DATASET_ICON_MAP = {
  database: Database,
  link: Link2,
  globe: Globe,
  messageSquare: MessageSquare,
  shoppingBag: ShoppingBag,
} as const;

type DatasetIconKey = keyof typeof DATASET_ICON_MAP;

type DatasetInfoSource = {
  id: string;
  icon: DatasetIconKey;
  label: string;
  value: string;
  isLink?: boolean;
  status?: 'active' | 'inactive' | null;
};

const DEFAULT_DATASET_INFO: DatasetInfoSource[] = [
  { id: 'data-group', icon: 'database', label: 'Data Group ID', value: '1674329973450794', status: null },
  { id: 'integrations', icon: 'link', label: '3 active integrations', value: 'Manage integrations', isLink: true, status: 'active' },
  { id: 'sites', icon: 'globe', label: 'Sites', value: 'example.com, shop.example.com', status: 'active' },
  { id: 'whatsapp', icon: 'messageSquare', label: 'WhatsApp Business Account ID', value: '639771769064308', status: null },
  { id: 'catalog', icon: 'shoppingBag', label: '1 connected catalog', value: 'Manage status', isLink: true, status: 'active' },
];

const CAPI_STATUS_OPTIONS: Array<{ label: string; value: CapiEventStatus | 'all' }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Queued', value: 'queued' },
  { label: 'Sent', value: 'sent' },
  { label: 'Failed', value: 'failed' },
];

const CAPI_DATE_PRESET_OPTIONS: Array<{ label: string; value: CapiEventsDatePreset }> = [
  { label: '24h', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

const STATUS_STYLES: Record<CapiEventStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200',
  },
  queued: {
    label: 'Queued',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200',
  },
  sent: {
    label: 'Sent',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-200',
  },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString();
};

const getQualityClassName = (score: number | null) => {
  if (score === null || typeof score === 'undefined') {
    return 'bg-muted text-muted-foreground';
  }
  if (score >= 80) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200';
  }
  if (score >= 60) {
    return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200';
  }
  if (score >= 40) {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200';
  }
  return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200';
};

const formatQualityLabel = (score: number | null) => {
  if (score === null || typeof score === 'undefined') return 'n/a';
  return `${Math.round(score)} EMQ`;
};

interface SortableHeaderProps {
  id: string;
  children: React.ReactNode;
  columnType?: 'text' | 'numeric' | 'status';
  currentSort?: ColumnSort | null;
  currentCondition?: ColumnCondition | null;
  onApplySort?: (sort: ColumnSort | null) => void;
  onApplyCondition?: (condition: ColumnCondition | null) => void;
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

type ColumnCondition = TextCondition | NumericCondition | StatusCondition;

type DatasetInfoCard = {
  id: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  isLink?: boolean;
  status?: 'active' | 'inactive' | null;
};

interface FilterMenuProps {
  columnId: string;
  columnType: 'text' | 'numeric' | 'status';
  currentSort: ColumnSort | null;
  currentCondition: ColumnCondition | null;
  onApplySort: (sort: ColumnSort | null) => void;
  onApplyCondition: (condition: ColumnCondition | null) => void;
  onClose?: () => void;
}

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
    } else if (columnType === 'numeric' && conditionOperator && inputValue.trim()) {
      onApplyCondition({ type: 'numeric', operator: conditionOperator as NumericConditionOperator, value: inputValue });
    } else if (!conditionOperator || !inputValue.trim()) {
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
    onClose?.();
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

  const needsInput = conditionOperator && conditionOperator !== 'status';
  const hasFilter = currentSort || currentCondition;

  return (
    <div className="min-w-[240px] p-3">
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-xs font-medium mb-2">Sort</div>
          <div className="flex gap-1">
            <Button 
              variant={sortDirection === 'asc' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSortDirection(prev => prev === 'asc' ? null : 'asc')}
              className={`flex-1 ${sortDirection !== 'asc' ? 'bg-background' : ''}`}
            >
              A→Z
            </Button>
            <Button 
              variant={sortDirection === 'desc' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSortDirection(prev => prev === 'desc' ? null : 'desc')}
              className={`flex-1 ${sortDirection !== 'desc' ? 'bg-background' : ''}`}
            >
              Z→A
            </Button>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium mb-2">Filter</div>
          {columnType === 'text' && (
            <div className="space-y-2">
              <select 
                className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
                value={conditionOperator || ''}
                onChange={(e) => setConditionOperator(e.target.value || null)}
              >
                <option value="">No filter</option>
                <option value="contains">Contains</option>
                <option value="not-contains">Does not contain</option>
                <option value="equal">Is equal to</option>
              </select>
              {needsInput && (
                <Input 
                  placeholder="Enter value..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          )}
          {columnType === 'numeric' && (
            <div className="space-y-2">
              <select 
                className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
                value={conditionOperator || ''}
                onChange={(e) => setConditionOperator(e.target.value || null)}
              >
                <option value="">No filter</option>
                <option value="greater">Greater than</option>
                <option value="less">Less than</option>
                <option value="equal">Equal to</option>
              </select>
              {needsInput && (
                <Input 
                  type="number"
                  placeholder="Enter value..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          )}
          {columnType === 'status' && (
            <div className="space-y-1">
              {['active', 'inactive', 'paused'].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors"
                >
                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedStatuses.has(status) ? 'bg-primary border-primary' : 'bg-background border-input'}`}>
                    {selectedStatuses.has(status) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className="capitalize">{status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={handleReset} className="flex-1">
            Reset
          </Button>
          <Button size="sm" onClick={() => { handleApplySort(); handleApplyCondition(); onClose?.(); }} className="flex-1">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortableTableHeader({ id, children, columnType, currentSort, currentCondition, onApplySort, onApplyCondition }: SortableHeaderProps) {
  const [open, setOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
    >
      <div className="flex items-center justify-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
        <span className="whitespace-nowrap">{children}</span>
        {columnType && onApplySort && onApplyCondition && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button 
                className={`p-0.5 hover:bg-muted-foreground/10 rounded ${hasFilter ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`}
                data-testid={`button-filter-${id}`}
              >
                <Filter className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start" sideOffset={5}>
              <FilterMenu
                columnId={id}
                columnType={columnType}
                currentSort={currentSort || null}
                currentCondition={currentCondition || null}
                onApplySort={onApplySort}
                onApplyCondition={onApplyCondition}
                onClose={() => setOpen(false)}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </th>
  );
}

export default function ActivesPermissionsPage() {
  const dispatch = useAppDispatch();
  const { workspaceId } = useWorkspace();
  const permissionGroups = useAppSelector(selectPermissionGroups);
  const adAccountsRaw = useAppSelector(selectAccounts);
  const pixelsRaw = useAppSelector(selectPixels);
  const audiencesRaw = useAppSelector(selectAudiences);
  const userSettings = useAppSelector(selectUserSettingsData);
  const datasetInfoState = useAppSelector(selectDatasetInfo);
  const pixelsTestEventState = useAppSelector(selectPixelsTestEventState);
  const capiEvents = useAppSelector(selectCapiEvents);
  const capiEventsTotal = useAppSelector(selectCapiEventsTotal);
  const capiEventsFilters = useAppSelector(selectCapiEventsFilters);
  const capiEventsLoading = useAppSelector(selectCapiEventsLoading);
  const capiEventsError = useAppSelector(selectCapiEventsError);
  const capiEventsDetail = useAppSelector(selectCapiEventsDetail);
  const capiEventsSelectedId = useAppSelector(selectCapiEventsSelectedId);

  // Защита от undefined - всегда работаем с массивами
  const adAccounts = Array.isArray(adAccountsRaw) ? adAccountsRaw : [];
  const pixels = Array.isArray(pixelsRaw) ? pixelsRaw : [];
  const audiences = Array.isArray(audiencesRaw) ? audiencesRaw : [];
  const eventsCount = capiEventsTotal || 0;
  const statusKey = capiEventsFilters.status.join(',');
  const pixelKey = capiEventsFilters.pixelIds.join(',');
  const datasetKey = capiEventsFilters.datasetIds.join(',');
  const actionSourceKey = capiEventsFilters.actionSources.join(',');
  const selectedStatusValue: CapiEventStatus | 'all' = capiEventsFilters.status[0] || 'all';
  const totalPages = capiEventsFilters.limit
    ? Math.max(1, Math.ceil(Math.max(eventsCount, 0) / (capiEventsFilters.limit || 1)))
    : 1;
  const currentPage = capiEventsFilters.limit
    ? Math.floor(capiEventsFilters.offset / capiEventsFilters.limit) + 1
    : 1;
  const rangeStart = eventsCount ? capiEventsFilters.offset + 1 : 0;
  const rangeEnd = eventsCount
    ? Math.min(capiEventsFilters.offset + capiEvents.length, eventsCount)
    : 0;
  const isTestEventsOnly = Boolean(capiEventsFilters.isTestEvent);
  const isEventDetailOpen = Boolean(capiEventsSelectedId);
  
  const [activeTab, setActiveTab] = useState('accounts');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [token, setToken] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [selectedPixelId, setSelectedPixelId] = useState<string>('');
  const [appliedPixelId, setAppliedPixelId] = useState<string>('');
  const [testEventCode, setTestEventCode] = useState<string>('');
  const [testEventCodeApplied, setTestEventCodeApplied] = useState<boolean>(false);
  const [selectedEventType, setSelectedEventType] = useState<string>('Purchase');
  const [connectionStatus, setConnectionStatus] = useState<'active' | 'pending' | 'error'>('pending');
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [pixelDomains, setPixelDomains] = useState<any[]>([]);
  const [clientDomain, setClientDomain] = useState<string>('');
  const [isDomainSetupLoading, setIsDomainSetupLoading] = useState<boolean>(false);
  const [isTestEventModalOpen, setIsTestEventModalOpen] = useState<boolean>(false);
  const [isDomainSetupModalOpen, setIsDomainSetupModalOpen] = useState<boolean>(false);
  const [domainSetupInstructions, setDomainSetupInstructions] = useState<{
    trackingDomain: string;
    collectorHost: string;
    scriptCode: string;
    alternativeCode: string;
    pixelId: string;
  } | null>(null);

  // Token audit events state
  const [tokenEvents, setTokenEvents] = useState<Array<{
    id: string;
    createdAt: string | null;
    event_type: string;
    scopes: string;
    status: 'success' | 'error';
    details: any;
  }>>([]);
  const [tokenEventsLoading, setTokenEventsLoading] = useState(false);
  const [tokenDetailOpen, setTokenDetailOpen] = useState(false);
  const [selectedTokenDetails, setSelectedTokenDetails] = useState<any>(null);
  
  // Column orders for each table
  const [accountsColumns, setAccountsColumns] = useState(['id', 'name', 'currency', 'status', 'limit', 'balance']);
  const [pixelsColumns, setPixelsColumns] = useState(['id', 'name', 'datasets', 'created']);
  const [eventsColumns, setEventsColumns] = useState(['date', 'event', 'pixel', 'dataset', 'status', 'quality', 'details']);
  const [audiencesColumns, setAudiencesColumns] = useState(['id', 'name', 'type', 'size', 'status']);
  const [tokensColumns, setTokensColumns] = useState(['date', 'event', 'scopes', 'status', 'details']);
  const [eventSearch, setEventSearch] = useState(capiEventsFilters.search);
  
  // Column sorts and filters for each table
  const [accountsColumnSorts, setAccountsColumnSorts] = useState<Record<string, ColumnSort>>({});
  const [accountsColumnConditions, setAccountsColumnConditions] = useState<Record<string, ColumnCondition>>({});
  const [pixelsColumnSorts, setPixelsColumnSorts] = useState<Record<string, ColumnSort>>({});
  const [pixelsColumnConditions, setPixelsColumnConditions] = useState<Record<string, ColumnCondition>>({});
  const [eventsColumnSorts, setEventsColumnSorts] = useState<Record<string, ColumnSort>>({});
  const [eventsColumnConditions, setEventsColumnConditions] = useState<Record<string, ColumnCondition>>({});
  const [audiencesColumnSorts, setAudiencesColumnSorts] = useState<Record<string, ColumnSort>>({});
  const [audiencesColumnConditions, setAudiencesColumnConditions] = useState<Record<string, ColumnCondition>>({});
  const [tokensColumnSorts, setTokensColumnSorts] = useState<Record<string, ColumnSort>>({});
  const [tokensColumnConditions, setTokensColumnConditions] = useState<Record<string, ColumnCondition>>({});
  
  // Refresh all data state
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Drag end handlers for each table
  const handleAccountsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAccountsColumns((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const handlePixelsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPixelsColumns((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const handleEventsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEventsColumns((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const handleAudiencesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAudiencesColumns((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const handleTokensDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTokensColumns((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  // Helper to get column type
  const getAccountColumnType = (col: string): 'text' | 'numeric' | 'status' => {
    if (col === 'status') return 'status';
    if (col === 'limit' || col === 'balance') return 'numeric';
    return 'text';
  };

  const getPixelColumnType = (col: string): 'text' | 'numeric' | 'status' => {
    if (col === 'datasets') return 'numeric';
    return 'text';
  };

  const getEventColumnType = (col: string): 'text' | 'numeric' | 'status' => {
    if (col === 'status') return 'status';
    if (col === 'quality') return 'numeric';
    return 'text';
  };

  const getAudienceColumnType = (col: string): 'text' | 'numeric' | 'status' => {
    if (col === 'status') return 'status';
    if (col === 'size') return 'numeric';
    return 'text';
  };

  const getTokenColumnType = (col: string): 'text' | 'numeric' | 'status' => {
    if (col === 'status') return 'status';
    return 'text';
  };
  
  // Filter and sort handlers
  const handleAccountsSort = (columnId: string, sort: ColumnSort | null) => {
    setAccountsColumnSorts(prev => {
      const newSorts = { ...prev };
      if (sort) {
        newSorts[columnId] = sort;
      } else {
        delete newSorts[columnId];
      }
      return newSorts;
    });
  };

  const handleAccountsCondition = (columnId: string, condition: ColumnCondition | null) => {
    setAccountsColumnConditions(prev => {
      const newConditions = { ...prev };
      if (condition) {
        newConditions[columnId] = condition;
      } else {
        delete newConditions[columnId];
      }
      return newConditions;
    });
  };

  const handlePixelsSort = (columnId: string, sort: ColumnSort | null) => {
    setPixelsColumnSorts(prev => {
      const newSorts = { ...prev };
      if (sort) {
        newSorts[columnId] = sort;
      } else {
        delete newSorts[columnId];
      }
      return newSorts;
    });
  };

  const handlePixelsCondition = (columnId: string, condition: ColumnCondition | null) => {
    setPixelsColumnConditions(prev => {
      const newConditions = { ...prev };
      if (condition) {
        newConditions[columnId] = condition;
      } else {
        delete newConditions[columnId];
      }
      return newConditions;
    });
  };

  const handleEventsSort = (columnId: string, sort: ColumnSort | null) => {
    setEventsColumnSorts(prev => {
      const newSorts = { ...prev };
      if (sort) {
        newSorts[columnId] = sort;
      } else {
        delete newSorts[columnId];
      }
      return newSorts;
    });
  };

  const handleEventsCondition = (columnId: string, condition: ColumnCondition | null) => {
    setEventsColumnConditions(prev => {
      const newConditions = { ...prev };
      if (condition) {
        newConditions[columnId] = condition;
      } else {
        delete newConditions[columnId];
      }
      return newConditions;
    });
  };

  const handleAudiencesSort = (columnId: string, sort: ColumnSort | null) => {
    setAudiencesColumnSorts(prev => {
      const newSorts = { ...prev };
      if (sort) {
        newSorts[columnId] = sort;
      } else {
        delete newSorts[columnId];
      }
      return newSorts;
    });
  };

  const handleAudiencesCondition = (columnId: string, condition: ColumnCondition | null) => {
    setAudiencesColumnConditions(prev => {
      const newConditions = { ...prev };
      if (condition) {
        newConditions[columnId] = condition;
      } else {
        delete newConditions[columnId];
      }
      return newConditions;
    });
  };

  const handleTokensSort = (columnId: string, sort: ColumnSort | null) => {
    setTokensColumnSorts(prev => {
      const newSorts = { ...prev };
      if (sort) {
        newSorts[columnId] = sort;
      } else {
        delete newSorts[columnId];
      }
      return newSorts;
    });
  };

  const handleTokensCondition = (columnId: string, condition: ColumnCondition | null) => {
    setTokensColumnConditions(prev => {
      const newConditions = { ...prev };
      if (condition) {
        newConditions[columnId] = condition;
      } else {
        delete newConditions[columnId];
      }
      return newConditions;
    });
  };

  const handleStatusFilterChange = (value: string) => {
    if (value === 'all') {
      dispatch(updateCapiEventsFilters({ changes: { status: [] }, preserveOffset: false }));
      return;
    }

    dispatch(
      updateCapiEventsFilters({
        changes: { status: [value as CapiEventStatus] },
        preserveOffset: false,
      })
    );
  };

  const handleDatePresetChange = (value: CapiEventsDatePreset) => {
    dispatch(updateCapiEventsFilters({ changes: { datePreset: value }, preserveOffset: false }));
  };

  const handleToggleTestEvents = (checked: boolean) => {
    dispatch(
      updateCapiEventsFilters({
        changes: { isTestEvent: checked ? true : undefined },
        preserveOffset: false,
      })
    );
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    const step = capiEventsFilters.limit || 25;
    if (direction === 'prev') {
      const nextOffset = Math.max(0, capiEventsFilters.offset - step);
      dispatch(setCapiEventsPagination({ offset: nextOffset }));
      return;
    }

    const maxOffset = eventsCount > step ? eventsCount - step : 0;
    const nextOffset = Math.min(maxOffset, capiEventsFilters.offset + step);
    dispatch(setCapiEventsPagination({ offset: nextOffset }));
  };

  const handleRefreshEvents = () => {
    dispatch(fetchCapiEvents());
  };

  // Функция обновления всех данных на странице
  const handleRefreshAll = async () => {
    if (!workspaceId || isRefreshingAll) return;
    
    setIsRefreshingAll(true);
    try {
      // Обновляем все данные параллельно
      await Promise.all([
        dispatch(fetchAdAccounts()),
        dispatch(fetchPixels(workspaceId)),
        dispatch(fetchAudiences(workspaceId)),
        dispatch(fetchCapiEvents()),
        fetchTokenAudit(),
      ]);
      
      // Обновляем время последней проверки
      const now = new Date();
      setLastCheckTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (error) {
      logger.error('[ActivesPermissionsPage] Error refreshing all data:', error);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Функция для определения цвета статуса аккаунта
  // Facebook account_status: 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 7=PENDING_RISK_REVIEW, 8=PENDING_SETTLEMENT, 9=IN_GRACE_PERIOD, 100=PENDING_CLOSURE, 101=CLOSED, 201=ANY_ACTIVE, 202=ANY_CLOSED
  const getAccountStatusColor = (status: string | null | undefined): string => {
    if (!status) return 'bg-gray-400';
    const normalizedStatus = status.toLowerCase();
    // Активные статусы
    if (normalizedStatus === 'active' || normalizedStatus === '1') return 'bg-green-500';
    // Предупреждающие статусы
    if (['pending', 'unsettled', '3', '7', '8', '9'].includes(normalizedStatus)) return 'bg-yellow-500';
    // Неактивные/закрытые статусы
    if (['disabled', 'closed', '2', '100', '101', '202'].includes(normalizedStatus)) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const handleOpenEventDetail = (eventId: string) => {
    if (!eventId) return;
    dispatch(setSelectedEventId(eventId));
    dispatch(fetchCapiEventDetail(eventId));
  };

  const handleCloseEventDetail = () => {
    dispatch(resetEventDetail());
  };
  
  const handleRefreshFrequencyChange = (groupId: string, frequency: string) => {
    dispatch(setRefreshFrequency({ id: groupId, frequency }));
  };

  const handleTogglePermissionGroup = (groupId: string) => {
    dispatch(togglePermissionGroup(groupId));
  };

  const handleConnectClick = (groupId: string) => {
    setSelectedGroupId(groupId);
    setIsDialogOpen(true);
  };

  const handleVerify = () => {
    // Automatically connect permission group on successful validation
    if (selectedGroupId && token.trim()) {
      dispatch(connectPermissionGroup({ id: selectedGroupId, token }));
    }
    
    setIsDialogOpen(false);
    setToken('');
    setSelectedGroupId(null);
  };

  const { toast } = useToast();

  const copyValue = useCallback(async (text: string) => {
    const success = await copyTextToClipboard(text);
    toast({
      description: success ? "Copied" : "Failed to copy",
      duration: 2000,
      variant: success ? "default" : "destructive",
    });
    return success;
  }, [toast]);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (!workspaceId) return;
    
    // Загружаем все данные параллельно
    dispatch(fetchPermissionGroups());
    dispatch(fetchAdAccounts());
    dispatch(fetchPixels(workspaceId));
    dispatch(fetchAudiences(workspaceId));
    dispatch(fetchUserSettings(workspaceId));
    dispatch(fetchSystemUsers(workspaceId));
  }, [dispatch, workspaceId]);

  useEffect(() => {
    dispatch(resetTestEventState());
  }, [dispatch, appliedPixelId]);

  // Восстановление выбранного пикселя из persisted settings (если есть)
  useEffect(() => {
    const persisted = (userSettings as any)?.selectedPixelId as string | null | undefined;
    if (!persisted) return;

    // Не перетираем выбор пользователя, если он уже начал взаимодействовать
    if (selectedPixelId || appliedPixelId) return;

    setSelectedPixelId(persisted);
    setAppliedPixelId(persisted);
  }, [userSettings, selectedPixelId, appliedPixelId]);

  useEffect(() => {
    setEventSearch(capiEventsFilters.search);
  }, [capiEventsFilters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (capiEventsFilters.search === eventSearch) return;
      dispatch(
        updateCapiEventsFilters({
          changes: { search: eventSearch },
          preserveOffset: false,
        })
      );
    }, 500);

    return () => clearTimeout(handler);
  }, [dispatch, eventSearch, capiEventsFilters.search]);

  useEffect(() => {
    if (!workspaceId || activeTab !== 'events') return;
    dispatch(fetchCapiEvents());
  }, [
    dispatch,
    workspaceId,
    activeTab,
    capiEventsFilters.dateFrom,
    capiEventsFilters.dateTo,
    capiEventsFilters.limit,
    capiEventsFilters.offset,
    capiEventsFilters.sortDirection,
    capiEventsFilters.datePreset,
    capiEventsFilters.search,
    capiEventsFilters.isTestEvent,
    statusKey,
    pixelKey,
    datasetKey,
    actionSourceKey,
  ]);

  // Загрузка доменов при выборе пикселя
  useEffect(() => {
    const fetchDomains = async () => {
      if (!workspaceId || !appliedPixelId) {
        setPixelDomains([]);
        return;
      }

      try {
        const response = await fetch(`/api/v1/facebook-pixel-setup/workspaces/${workspaceId}/pixels/${appliedPixelId}/domains`, {
          credentials: 'include',
          headers: {
            'x-request-from': 'internal'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPixelDomains(data.domains || []);
        } else {
          setPixelDomains([]);
        }
      } catch (error) {
        logger.error('Error fetching pixel domains:', error);
        setPixelDomains([]);
      }
    };

    fetchDomains();
  }, [workspaceId, appliedPixelId]);

  const handleApplyPixel = async () => {
    if (!workspaceId) {
      toast({
        variant: "destructive",
        description: "Workspace ID is missing",
        duration: 2000,
      });
      return;
    }

    if (!selectedPixelId) {
      toast({
        variant: "destructive",
        description: "Please select a pixel",
        duration: 2000,
      });
      return;
    }

    try {
      // Сначала применяем локально, чтобы UI реагировал мгновенно
      setAppliedPixelId(selectedPixelId);

      // Затем сохраняем персистентно на бэке
      await fbAdsApi.pixels.setSelected(workspaceId, selectedPixelId);

      toast({
        description: "Pixel applied successfully",
        duration: 2000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Failed to save selected pixel",
        duration: 3000,
      });
    }
  };

  // Настройка домена для first-party tracking
  const handleSetupDomain = useCallback(async () => {
    if (!workspaceId || !appliedPixelId) {
      toast({ variant: "destructive", description: "Please apply a pixel first" });
      return;
    }

    const domain = clientDomain.trim();
    if (!domain) {
      toast({ variant: "destructive", description: "Please enter your domain" });
      return;
    }

    setIsDomainSetupLoading(true);
    try {
      const response = await fetch(`/api/v1/facebook-pixel-setup/workspaces/${workspaceId}/pixels/${appliedPixelId}/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-from': 'internal'
        },
        credentials: 'include',
        body: JSON.stringify({ clientDomain: domain })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Сохраняем инструкции для модального окна
        setDomainSetupInstructions({
          trackingDomain: data.trackingDomain,
          collectorHost: data.collectorHost,
          scriptCode: data.setupInstructions?.step3_install?.code || '',
          alternativeCode: data.setupInstructions?.step3_install?.alternativeCode || '',
          pixelId: data.pixelId,
        });
        setIsDomainSetupModalOpen(true);
        
        // Обновляем список доменов
        const domainsRes = await fetch(`/api/v1/facebook-pixel-setup/workspaces/${workspaceId}/pixels/${appliedPixelId}/domains`, {
          credentials: 'include',
          headers: {
            'x-request-from': 'internal'
          }
        });
        if (domainsRes.ok) {
          const domainsData = await domainsRes.json();
          setPixelDomains(domainsData.domains || []);
        }
        setClientDomain('');
      } else {
        toast({
          variant: "destructive",
          description: data.error || "Failed to setup domain",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Failed to setup domain",
      });
    } finally {
      setIsDomainSetupLoading(false);
    }
  }, [workspaceId, appliedPixelId, clientDomain, toast]);

  const handleApplyTestCode = () => {
    if (testEventCode.trim()) {
      setTestEventCodeApplied(true);
      dispatch(resetTestEventState());
      toast({
        description: "Test event code applied",
        duration: 2000,
      });
    } else {
      toast({
        variant: "destructive",
        description: "Please enter a test event code",
        duration: 2000,
      });
    }
  };

  // Открытие модального окна для настройки параметров события
  const handleOpenTestEventModal = useCallback(() => {
    if (!workspaceId) {
      toast({ variant: "destructive", description: "Workspace ID is missing" });
      return;
    }

    if (!appliedPixelId) {
      toast({ variant: "destructive", description: "Please apply a pixel first" });
      return;
    }

    if (!testEventCodeApplied || !testEventCode.trim()) {
      toast({ variant: "destructive", description: "Apply a test event code before sending" });
      return;
    }

    setIsTestEventModalOpen(true);
  }, [workspaceId, appliedPixelId, testEventCodeApplied, testEventCode, toast]);

  // Реальная отправка тестового события с параметрами
  const handleSendTestEventWithParams = useCallback(async (
    userData: Record<string, any>,
    customData: Record<string, any>
  ) => {
    if (!workspaceId || !appliedPixelId) return;

    try {
      const domainId = pixelDomains[0]?.id;
      await dispatch(
        sendPixelTestEventThunk({
          workspaceId,
          pixelId: appliedPixelId,
          testEventCode: testEventCode.trim(),
          eventName: selectedEventType,
          domainId,
          userData,
          customData,
        })
      );

      toast({
        description: "Test event sent via first-party pixel",
        duration: 2000,
      });

      setIsTestEventModalOpen(false);

      setTimeout(() => {
        setActiveTab('events');
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send test event';
      toast({ variant: "destructive", description: message });
    }
  }, [
    workspaceId,
    appliedPixelId,
    testEventCode,
    selectedEventType,
    pixelDomains,
    dispatch,
    toast,
  ]);

  const handleResetTestEventState = useCallback(() => {
    dispatch(resetTestEventState());
  }, [dispatch]);

  const handleEnableTestMode = () => {
    setTestEventCodeApplied(true);
  };

  const datasetCards = useMemo<DatasetInfoCard[]>(() => {
    const source = datasetInfoState.length ? datasetInfoState : DEFAULT_DATASET_INFO;

    return source.map((item) => {
      const iconKey = (item as { icon?: string | ComponentType<{ className?: string }> }).icon;
      let iconComponent: ComponentType<{ className?: string }> = DATASET_ICON_MAP.database;

      if (typeof iconKey === 'function') {
        iconComponent = iconKey;
      } else if (typeof iconKey === 'string' && iconKey in DATASET_ICON_MAP) {
        iconComponent = DATASET_ICON_MAP[iconKey as DatasetIconKey];
      }

      return {
        id: item.id,
        label: item.label,
        value: item.value,
        isLink: item.isLink,
        status: item.status ?? null,
        icon: iconComponent,
      } as DatasetInfoCard;
    });
  }, [datasetInfoState]);

  const systemUser = {
    id: '1234567890123456',
    name: 'Flowise System User',
    role: 'ADMIN',
    permissions: 'Finance Editor, Ads Reviewer',
    created: '15.09.2025 14:30',
    token: {
      type: 'System User Token',
      status: 'active',
      expires: 'Never (Permanent)',
      scopes: 'ads_management, ads_read, read_insights',
      issued: '15.09.2025 14:32',
      updated: '10.10.2025 10:45'
    },
    audit: {
      lastUsed: '10.10.2025 10:45',
      operations24h: 142,
      errors24h: 0
    }
  };

  // Функция загрузки token audit events
  const fetchTokenAudit = async () => {
    if (!workspaceId) return;
    
    setTokenEventsLoading(true);
    try {
      const response = await fbAdsApi.tokenAudit.getAll(workspaceId);
      setTokenEvents(response.events.map(e => ({
        id: e.id,
        createdAt: e.createdAt,
        event_type: e.eventType,
        scopes: e.scopes,
        status: e.status,
        details: e.details
      })));
    } catch (error) {
      logger.error('Failed to fetch token audit:', error);
      setTokenEvents([]);
    } finally {
      setTokenEventsLoading(false);
    }
  };

  // Fetch token audit events on mount
  useEffect(() => {
    fetchTokenAudit();
  }, [workspaceId]);

  // Dynamic tabs with real counts from store
  const tabs = useMemo(() => [
    { id: 'accounts', label: 'Ad Accounts', count: adAccounts.length },
    // { id: 'datasets', label: 'Datasets (CAPI)', count: 0 }, // Hidden - TODO: add datasets count when available
    { id: 'pixels', label: 'Pixels', count: pixels.length },
    { id: 'events', label: 'Events', count: eventsCount },
    { id: 'audiences', label: 'Audiences', count: audiences.length },
    // { id: 'system-users', label: 'System Users', count: mockSystemUsers.length }, // Hidden
    { id: 'tokens', label: 'Tokens', count: tokenEvents.length },
  ], [adAccounts.length, pixels.length, audiences.length, eventsCount, tokenEvents.length]);

  return (
    <div className="min-h-full">
      <div className="border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-display-lg text-foreground" data-testid="text-actives-permissions-title">
            Actives & Permissions
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isRefreshingAll && (
                <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              )}
              <span data-testid="text-last-check">Last check: {lastCheckTime}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              data-testid="button-refresh"
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
            >
              {isRefreshingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-[#FF6B6B] flex items-center justify-center text-white font-semibold">
                      {userSettings?.businessName ? userSettings.businessName.charAt(0).toUpperCase() : 'V'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground" data-testid="text-business-name">
                        {userSettings?.businessName || 'villa.caz'}
                      </h4>
                      <p className="text-xs text-muted-foreground" data-testid="text-business-id">
                        Business Portfolio ID: {userSettings?.businessId || '2275245372/2057'}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-business-page">
                        Primary page: {userSettings?.primaryPageName || 'none'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {userSettings?.connectionStatus === 'active' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
                    ) : userSettings?.connectionStatus === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-500 mt-1" />
                    ) : (
                      <Activity className="w-5 h-5 text-yellow-500 mt-1" />
                    )}
                    <div>
                      <h4 className="font-medium text-foreground" data-testid="text-confirmed">
                        {userSettings?.connectionStatus === 'active' ? 'Connected' : 
                         userSettings?.connectionStatus === 'error' ? 'Connection Error' : 'Pending'}
                      </h4>
                      <p className="text-xs text-muted-foreground" data-testid="text-confirmation-status">
                        Facebook Business Manager connection
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-confirmation-date">
                        {userSettings?.lastSyncedAt ? new Date(userSettings.lastSyncedAt).toLocaleDateString() : 'Apr 18, 2025'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card data-testid="card-setup-tracking">
              <CardContent className="p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-0.5" data-testid="text-setup-tracking-title">
                    Setup First-Party Tracking
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-setup-tracking-subtitle">
                    Bypass iOS 14+ restrictions with server-side events
                  </p>
                </div>

                <div className="border-t border-border"></div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-0.5" data-testid="text-select-pixel-title">
                      1. Select Facebook Pixel
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2.5" data-testid="text-select-pixel-description">
                      Choose which pixel will receive events - all events will be sent to this pixel ID
                    </p>
                    <div className="flex gap-2">
                      <Select
                        value={selectedPixelId}
                        onValueChange={setSelectedPixelId}
                      >
                        <SelectTrigger className="flex-1 h-10 text-muted-foreground" data-testid="select-pixel">
                          <SelectValue placeholder="Select pixel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pixels.map((pixel) => (
                            <SelectItem key={pixel.pixel_id} value={pixel.pixel_id}>
                              {pixel.name} ({pixel.pixel_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="default"
                        className="px-6"
                        disabled={!selectedPixelId}
                        onClick={handleApplyPixel}
                        data-testid="button-apply-pixel"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-0.5" data-testid="text-enter-domain-title">
                      2. Enter Your Domain
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2.5" data-testid="text-enter-domain-description">
                      Enter your website domain to generate tracking configuration
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="example.com"
                        value={clientDomain}
                        onChange={(e) => setClientDomain(e.target.value)}
                        className="flex-1 h-10"
                        disabled={!appliedPixelId}
                        data-testid="input-client-domain"
                      />
                      <Button
                        variant="default"
                        className="px-6"
                        disabled={!appliedPixelId || !clientDomain.trim() || isDomainSetupLoading}
                        onClick={handleSetupDomain}
                        data-testid="button-setup-domain"
                      >
                        {isDomainSetupLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Setting up...
                          </span>
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                    {pixelDomains.length > 0 && (
                      <div className="mt-2 p-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Domain configured: <span className="font-medium">{pixelDomains[0].trackingDomain}</span>
                          <button 
                            onClick={() => {
                              if (pixelDomains[0]) {
                                setDomainSetupInstructions({
                                  trackingDomain: pixelDomains[0].trackingDomain,
                                  collectorHost: 'collector.rakhnianskii.com',
                                  scriptCode: `<!-- Facebook First-Party Pixel -->\n<script src="https://${pixelDomains[0].trackingDomain}:48443/pixel/${appliedPixelId}/script.js" async></script>\n<!-- End Facebook First-Party Pixel -->`,
                                  alternativeCode: '',
                                  pixelId: appliedPixelId,
                                });
                                setIsDomainSetupModalOpen(true);
                              }
                            }}
                            className="text-primary underline ml-1"
                          >
                            View instructions
                          </button>
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIsSetupGuideOpen(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    data-testid="link-setup-guide"
                  >
                    Need help? View setup guide
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-connection-health">
              <CardContent className="p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`text-lg font-semibold text-foreground ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-connection-health-title">
                      Connection Health
                    </h3>
                    <Badge
                      variant={connectionStatus === 'active' ? 'default' : 'secondary'}
                      className={`cursor-pointer ${
                        connectionStatus === 'active'
                          ? 'bg-green-500 text-white'
                          : connectionStatus === 'error'
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-white'
                      }`}
                      data-testid="badge-connection-status"
                      onClick={() => {
                        setConnectionStatus(prev => 
                          prev === 'pending' ? 'active' : prev === 'active' ? 'error' : 'pending'
                        );
                      }}
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1.5"></span>
                      {connectionStatus === 'active' && 'Active'}
                      {connectionStatus === 'pending' && 'Pending DNS'}
                      {connectionStatus === 'error' && 'Connection Error'}
                    </Badge>
                  </div>
                  <p className={`text-sm text-muted-foreground ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-connection-health-subtitle">
                    Verify pixel is receiving events
                  </p>
                </div>

                <div className="border-t border-border"></div>

                <div className="space-y-6">
                  <div>
                    <h4 className={`text-sm font-medium text-foreground mb-0.5 ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-test-code-title">
                      Paste Event Code
                    </h4>
                    <p className={`text-xs text-muted-foreground mb-2.5 ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-test-code-subtitle">
                      Get from Facebook Events Manager
                    </p>
                    <div className="flex gap-2">
                      <Input
                        id="test-code"
                        placeholder="Enter code (e.g., TEST1234)"
                        value={testEventCode}
                        onChange={(e) => setTestEventCode(e.target.value)}
                        className="flex-1 h-10 text-muted-foreground"
                        data-testid="input-test-code"
                        disabled={connectionStatus !== 'active'}
                      />
                      <Button
                        variant="default"
                        className="px-6"
                        onClick={handleApplyTestCode}
                        disabled={connectionStatus !== 'active' || !testEventCode.trim()}
                        data-testid="button-apply-test-code"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-sm font-medium text-foreground mb-0.5 ${connectionStatus !== 'active' || !testEventCodeApplied ? 'opacity-50' : ''}`} data-testid="text-send-test-event-title">
                      Send Test Event
                    </h4>
                    <p className={`text-xs text-muted-foreground mb-2.5 ${connectionStatus !== 'active' || !testEventCodeApplied ? 'opacity-50' : ''}`} data-testid="text-send-test-event-subtitle">
                      Select event type to test
                    </p>
                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        <Select
                          value={selectedEventType}
                          onValueChange={setSelectedEventType}
                          disabled={connectionStatus !== 'active' || !testEventCodeApplied}
                        >
                          <SelectTrigger className="flex-1 h-10 text-muted-foreground" data-testid="select-event-type">
                            <SelectValue />
                          </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Purchase">Purchase</SelectItem>
                              <SelectItem value="AddToCart">AddToCart</SelectItem>
                              <SelectItem value="ViewContent">ViewContent</SelectItem>
                            </SelectContent>
                          </Select>
                        <Button
                          variant="default"
                          className="px-6"
                          onClick={handleOpenTestEventModal}
                          disabled={
                            connectionStatus !== 'active' ||
                            !testEventCodeApplied ||
                            pixelsTestEventState.status === 'loading'
                          }
                          data-testid="button-send-test"
                        >
                          {pixelsTestEventState.status === 'loading' ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending
                            </span>
                          ) : (
                            'Send'
                          )}
                        </Button>
                      </div>
                      {pixelsTestEventState.status === 'success' && pixelsTestEventState.result && (
                        <div
                          className="space-y-2 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
                          data-testid="panel-test-event-success"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <CheckCircle2 className="w-4 h-4" />
                              Test event delivered via first-party pixel
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleResetTestEventState}>
                              Clear
                            </Button>
                          </div>
                          <div className="grid gap-1 sm:grid-cols-2">
                            <span>
                              <span className="font-semibold">Facebook Event ID:</span>{' '}
                              {pixelsTestEventState.result.facebookEventId || '—'}
                            </span>
                            <span>
                              <span className="font-semibold">Internal Event ID:</span>{' '}
                              {pixelsTestEventState.result.eventId || '—'}
                            </span>
                            <span>
                              <span className="font-semibold">EMQ Score:</span>{' '}
                              {typeof pixelsTestEventState.result.emqScore === 'number'
                                ? `${Math.round(pixelsTestEventState.result.emqScore)}%`
                                : 'n/a'}
                            </span>
                            <span>
                              <span className="font-semibold">Source URL:</span>{' '}
                              <a
                                href={pixelsTestEventState.result.eventSourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                {pixelsTestEventState.result.eventSourceUrl}
                              </a>
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold">Warnings:</span>
                            <ul className="mt-1 list-disc pl-4">
                              {(pixelsTestEventState.result.warnings?.length ? pixelsTestEventState.result.warnings : ['No warnings from Meta']).map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {pixelsTestEventState.status === 'error' && pixelsTestEventState.error && (
                        <div
                          className="flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                          data-testid="panel-test-event-error"
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="font-medium">Failed to send test event</p>
                              <p>{pixelsTestEventState.error}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleResetTestEventState}>
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-sm font-medium text-foreground mb-0.5 ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-last-24h-title">
                      Last 24 Hours
                    </h4>
                    <p className={`text-xs text-muted-foreground mb-2.5 ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-last-24h-subtitle">
                      Performance metrics for testing period
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className={`w-4 h-4 flex-shrink-0 ${connectionStatus !== 'active' ? 'opacity-50 text-muted-foreground' : 'text-blue-500'}`} />
                          <p className={`text-lg font-semibold text-foreground ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-events-sent">
                            {connectionStatus !== 'active' ? '0' : '1,234'}
                          </p>
                        </div>
                        <p className={`text-xs text-muted-foreground ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="label-events-sent">
                          Events Sent
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className={`w-4 h-4 flex-shrink-0 ${connectionStatus !== 'active' ? 'opacity-50 text-muted-foreground' : 'text-green-500'}`} />
                          <p className={`text-lg font-semibold text-foreground ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-emq-score">
                            {connectionStatus !== 'active' ? '0%' : '92%'}
                          </p>
                        </div>
                        <p className={`text-xs text-muted-foreground ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="label-emq-score">
                          EMQ Score
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Target className={`w-4 h-4 flex-shrink-0 ${connectionStatus !== 'active' ? 'opacity-50 text-muted-foreground' : 'text-purple-500'}`} />
                          <p className={`text-lg font-semibold text-foreground ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="text-success-rate">
                            {connectionStatus !== 'active' ? '0%' : '99.5%'}
                          </p>
                        </div>
                        <p className={`text-xs text-muted-foreground ${connectionStatus !== 'active' ? 'opacity-50' : ''}`} data-testid="label-success-rate">
                          Success Rate
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === 'accounts' && (
          <div className="overflow-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleAccountsDragEnd}
            >
              <table className="w-full">
                <thead className="bg-muted sticky top-0 z-20">
                  <tr>
                      <SortableContext items={accountsColumns} strategy={horizontalListSortingStrategy}>
                        {accountsColumns.map((col) => (
                          <SortableTableHeader 
                            key={col} 
                            id={col}
                            columnType={getAccountColumnType(col)}
                            currentSort={accountsColumnSorts[col] || null}
                            currentCondition={accountsColumnConditions[col] || null}
                            onApplySort={(sort) => handleAccountsSort(col, sort)}
                            onApplyCondition={(condition) => handleAccountsCondition(col, condition)}
                          >
                            {col === 'id' && 'Account ID'}
                            {col === 'name' && 'Name'}
                            {col === 'currency' && 'Currency'}
                            {col === 'status' && 'Status'}
                            {col === 'limit' && 'Limit'}
                            {col === 'balance' && 'Balance'}
                          </SortableTableHeader>
                        ))}
                      </SortableContext>
                    </tr>
                  </thead>
                  <tbody>
                    {adAccounts.map((account, index) => (
                      <tr key={account.id} className="group border-b border-border last:border-b-0 hover:bg-muted/50" data-testid={`row-account-${index}`}>
                        {accountsColumns.map((col) => (
                          <td key={col} className="py-3 px-4 text-sm text-foreground text-center">
                            {col === 'id' && (
                              <div className="flex items-center justify-center gap-2 font-mono">
                                <span>{account.id}</span>
                                <button
                                  onClick={() => copyValue(account.id)}
                                  className="opacity-50 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-copy-account-${index}`}
                                >
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                </button>
                              </div>
                            )}
                            {col === 'name' && account.name}
                            {col === 'currency' && account.currency}
                            {col === 'status' && (
                              <span className={`inline-block w-2 h-2 rounded-full ${getAccountStatusColor(account.status)}`}></span>
                            )}
                            {col === 'limit' && account.spendCap}
                            {col === 'balance' && account.balance}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DndContext>
            </div>
        )}

        {activeTab === 'pixels' && (
          <div className="overflow-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePixelsDragEnd}
            >
              <table className="w-full">
                <thead className="bg-muted sticky top-0 z-20">
                  <tr>
                        <SortableContext items={pixelsColumns} strategy={horizontalListSortingStrategy}>
                          {pixelsColumns.map((col) => (
                            <SortableTableHeader 
                              key={col} 
                              id={col}
                              columnType={getPixelColumnType(col)}
                              currentSort={pixelsColumnSorts[col] || null}
                              currentCondition={pixelsColumnConditions[col] || null}
                              onApplySort={(sort) => handlePixelsSort(col, sort)}
                              onApplyCondition={(condition) => handlePixelsCondition(col, condition)}
                            >
                              {col === 'id' && 'Pixel ID'}
                              {col === 'name' && 'Name'}
                              {col === 'datasets' && 'Datasets'}
                              {col === 'created' && 'Created'}
                            </SortableTableHeader>
                          ))}
                        </SortableContext>
                      </tr>
                    </thead>
                    <tbody>
                      {pixels.map((pixel, index) => (
                        <tr key={index} className="group border-b border-border last:border-b-0 hover:bg-muted/50" data-testid={`row-pixel-${index}`}>
                          {pixelsColumns.map((col) => (
                            <td key={col} className="py-3 px-4 text-sm text-foreground text-center">
                              {col === 'id' && (
                                <div className="flex items-center justify-center gap-2 font-mono">
                                  <span>{pixel.pixel_id}</span>
                                  <button
                                    onClick={() => copyValue(pixel.pixel_id)}
                                    className="opacity-50 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                                    data-testid={`button-copy-pixel-${index}`}
                                  >
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </div>
                              )}
                              {col === 'name' && pixel.name}
                              {col === 'datasets' && pixel.datasets}
                              {col === 'created' && pixel.created_time}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DndContext>
              </div>
        )}

        {activeTab === 'events' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-1 gap-2 min-w-[240px]">
                <Input
                  placeholder="Search events, pixels, datasets"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={selectedStatusValue} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-[150px] h-9 text-sm" data-testid="select-capi-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPI_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={capiEventsFilters.datePreset}
                  onValueChange={(value) => handleDatePresetChange(value as CapiEventsDatePreset)}
                >
                  <SelectTrigger className="w-[140px] h-9 text-sm" data-testid="select-capi-date">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPI_DATE_PRESET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 border border-border rounded-md px-3 py-1.5">
                  <Switch
                    id="switch-test-events"
                    checked={isTestEventsOnly}
                    onCheckedChange={handleToggleTestEvents}
                  />
                  <Label htmlFor="switch-test-events" className="text-xs text-muted-foreground">
                    Test events
                  </Label>
                </div>
              </div>
            </div>

            {capiEventsError && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <span>{capiEventsError}</span>
                <Button variant="outline" size="sm" onClick={handleRefreshEvents}>
                  Retry
                </Button>
              </div>
            )}

            <div className="overflow-auto border border-border rounded-xl">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleEventsDragEnd}
              >
                <table className="w-full">
                  <thead className="bg-muted sticky top-0 z-20">
                    <tr>
                      <SortableContext items={eventsColumns} strategy={horizontalListSortingStrategy}>
                        {eventsColumns.map((col) => (
                          <SortableTableHeader
                            key={col}
                            id={col}
                            columnType={getEventColumnType(col)}
                            currentSort={eventsColumnSorts[col] || null}
                            currentCondition={eventsColumnConditions[col] || null}
                            onApplySort={(sort) => handleEventsSort(col, sort)}
                            onApplyCondition={(condition) => handleEventsCondition(col, condition)}
                          >
                            {col === 'date' && 'Event Time'}
                            {col === 'event' && 'Event'}
                            {col === 'pixel' && 'Pixel'}
                            {col === 'dataset' && 'Dataset'}
                            {col === 'status' && 'Status'}
                            {col === 'quality' && 'Quality'}
                            {col === 'details' && 'Details'}
                          </SortableTableHeader>
                        ))}
                      </SortableContext>
                    </tr>
                  </thead>
                  <tbody>
                    {capiEventsLoading && capiEvents.length === 0 && (
                      <tr>
                        <td
                          colSpan={eventsColumns.length}
                          className="py-10 px-4 text-center text-sm text-muted-foreground"
                        >
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" />
                          Fetching CAPI events...
                        </td>
                      </tr>
                    )}

                    {!capiEventsLoading && capiEvents.length === 0 && (
                      <tr>
                        <td
                          colSpan={eventsColumns.length}
                          className="py-10 px-4 text-center text-sm text-muted-foreground"
                        >
                          No events match current filters.
                        </td>
                      </tr>
                    )}

                    {capiEvents.map((event, index) => (
                      <tr
                        key={event.id}
                        className="border-b border-border last:border-b-0 hover:bg-muted/40"
                        data-testid={`row-event-${index}`}
                      >
                        {eventsColumns.map((col) => (
                          <td key={col} className="py-3 px-4 text-sm text-foreground text-left align-top">
                            {col === 'date' && (
                              <div>
                                <p className="font-medium">{formatDateTime(event.eventTime || event.createdDate)}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(event.createdDate)}</p>
                              </div>
                            )}
                            {col === 'event' && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{event.eventName}</span>
                                  {event.isTestEvent && <Badge variant="outline" className="text-[10px] uppercase">Test</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground capitalize">{event.actionSource || 'unknown source'}</p>
                                {event.errorMessage && (
                                  <p className="text-xs text-red-500">{event.errorMessage}</p>
                                )}
                              </div>
                            )}
                            {col === 'pixel' && (
                              <div>
                                <p className="font-medium">{event.pixelName || '—'}</p>
                                <p className="text-xs font-mono text-muted-foreground">{event.pixelId}</p>
                              </div>
                            )}
                            {col === 'dataset' && (
                              <div>
                                <p className="font-medium">{event.datasetName || '—'}</p>
                                <p className="text-xs font-mono text-muted-foreground">{event.datasetId || '—'}</p>
                              </div>
                            )}
                            {col === 'status' && (
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status].className}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {STATUS_STYLES[event.status].label}
                              </span>
                            )}
                            {col === 'quality' && (
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getQualityClassName(event.estimatedEmqScore)}`}
                                >
                                  {formatQualityLabel(event.estimatedEmqScore)}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  Retries {event.retryCount}/{event.maxRetries}
                                </p>
                              </div>
                            )}
                            {col === 'details' && (
                              <div className="flex flex-wrap items-center gap-2">
                                {event.logsCount > 0 && (
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {event.logsCount} logs
                                  </Badge>
                                )}
                                {event.warningsCount > 0 && (
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {event.warningsCount} warnings
                                  </Badge>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEventDetail(event.id)}
                                  data-testid={`button-details-${index}`}
                                >
                                  Inspect
                                </Button>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {capiEventsLoading && capiEvents.length > 0 && (
                      <tr>
                        <td
                          colSpan={eventsColumns.length}
                          className="py-4 px-4 text-center text-xs text-muted-foreground"
                        >
                          <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" /> Refreshing events...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </DndContext>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {rangeStart ? `${rangeStart}-${rangeEnd}` : 0} of {eventsCount} events
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={capiEventsFilters.offset === 0 || capiEventsLoading}
                  onClick={() => handlePageChange('prev')}
                >
                  Previous
                </Button>
                <span>
                  Page {Math.min(currentPage, totalPages)} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={rangeEnd >= eventsCount || eventsCount === 0 || capiEventsLoading}
                  onClick={() => handlePageChange('next')}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'datasets' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasetCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.id} data-testid={`card-dataset-${item.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-foreground" data-testid={`text-dataset-label-${item.id}`}>
                              {item.label}
                            </h4>
                            {item.status === 'active' && (
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500" data-testid={`status-active-${item.id}`}></span>
                            )}
                          </div>
                          <p 
                            className={`text-sm ${item.isLink ? 'text-primary cursor-pointer hover:underline' : 'text-muted-foreground'}`}
                            data-testid={`text-dataset-value-${item.id}`}
                          >
                            {item.value}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'audiences' && (
          <div className="overflow-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleAudiencesDragEnd}
            >
              <table className="w-full">
                <thead className="bg-muted sticky top-0 z-20">
                  <tr>
                        <SortableContext items={audiencesColumns} strategy={horizontalListSortingStrategy}>
                          {audiencesColumns.map((col) => (
                            <SortableTableHeader 
                              key={col} 
                              id={col}
                              columnType={getAudienceColumnType(col)}
                              currentSort={audiencesColumnSorts[col] || null}
                              currentCondition={audiencesColumnConditions[col] || null}
                              onApplySort={(sort) => handleAudiencesSort(col, sort)}
                              onApplyCondition={(condition) => handleAudiencesCondition(col, condition)}
                            >
                              {col === 'id' && 'Audience ID'}
                              {col === 'name' && 'Name'}
                              {col === 'type' && 'Type'}
                              {col === 'size' && 'Size'}
                              {col === 'status' && 'Status'}
                            </SortableTableHeader>
                          ))}
                        </SortableContext>
                      </tr>
                    </thead>
                    <tbody>
                      {audiences.map((audience, index) => (
                        <tr key={index} className="group border-b border-border last:border-b-0 hover:bg-muted/50" data-testid={`row-audience-${index}`}>
                          {audiencesColumns.map((col) => (
                            <td key={col} className="py-3 px-4 text-sm text-foreground text-center">
                              {col === 'id' && (
                                <div className="flex items-center justify-center gap-2 font-mono">
                                  <span>{audience.audience_id}</span>
                                  <button
                                    onClick={() => copyValue(audience.audience_id)}
                                    className="opacity-50 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                                    data-testid={`button-copy-audience-${index}`}
                                  >
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </div>
                              )}
                              {col === 'name' && audience.name}
                              {col === 'type' && audience.subtype}
                              {col === 'size' && audience.approximate_count}
                              {col === 'status' && (
                                <span className={`inline-block w-2 h-2 rounded-full ${audience.delivery_status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DndContext>
              </div>
        )}

        {activeTab === 'system-users' && (
          <div className="p-6">
            <Card data-testid="card-system-user">
              <CardContent className="p-6 space-y-6">
                <div className="border-b border-border pb-4">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2" data-testid="text-system-user-title">
                    🤖 System User
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">ID:</span>
                    <span className="text-sm font-mono text-foreground" data-testid="text-system-user-id">{systemUser.id}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Name:</span>
                    <span className="text-sm text-foreground" data-testid="text-system-user-name">{systemUser.name}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Role:</span>
                    <span className="text-sm text-foreground" data-testid="text-system-user-role">{systemUser.role}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Permissions:</span>
                    <span className="text-sm text-foreground" data-testid="text-system-user-permissions">{systemUser.permissions}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Created:</span>
                    <span className="text-sm text-foreground" data-testid="text-system-user-created">{systemUser.created}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <h4 className="text-base font-medium text-foreground flex items-center gap-2" data-testid="text-token-title">
                    🔑 Token
                  </h4>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Type:</span>
                    <span className="text-sm text-foreground" data-testid="text-token-type">{systemUser.token.type}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Status:</span>
                    <span className="text-sm text-foreground flex items-center gap-1" data-testid="text-token-status">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      Active
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Expires:</span>
                    <span className="text-sm text-foreground" data-testid="text-token-expires">{systemUser.token.expires}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Scopes:</span>
                    <span className="text-sm font-mono text-foreground" data-testid="text-token-scopes">{systemUser.token.scopes}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Issued:</span>
                    <span className="text-sm text-foreground" data-testid="text-token-issued">{systemUser.token.issued}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-28">Updated:</span>
                    <span className="text-sm text-foreground" data-testid="text-token-updated">{systemUser.token.updated}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <h4 className="text-base font-medium text-foreground flex items-center gap-2" data-testid="text-audit-title">
                    📊 Token Audit
                  </h4>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-48">Last used:</span>
                    <span className="text-sm text-foreground" data-testid="text-audit-last-used">{systemUser.audit.lastUsed}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-48">Operations (24h):</span>
                    <span className="text-sm text-foreground" data-testid="text-audit-operations">{systemUser.audit.operations24h}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-48">Errors (24h):</span>
                    <span className="text-sm text-foreground" data-testid="text-audit-errors">{systemUser.audit.errors24h}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="overflow-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTokensDragEnd}
            >
              <table className="w-full">
                <thead className="bg-muted sticky top-0 z-20">
                  <tr>
                        <SortableContext items={tokensColumns} strategy={horizontalListSortingStrategy}>
                          {tokensColumns.map((col) => (
                            <SortableTableHeader 
                              key={col} 
                              id={col}
                              columnType={getTokenColumnType(col)}
                              currentSort={tokensColumnSorts[col] || null}
                              currentCondition={tokensColumnConditions[col] || null}
                              onApplySort={(sort) => handleTokensSort(col, sort)}
                              onApplyCondition={(condition) => handleTokensCondition(col, condition)}
                            >
                              {col === 'date' && 'Date'}
                              {col === 'event' && 'Event'}
                              {col === 'scopes' && 'Scopes'}
                              {col === 'status' && 'Status'}
                              {col === 'details' && 'Details'}
                            </SortableTableHeader>
                          ))}
                        </SortableContext>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenEventsLoading ? (
                        <tr>
                          <td colSpan={tokensColumns.length} className="py-8 text-center">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Loading token events...</span>
                            </div>
                          </td>
                        </tr>
                      ) : tokenEvents.length === 0 ? (
                        <tr>
                          <td colSpan={tokensColumns.length} className="py-8 text-center text-muted-foreground">
                            No token events found
                          </td>
                        </tr>
                      ) : (
                        tokenEvents.map((event, index) => (
                          <tr key={event.id || index} className="border-b border-border last:border-b-0 hover:bg-muted/50" data-testid={`row-token-${index}`}>
                            {tokensColumns.map((col) => (
                              <td key={col} className="py-3 px-6 text-sm text-foreground text-center">
                                {col === 'date' && <span className="whitespace-nowrap">{event.createdAt || '—'}</span>}
                                {col === 'event' && <span className="font-mono text-xs">{event.event_type}</span>}
                                {col === 'scopes' && <span className="font-mono text-xs max-w-xs truncate block">{event.scopes || '—'}</span>}
                                {col === 'status' && (
                                  <span className={`inline-flex items-center justify-center ${
                                    event.status === 'success' ? 'text-green-600' :
                                    event.status === 'error' ? 'text-red-600' :
                                    'text-muted-foreground'
                                  }`}>
                                    {event.status === 'success' ? '✅' : '❌'}
                                  </span>
                                )}
                                {col === 'details' && (
                                  <button 
                                    className="text-primary hover:underline text-xs font-mono" 
                                    data-testid={`button-token-details-${index}`}
                                    onClick={() => {
                                      setSelectedTokenDetails(event.details);
                                      setTokenDetailOpen(true);
                                    }}
                                  >
                                    JSON
                                  </button>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </DndContext>
              </div>
        )}
      </div>

      <Dialog open={isEventDetailOpen} onOpenChange={(open) => {
        if (!open) handleCloseEventDetail();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-capi-event">
          <DialogHeader>
            <DialogTitle>CAPI Event Detail</DialogTitle>
            <DialogDescription>
              {capiEventsDetail.data?.event.eventId ?? 'Detailed delivery payload'}
            </DialogDescription>
          </DialogHeader>

          {capiEventsDetail.loading && (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /> Loading event data...
            </div>
          )}

          {capiEventsDetail.error && !capiEventsDetail.loading && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {capiEventsDetail.error}
            </div>
          )}

          {capiEventsDetail.data && !capiEventsDetail.loading && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Event</p>
                  <p className="text-sm font-semibold text-foreground">{capiEventsDetail.data.event.eventName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(capiEventsDetail.data.event.eventTime)}</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Status</p>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[capiEventsDetail.data.event.status].className}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {STATUS_STYLES[capiEventsDetail.data.event.status].label}
                  </span>
                  {capiEventsDetail.data.event.errorMessage && (
                    <p className="mt-1 text-xs text-red-500">{capiEventsDetail.data.event.errorMessage}</p>
                  )}
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Pixel</p>
                  <p className="text-sm font-semibold text-foreground">{capiEventsDetail.data.event.pixelName || '—'}</p>
                  <p className="text-xs font-mono text-muted-foreground">{capiEventsDetail.data.event.pixelId}</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs uppercase text-muted-foreground">Dataset</p>
                  <p className="text-sm font-semibold text-foreground">{capiEventsDetail.data.event.datasetName || '—'}</p>
                  <p className="text-xs font-mono text-muted-foreground">{capiEventsDetail.data.event.datasetId || '—'}</p>
                </div>
              </div>

              {capiEventsDetail.data.quality && (
                <div className="rounded-md border border-border p-4 space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">Quality Score</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {Math.round(capiEventsDetail.data.quality.emqScore)} EMQ
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Matched fields: {capiEventsDetail.data.quality.matchedFieldsCount} · Missing fields: {capiEventsDetail.data.quality.missingFieldsCount}
                  </p>
                  {capiEventsDetail.data.quality.warnings && capiEventsDetail.data.quality.warnings.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-amber-600">
                      {capiEventsDetail.data.quality.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {capiEventsDetail.data.logs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">Delivery Logs</h4>
                    <Badge variant="outline">{capiEventsDetail.data.logs.length}</Badge>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y">
                    {capiEventsDetail.data.logs.map((log) => (
                      <div key={log.id} className="space-y-1 p-3 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>{formatDateTime(log.createdDate)}</span>
                          {typeof log.durationMs === 'number' && <span>{log.durationMs} ms</span>}
                        </div>
                        <p className="font-mono text-foreground">
                          {log.statusCode ?? '—'} {log.requestMethod} {log.requestUrl}
                        </p>
                        {log.errorMessage && (
                          <p className="text-red-500">{log.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Full Payload</h4>
                  {capiEventsDetail.data.event.facebookEventId && (
                    <Badge variant="outline" className="font-mono">
                      {capiEventsDetail.data.event.facebookEventId}
                    </Badge>
                  )}
                </div>
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
                  {JSON.stringify(capiEventsDetail.data.event.fullPayload ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEventDetail}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-token">
          <DialogHeader>
            <DialogTitle>Connect Facebook Account</DialogTitle>
            <DialogDescription>
              Enter your Facebook access token to connect your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token">Access Token</Label>
              <Input
                id="token"
                placeholder="Enter your access token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                data-testid="input-token"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={!token.trim()}
              data-testid="button-verify"
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSetupGuideOpen} onOpenChange={setIsSetupGuideOpen}>
        <DialogContent className="w-[95vw] h-[95vh] overflow-y-auto" data-testid="dialog-setup-guide">
          <DialogHeader>
            <DialogTitle className="text-2xl">First-Party Tracking Setup Guide</DialogTitle>
            <DialogDescription>
              Complete step-by-step guide to setup server-side tracking and bypass iOS 14+ restrictions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                Select Your Facebook Pixel
              </h3>
              <p className="text-sm text-muted-foreground pl-8">
                Choose the pixel that will receive all tracking events. This pixel ID will be used for all server-side event tracking. 
                You can find your pixel IDs in Facebook Business Manager under Events Manager.
              </p>
              <div className="pl-8 space-y-2">
                <p className="text-sm font-medium">Steps:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Go to Facebook Business Manager</li>
                  <li>Navigate to Events Manager</li>
                  <li>Select your pixel from the list</li>
                  <li>Copy the Pixel ID</li>
                  <li>Select it in the dropdown above and click Apply</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                Install Tracking Script
              </h3>
              <p className="text-sm text-muted-foreground pl-8">
                Add the tracking script to your website's &lt;head&gt; section. This script will handle client-side event collection 
                and forward events to your server for processing.
              </p>
              <div className="pl-8 space-y-2">
                <p className="text-sm font-medium">Implementation:</p>
                <div className="bg-muted p-4 rounded-md">
                  <code className="text-sm">
                    &lt;script src="//track.domain.com/px.js"&gt;&lt;/script&gt;
                  </code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Place this script before the closing &lt;/head&gt; tag on every page you want to track.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                Configure DNS CNAME Record
              </h3>
              <p className="text-sm text-muted-foreground pl-8">
                Create a CNAME record in your DNS settings to enable first-party tracking. This allows the tracking domain 
                to be recognized as part of your website, bypassing browser restrictions.
              </p>
              <div className="pl-8 space-y-2">
                <p className="text-sm font-medium">DNS Configuration:</p>
                <div className="bg-muted p-4 rounded-md space-y-2">
                  <p className="text-sm"><strong>Type:</strong> CNAME</p>
                  <p className="text-sm"><strong>Name:</strong> track</p>
                  <p className="text-sm"><strong>Value:</strong> pixel.facebook.com</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  DNS changes can take up to 48 hours to propagate, but usually complete within a few hours.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">4</span>
                Test Your Setup
              </h3>
              <p className="text-sm text-muted-foreground pl-8">
                Once DNS is active, use the Test Event Code from Facebook Events Manager to verify your tracking is working correctly.
              </p>
              <div className="pl-8 space-y-2">
                <p className="text-sm font-medium">Testing Steps:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Wait for DNS status to show "Active"</li>
                  <li>Get Test Event Code from Facebook Events Manager</li>
                  <li>Paste the code and click Apply</li>
                  <li>Select an event type (Purchase, AddToCart, etc.)</li>
                  <li>Click Send to trigger a test event</li>
                  <li>Check the Events tab to verify the event was received</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Important Notes</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Make sure your website is using HTTPS</li>
                    <li>• Test events may take a few minutes to appear in Events Manager</li>
                    <li>• Monitor the Last 24 Hours statistics to track performance</li>
                    <li>• EMQ Score above 8.0 indicates good event quality</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsSetupGuideOpen(false)} data-testid="button-close-guide">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Domain Setup Instructions Modal */}
      <Dialog open={isDomainSetupModalOpen} onOpenChange={setIsDomainSetupModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Domain Configured Successfully
            </DialogTitle>
            <DialogDescription>
              Follow these steps to complete your first-party tracking setup
            </DialogDescription>
          </DialogHeader>

          {domainSetupInstructions && (
            <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-2">
              {/* Step 1: CNAME */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Add CNAME Record to Your DNS
                </h4>
                <p className="text-sm text-muted-foreground pl-7">
                  Go to your domain's DNS settings and add the following CNAME record:
                </p>
                <div className="ml-7 p-3 rounded-lg bg-muted font-mono text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-muted-foreground">Type:</span> <span className="font-semibold">CNAME</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-muted-foreground">Name:</span> <span className="font-semibold">{domainSetupInstructions.trackingDomain}</span>
                    </div>
                    <Copy 
                      className="w-4 h-4 cursor-pointer hover:text-foreground" 
                      onClick={() => copyValue(domainSetupInstructions.trackingDomain)}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-muted-foreground">Value:</span> <span className="font-semibold">{domainSetupInstructions.collectorHost}</span>
                    </div>
                    <Copy 
                      className="w-4 h-4 cursor-pointer hover:text-foreground" 
                      onClick={() => copyValue(domainSetupInstructions.collectorHost)}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-muted-foreground">TTL:</span> <span className="font-semibold">300</span> (or Auto)
                    </div>
                  </div>
                </div>
                <div className="ml-7 p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Result: <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">{domainSetupInstructions.trackingDomain}</code> → <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">{domainSetupInstructions.collectorHost}</code>
                  </p>
                </div>
              </div>

              {/* Step 2: Script */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  Add Tracking Script to Your Website
                </h4>
                <p className="text-sm text-muted-foreground pl-7">
                  Insert this code before the closing <code className="bg-muted px-1 rounded">&lt;/head&gt;</code> tag on all pages:
                </p>
                <div className="ml-7 relative">
                  <pre className="p-3 rounded-lg bg-muted font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    {domainSetupInstructions.scriptCode}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyValue(domainSetupInstructions.scriptCode)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* Step 3: Verify */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  Wait for DNS Propagation
                </h4>
                <p className="text-sm text-muted-foreground pl-7">
                  DNS changes can take 5-30 minutes to propagate. Once active, the Connection Health status will change to "Active".
                </p>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Your website must use HTTPS</li>
                      <li>The script will automatically track PageView events</li>
                      <li>Use Test Event Code to verify tracking is working</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button onClick={() => setIsDomainSetupModalOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Details Modal */}
      <Dialog open={tokenDetailOpen} onOpenChange={setTokenDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Token Event Details</DialogTitle>
            <DialogDescription>
              Raw JSON data for this token event
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <pre className="p-3 rounded-lg bg-muted font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {selectedTokenDetails ? JSON.stringify(selectedTokenDetails, null, 2) : 'No details available'}
            </pre>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setTokenDetailOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedTokenDetails) {
                copyTextToClipboard(JSON.stringify(selectedTokenDetails, null, 2));
                toast({ description: "Copied to clipboard" });
              }
            }}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Event Modal с параметрами события */}
      <TestEventModal
        open={isTestEventModalOpen}
        onOpenChange={setIsTestEventModalOpen}
        eventType={selectedEventType}
        onSend={handleSendTestEventWithParams}
        isLoading={pixelsTestEventState.status === 'loading'}
      />
    </div>
  );
}
