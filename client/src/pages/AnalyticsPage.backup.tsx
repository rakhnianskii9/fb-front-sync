import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { ArrowLeft, BarChart3, Megaphone, Layers, FileText, Image, ChevronDown, ChevronRight, Filter, Search, GripVertical, TrendingUp, TrendingDown, Minus, CalendarIcon, Users, ZoomIn, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns/format";
import { cn } from "@/lib/utils";
import DashboardMetricCardsSection from "@/components/DashboardMetricCardsSection";
import DashboardChartGrid from "@/components/DashboardChartGrid";
import { BreakdownsPanel } from "@/components/BreakdownsPanel";
import { useAnalyticsDataView, type AnalyticsItem, type ParentFilter } from "@/hooks/useAnalyticsDataView";
import { getMetricChangeColorClass } from "@/data/metricPolarity";
import { useCrmAnalytics, type CrmObjectMetrics } from "@/hooks/useCrmAnalytics";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedReportUpdate } from "@/hooks/useDebouncedReportUpdate";
import { Badge } from "@/components/ui/badge";
import { metricCategories } from "@/data/metrics";
import { useReportCache, type TabType as CacheTabType } from "@/hooks/useReportCache";
import { formatMetricValue, normalizeStatus, isActiveStatus } from "@/lib/formatters";
import { METRIC_SKIP_FIELDS } from "@/lib/constants";
import logger from "@/lib/logger";
import { updateBreakdowns } from "@/store/slices/reportsSlice";
import { fetchReportsByProject, updateReportThunk, getSyncStatusThunk, extendRangeThunk } from "@/store/slices/reportsThunks";
import type { TabType, BreakdownType } from "@/store/slices/reportsSlice";
import { isDerivedMetric, calculateDerivedMetric, isSummableMetric, getMetricDependencies } from '@/lib/metricFormulas';
import { sanitizeMetricValue } from "@/lib/metricSanitizer";
import fbAdsApi from "@/api/fbAds";
import { parseISO } from "date-fns/parseISO";
import {
  selectCurrentProjectId,
  selectCurrentProject,
  selectCurrentProjectReports,
  selectCurrentReportId,
  selectCurrentReport,
  selectAccounts,
  selectSyncStatusCurrent,
  selectAvailableMetricIds,
} from "@/store/selectors";
import { resolveMetrics, filterResolvableMetrics } from "@/lib/resolveMetrics";
import { formatMetricName } from "@/data/metrics";
import { setAvailableMetrics } from "@/store/slices/availableMetricsSlice";
import { fetchSyncStatus } from "@/store/thunks/syncStatusThunks";

type SortDirection = 'asc' | 'desc';
type TextConditionOperator = 'contains' | 'not-contains' | 'equal';
type NumericConditionOperator = 'greater' | 'less' | 'equal' | 'not-equal' | 'between';

interface ColumnSort {
  direction: SortDirection;
}

interface TextCondition {
  type: 'text';
  operator: TextConditionOperator;
  value: string;
}

interface NumericCondition {
  type: 'numeric';
  operator: NumericConditionOperator;
  value: string;
  valueTo?: string;
}

interface StatusCondition {
  type: 'status';
  values: string[];
}

interface DateCondition {
  type: 'date';
  operator: 'before' | 'after' | 'on';
  value: string;
}

type ColumnCondition = TextCondition | NumericCondition | StatusCondition | DateCondition;

interface FilterMenuProps {
  columnId: string;
  columnType: 'text' | 'numeric' | 'status' | 'date';
  currentSort?: ColumnSort;
  currentCondition?: ColumnCondition;
  onApplySort: (sort: ColumnSort | null) => void;
  onApplyCondition: (condition: ColumnCondition | null) => void;
  onClose?: () => void;
}

interface SortableMetricHeaderProps {
  metricId: string;
  metricName: string;
  currentSort?: ColumnSort;
  currentCondition?: ColumnCondition;
  onApplySort: (sort: ColumnSort | null) => void;
  onApplyCondition: (condition: ColumnCondition | null) => void;
}

// Helper function to get a readable filter description
function getFilterDescription(condition: ColumnCondition): string {
  if (condition.type === 'numeric') {
    const operatorSymbol = {
      'greater': '>',
      'less': '<',
      'equal': '=',
      'not-equal': '≠',
      'between': '⟷'
    }[condition.operator];
    if (condition.operator === 'between') {
      return `${operatorSymbol} ${condition.value}-${condition.valueTo}`;
    }
    return `${operatorSymbol} ${condition.value}`;
  }
  if (condition.type === 'text') {
    const operatorText = {
      'contains': '∋',
      'not-contains': '∌',
      'equal': '='
    }[condition.operator];
    return `${operatorText} ${condition.value}`;
  }
  if (condition.type === 'date') {
    const operatorText = {
      'before': '<',
      'after': '>',
      'on': '='
    }[condition.operator];
    // Форматируем дату в читаемый вид
    const formattedDate = format(new Date(condition.value), 'dd.MM.yyyy');
    return `${operatorText} ${formattedDate}`;
  }
  if (condition.type === 'status') {
    return `${condition.values.length} selected`;
  }
  return '';
}

function buildItemsForDate(
  date: string,
  activeTab: TabType,
  selectedIds: string[],
  metricsData: Record<string, Record<string, Record<string, number>>>,
  itemsMetadata: Record<string, any>
): AnalyticsItem[] {
  const dateData = metricsData[date] || {};

  return selectedIds.map((itemId) => {
    const metadata = itemsMetadata[itemId];

    return {
      id: itemId,
      key: `${date}-${itemId}`,
      name: metadata?.name || itemId,
      subtitle: metadata?.subtitle || "",
      status: metadata?.status || "Unknown",
      thumbnail: metadata?.thumbnail || "",
      metrics: dateData[itemId] || {},
    };
  });
}

/**
 * Проверяет, есть ли у item хоть какие-то ненулевые метрики
 */
function hasAnyMetricData(item: AnalyticsItem): boolean {
  const metrics = item.metrics;
  if (!metrics || Object.keys(metrics).length === 0) {
    return false;
  }
  // Проверяем, есть ли хоть одно ненулевое значение
  return Object.values(metrics).some(value => value !== undefined && value !== null && value !== 0);
}

/**
 * Проверяет, есть ли у item показы (impressions > 0)
 */
function hasImpressions(item: AnalyticsItem): boolean {
  const impressions = item.metrics?.impressions;
  return impressions !== undefined && impressions !== null && impressions > 0;
}

/**
 * Проверяет, есть ли у даты хоть какие-то ненулевые метрики (агрегированные)
 */
function dateHasAnyMetricData(metrics: Record<string, number>): boolean {
  if (!metrics || Object.keys(metrics).length === 0) {
    return false;
  }
  return Object.values(metrics).some(value => value !== undefined && value !== null && value !== 0);
}

function aggregateMetricsForItems(
  items: AnalyticsItem[],
  selectedKeys?: Set<string>,
  restrictToSelection = false
): Record<string, number> {
  const shouldFilterBySelection = restrictToSelection && selectedKeys && selectedKeys.size > 0;
  const metricsSource = shouldFilterBySelection
    ? items.filter((item) => selectedKeys!.has(item.key))
    : items;

  if (metricsSource.length === 0) {
    return {};
  }

  const allMetricIds = new Set<string>();
  metricsSource.forEach((item) => {
    Object.keys(item.metrics).forEach((metricId) => allMetricIds.add(metricId));
  });

  if (allMetricIds.size === 0) {
    return {};
  }

  const allNeededMetrics = new Set<string>();
  allMetricIds.forEach((metricId) => {
    if (isDerivedMetric(metricId)) {
      getMetricDependencies(metricId).forEach((dep) => allNeededMetrics.add(dep));
    } else {
      allNeededMetrics.add(metricId);
    }
  });

  const baseMetrics: Record<string, number> = {};
  allNeededMetrics.forEach((metricId) => {
    baseMetrics[metricId] = 0;
  });

  metricsSource.forEach((item) => {
    allNeededMetrics.forEach((metricId) => {
      if (isSummableMetric(metricId) && item.metrics[metricId] !== undefined) {
        baseMetrics[metricId] = (baseMetrics[metricId] || 0) + item.metrics[metricId];
      }
    });
  });

  const aggregated: Record<string, number> = {};
  allMetricIds.forEach((metricId) => {
    if (isDerivedMetric(metricId)) {
      const calculated = calculateDerivedMetric(metricId, baseMetrics);
      aggregated[metricId] = calculated !== null ? calculated : 0;
    } else {
      aggregated[metricId] = baseMetrics[metricId] || 0;
    }
  });

  return aggregated;
}

// Функция нормализует insight в плоский набор числовых метрик
// Бэкенд уже разворачивает все массивы Facebook — здесь просто берём числа
const normalizeInsightMetrics = (insight: Record<string, any>): Record<string, number> => {
  const metrics: Record<string, number> = {};

  Object.entries(insight).forEach(([key, value]) => {
    if (METRIC_SKIP_FIELDS.has(key)) {
      return;
    }

    // Пропускаем объекты и массивы — бэкенд уже развернул их
    if (typeof value === 'object' && value !== null) {
      return;
    }

    const numericValue = sanitizeMetricValue(value);
    if (numericValue !== 0) {
      metrics[key] = numericValue;
    } else if (value === 0 || value === '0') {
      metrics[key] = 0;
    }
  });

  return metrics;
};

const buildDateRangeKey = (range?: DateRange) => {
  if (!range?.from) return "none";
  const from = range.from.getTime();
  const to = (range.to ?? range.from).getTime();
  return `${from}-${to}`;
};

// CRM метрики — идентифицируются по префиксу
const CRM_METRIC_IDS = new Set([
  'crm_leads', 'crm_leads_unique', 'cpl',
  'crm_deals', 'crm_deals_won', 'crm_conversion_rate', 'crm_win_rate',
  'crm_revenue', 'crm_avg_deal_value', 'crm_roi', 'crm_roas',
  'crm_match_rate', 'crm_matched_leads', 'crm_unmatched_leads',
  'crm_leads_fb_lead_ads', 'crm_leads_fbclid', 'crm_leads_utm',
]);

function isCrmMetric(metricId: string): boolean {
  return CRM_METRIC_IDS.has(metricId) || metricId.startsWith('crm_');
}

// Получить значение CRM метрики из объекта CrmObjectMetrics
function getCrmMetricValue(metrics: CrmObjectMetrics, metricId: string): number | undefined {
  const key = metricId as keyof CrmObjectMetrics;
  return metrics[key];
}

function SortableMetricHeader({
  metricId,
  metricName,
  currentSort,
  currentCondition,
  onApplySort,
  onApplyCondition,
}: SortableMetricHeaderProps) {
  const [open, setOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metricId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider relative bg-muted z-20"
      data-testid={`table-header-${metricId}`}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </button>
          <span>{metricName}</span>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button 
                className={`p-0.5 hover:bg-muted-foreground/10 rounded ${(currentSort || currentCondition) ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`}
                data-testid={`button-filter-${metricId}`}
              >
                <Filter className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start" sideOffset={5}>
              <FilterMenu
                columnId={metricId}
                columnType="numeric"
                currentSort={currentSort}
                currentCondition={currentCondition}
                onApplySort={onApplySort}
                onApplyCondition={onApplyCondition}
                onClose={() => setOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>
        {currentCondition && (
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary hover:bg-primary/20 font-mono"
            data-testid={`badge-filter-${metricId}`}
          >
            {getFilterDescription(currentCondition)}
          </Badge>
        )}
      </div>
    </th>
  );
}

// Компонент фильтра Parent с чипами (как в ObjectSelectionPanel)
interface ParentFilterPopoverProps {
  currentFilter: ParentFilter | null;
  onApplyFilter: (filter: ParentFilter | null) => void;
}

function ParentFilterPopover({ currentFilter, onApplyFilter }: ParentFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [operator, setOperator] = useState<'contains' | 'not-contains' | 'equal'>(currentFilter?.operator || 'contains');
  const [values, setValues] = useState<string[]>(currentFilter?.values || []);
  const [inputValue, setInputValue] = useState('');

  // Синхронизация при открытии
  useEffect(() => {
    if (open) {
      setOperator(currentFilter?.operator || 'contains');
      setValues(currentFilter?.values || []);
      setInputValue('');
    }
  }, [open, currentFilter]);

  const handleAddValue = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      setValues([...values, trimmed]);
      setInputValue('');
    }
  };

  const handleRemoveValue = (value: string) => {
    setValues(values.filter(v => v !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddValue();
    }
  };

  const handleApply = () => {
    // Для equal добавляем значение из инпута если есть
    let finalValues = values;
    if (operator === 'equal' && inputValue.trim()) {
      finalValues = [inputValue.trim()];
    }
    
    if (finalValues.length > 0) {
      onApplyFilter({ operator, values: finalValues });
    } else {
      onApplyFilter(null);
    }
    setOpen(false);
  };

  const handleReset = () => {
    setOperator('contains');
    setValues([]);
    setInputValue('');
    onApplyFilter(null);
    setOpen(false);
  };

  const isMultiValue = operator === 'contains' || operator === 'not-contains';
  const hasFilter = currentFilter && currentFilter.values.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={`p-1.5 rounded-md hover:bg-accent transition-colors ${hasFilter ? 'bg-primary/10' : ''}`}
          data-testid="button-filter-parent"
        >
          <Filter className={`w-4 h-4 ${hasFilter ? 'text-primary' : 'text-muted-foreground'}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-3" align="start">
        <div className="text-sm font-medium">Parent filter</div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium">Conditions</div>
          <Select
            value={operator}
            onValueChange={(value: 'contains' | 'not-contains' | 'equal') => {
              setOperator(value);
              setValues([]);
              setInputValue('');
            }}
          >
            <SelectTrigger className="w-full" data-testid="select-parent-condition">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[200] bg-background">
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="not-contains">Does not contain</SelectItem>
              <SelectItem value="equal">Equal to</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="space-y-2">
            <Input
              placeholder={isMultiValue ? "Add value and press Enter" : "Enter text"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              data-testid="input-parent-filter-value"
            />
            
            {/* Показываем теги только для contains/not-contains */}
            {isMultiValue && values.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {values.map((value, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-xs px-2 py-0.5 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveValue(value)}
                  >
                    {value}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Для equal - просто добавляем одно значение при вводе */}
            {operator === 'equal' && inputValue.trim() && (
              <div className="text-xs text-muted-foreground">
                Press Apply to filter by "{inputValue}"
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 pt-2">
          <Button size="sm" variant="outline" onClick={handleReset} className="flex-1 h-8 text-sm" data-testid="button-reset-parent-filter">
            Reset
          </Button>
          <Button 
            size="sm" 
            onClick={handleApply} 
            className="flex-1 h-8 text-sm"
            data-testid="button-apply-parent-filter"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Facebook Ads statuses
const FB_AD_STATUSES = [
  { value: 'Active', label: 'Active' },
  { value: 'Paused', label: 'Paused' },
  { value: 'Pending Review', label: 'Pending Review' },
  { value: 'Disapproved', label: 'Disapproved' },
  { value: 'Archived', label: 'Archived' },
  { value: 'Completed', label: 'Completed' },
];

function FilterMenu({ columnId, columnType, currentSort, currentCondition, onApplySort, onApplyCondition, onClose }: FilterMenuProps) {
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(currentSort?.direction || null);
  const [conditionOperator, setConditionOperator] = useState<string | null>(
    currentCondition ? (currentCondition.type === 'status' ? 'status' : currentCondition.operator) : null
  );
  const [inputValue, setInputValue] = useState<string>(
    currentCondition && 'value' in currentCondition ? currentCondition.value : ''
  );
  const [inputValueTo, setInputValueTo] = useState<string>(
    currentCondition && currentCondition.type === 'numeric' ? currentCondition.valueTo || '' : ''
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
    if (columnType === 'status') {
      if (selectedStatuses.size > 0) {
        onApplyCondition({ type: 'status', values: Array.from(selectedStatuses) });
      } else {
        onApplyCondition(null);
      }
    } else if (columnType === 'date') {
      if (conditionOperator && inputValue) {
        onApplyCondition({ type: 'date', operator: conditionOperator as 'before' | 'after' | 'on', value: inputValue });
      } else {
        onApplyCondition(null);
      }
    } else if (columnType === 'numeric' && conditionOperator) {
      const operator = conditionOperator as NumericConditionOperator;
      if (operator === 'between') {
        if (inputValue.trim() && inputValueTo.trim()) {
          onApplyCondition({ type: 'numeric', operator, value: inputValue, valueTo: inputValueTo });
        } else {
          onApplyCondition(null);
        }
      } else {
        if (inputValue.trim()) {
          onApplyCondition({ type: 'numeric', operator, value: inputValue });
        } else {
          onApplyCondition(null);
        }
      }
    } else if (columnType === 'text' && conditionOperator) {
      if (inputValue.trim()) {
        onApplyCondition({ type: 'text', operator: conditionOperator as TextConditionOperator, value: inputValue });
      } else {
        onApplyCondition(null);
      }
    } else {
      onApplyCondition(null);
    }
  };

  const handleReset = () => {
    setSortDirection(null);
    setConditionOperator(null);
    setInputValue('');
    setInputValueTo('');
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
  const needsTwoInputs = conditionOperator === 'between';

  return (
    <div className="w-72 p-3 space-y-3">
      {columnType !== 'status' && (
        <div className="space-y-2 pb-2 border-b border-border">
          <div className="text-sm font-medium">Sort</div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (sortDirection === 'desc') {
                  setSortDirection(null); // Repeat click clears sort
                } else {
                  setSortDirection('desc'); // First click or switch from asc
                }
              }}
              className={`flex-1 px-2.5 py-1.5 text-sm text-center rounded-md transition-colors ${
                sortDirection === 'desc'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted border border-input'
              }`}
              data-testid={`sort-desc-${columnId}`}
              title={sortDirection === 'desc' ? 'Click to reset sort' : 'Sort descending'}
            >
              {columnType === 'numeric' ? 'High→Low' : columnType === 'date' ? 'Newest→Oldest' : 'Z→A'}
            </button>
            <button
              onClick={() => {
                if (sortDirection === 'asc') {
                  setSortDirection(null); // Repeat click clears sort
                } else {
                  setSortDirection('asc'); // First click or switch from desc
                }
              }}
              className={`flex-1 px-2.5 py-1.5 text-sm text-center rounded-md transition-colors ${
                sortDirection === 'asc'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted border border-input'
              }`}
              data-testid={`sort-asc-${columnId}`}
              title={sortDirection === 'asc' ? 'Click to reset sort' : 'Sort ascending'}
            >
              {columnType === 'numeric' ? 'Low→High' : columnType === 'date' ? 'Oldest→Newest' : 'A→Z'}
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <div className="text-sm font-medium">Conditions</div>
        {columnType === 'status' ? (
          <div className="space-y-1.5">
            {FB_AD_STATUSES.map((status) => (
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
                ) : columnType === 'numeric' ? (
                  <>
                    <SelectItem value="greater">Greater than</SelectItem>
                    <SelectItem value="less">Less than</SelectItem>
                    <SelectItem value="equal">Equal to</SelectItem>
                    <SelectItem value="not-equal">Not equal to</SelectItem>
                    <SelectItem value="between">Between</SelectItem>
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
            {needsInput && columnType === 'date' ? (
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
            ) : needsInput && !needsTwoInputs ? (
              <Input
                placeholder={columnType === 'numeric' ? 'Enter a number' : 'Enter text'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="h-8 text-sm"
              />
            ) : null}
            {needsTwoInputs && (
              <div className="space-y-1.5">
                <Input
                  placeholder="From"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="To"
                  value={inputValueTo}
                  onChange={(e) => setInputValueTo(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-1.5 pt-2">
        <Button size="sm" variant="outline" onClick={handleReset} className="flex-1 h-8 text-sm" data-testid="button-reset-filter">
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
          data-testid="button-apply-filter"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

type MetricsData = Record<string, Record<string, Record<string, number>>>;
type ItemMetadata = Record<string, { name: string; subtitle?: string; status: string; thumbnail?: string }>;
type HierarchyData = Record<string, { 
  account?: string; 
  accountName?: string;
  campaign?: string; 
  campaignName?: string;
  adset?: string; 
  adsetName?: string;
  ad?: string;
  adName?: string;
}>;

export default function AnalyticsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentProjectId = useAppSelector(selectCurrentProjectId);
  const currentProject = useAppSelector(selectCurrentProject);
  const reports = useAppSelector(selectCurrentProjectReports);
  const currentReportId = useAppSelector(selectCurrentReportId);
  const currentReport = useAppSelector(selectCurrentReport);
  const accounts = useAppSelector(selectAccounts);
  const syncStatusCurrent = useAppSelector(selectSyncStatusCurrent);
  const availableMetricIds = useAppSelector(selectAvailableMetricIds);
  
  // Auto-init: если зашли на /analytics но нет проекта/отчёта — загрузим
  const autoInitRef = useRef(false);
  
  // Сбрасываем autoInitRef при монтировании (возврат на страницу)
  useEffect(() => {
    autoInitRef.current = false;
  }, []);
  
  useEffect(() => {
    // Debug: логируем состояние при каждом рендере
    logger.log('[AnalyticsPage] State check:', {
      currentProjectId,
      currentReportId,
      reportsCount: reports.length,
      autoInitRef: autoInitRef.current,
      currentProjectWorkspaceId: currentProject?.workspaceId,
    });
    
    if (autoInitRef.current) return;
    
    const initData = async () => {
      // Если нет проекта — загрузить проекты и выбрать первый
      if (!currentProjectId) {
        logger.log('[AnalyticsPage] No project, auto-loading...');
        autoInitRef.current = true;
        
        const { fetchProjects, setCurrentProject } = await import('@/store/slices/projectsSlice');
        const result = await dispatch(fetchProjects());
        
        if (fetchProjects.fulfilled.match(result) && result.payload.length > 0) {
          const firstProject = result.payload[0];
          dispatch(setCurrentProject(firstProject.id));
          
          // Загрузить отчёты
          const { fetchReportsByProject } = await import('@/store/slices/reportsThunks');
          const { setCurrentReport } = await import('@/store/slices/reportsSlice');
          const reportsResult = await dispatch(fetchReportsByProject({ projectId: firstProject.id }));
          
          if (fetchReportsByProject.fulfilled.match(reportsResult) && reportsResult.payload.reports.length > 0) {
            dispatch(setCurrentReport(reportsResult.payload.reports[0].id));
          } else {
            // Нет отчётов — редирект на selection
            navigate('/selection');
          }
        } else {
          // Нет проектов — редирект на projects
          navigate('/projects');
        }
      } else if (!currentReportId && reports.length > 0) {
        // Есть проект но нет отчёта — выбрать первый
        logger.log('[AnalyticsPage] No report selected, auto-selecting first...');
        autoInitRef.current = true;
        const { setCurrentReport } = await import('@/store/slices/reportsSlice');
        dispatch(setCurrentReport(reports[0].id));
      } else if (!currentReportId && reports.length === 0 && currentProjectId) {
        // Есть проект но нет отчётов — загрузить отчёты
        logger.log('[AnalyticsPage] No reports, loading...');
        autoInitRef.current = true;
        const { fetchReportsByProject } = await import('@/store/slices/reportsThunks');
        const { setCurrentReport } = await import('@/store/slices/reportsSlice');
        const reportsResult = await dispatch(fetchReportsByProject({ projectId: currentProjectId }));
        
        if (fetchReportsByProject.fulfilled.match(reportsResult) && reportsResult.payload.reports.length > 0) {
          dispatch(setCurrentReport(reportsResult.payload.reports[0].id));
        } else {
          navigate('/selection');
        }
      }
    };
    
    initData();
  }, [dispatch, navigate, currentProjectId, currentReportId, reports.length]);
  
  // Debounced save для report updates (таб, метрики, даты)
  // Мгновенное обновление UI + отложенная синхронизация с сервером
  const { queueUpdate, flushNow } = useDebouncedReportUpdate({
    projectId: currentProjectId,
    reportId: currentReportId,
  });
  
  // metricsData, itemsMetadata, hierarchyData теперь получаются из useReportCache (ниже)
  const [isInitialSyncInProgress, setIsInitialSyncInProgress] = useState(false);
  const previousSyncStatusRef = useRef<string | null>(null);
  const autoTabFixSignatureRef = useRef<string | null>(null);

  const stableAccountIds = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return [] as string[];
    }
    return [...accounts.map((account) => account.id)].sort((a, b) => a.localeCompare(b));
  }, [accounts]);

  // Получаем валюту аккаунта (если все аккаунты с одной валютой — используем её, иначе USD)
  const accountCurrency = useMemo(() => {
    if (!accounts || accounts.length === 0) return 'USD';
    const currencies = [...new Set(accounts.map(a => a.currency).filter(Boolean))];
    // Если все аккаунты одной валюты — используем её
    if (currencies.length === 1) return currencies[0];
    // Если разные валюты — показываем USD как дефолт (можно потом сделать выбор)
    return 'USD';
  }, [accounts]);

  const selectionsSignature = useMemo(() => {
    if (!currentReport?.selections) {
      return "{}";
    }
    return JSON.stringify(currentReport.selections);
  }, [currentReport?.selections]);

  // Переменные состояния, используемые в analyticsFetchParams
  // Инициализируем из report или дефолтное значение
  const [attribution, setAttribution] = useState<string>(
    currentReport?.attribution || "7d_click_1d_view"
  );
  const [availableAttributions, setAvailableAttributions] = useState<Array<{
    value: string;
    label: string;
    count: number;
  }>>([]);
  const [isLoadingAttributions, setIsLoadingAttributions] = useState(false);
  
  // Ref для отслеживания пользовательского изменения vs синхронизации из Redux
  const attributionUserChangeRef = useRef(false);
  
  // Синхронизация attribution из report при смене отчёта (НЕ при каждом обновлении)
  const lastSyncedReportIdForAttributionRef = useRef<string | null>(null);
  useEffect(() => {
    // Только при смене отчёта синхронизируем attribution из Redux
    if (currentReport?.id && currentReport.id !== lastSyncedReportIdForAttributionRef.current) {
      lastSyncedReportIdForAttributionRef.current = currentReport.id;
      if (currentReport.attribution && currentReport.attribution !== attribution) {
        setAttribution(currentReport.attribution);
      }
    }
  }, [currentReport?.id, currentReport?.attribution]);
  
  // Сохранение attribution в report при ПОЛЬЗОВАТЕЛЬСКОМ изменении
  const handleAttributionChange = useCallback((newValue: string) => {
    if (newValue !== attribution) {
      setAttribution(newValue);
      // Сохраняем в report через debounced update
      if (currentReport && newValue !== currentReport.attribution) {
        queueUpdate({ attribution: newValue });
      }
    }
  }, [attribution, currentReport, queueUpdate]);
  
  // Загрузка доступных атрибуций при смене аккаунтов
  useEffect(() => {
    const loadAttributionSettings = async () => {
      if (!stableAccountIds || stableAccountIds.length === 0) return;
      
      setIsLoadingAttributions(true);
      try {
        const response = await fbAdsApi.marketing.getAttributionSettings(stableAccountIds[0]);
        if (response.success && response.attributionSettings.length > 0) {
          setAvailableAttributions(response.attributionSettings);
          const currentAvailable = response.attributionSettings.find((a) => a.value === attribution);
          if (!currentAvailable) {
            // Используем первый доступный, но не вызываем queueUpdate здесь
            // (это не пользовательское действие, а авто-коррекция)
            setAttribution(response.attributionSettings[0].value);
          }
        }
      } catch (error) {
        logger.error('[AnalyticsPage] Failed to load attribution settings:', error);
      } finally {
        setIsLoadingAttributions(false);
      }
    };
    
    loadAttributionSettings();
  }, [stableAccountIds]);
  
  // Функция для получения дефолтного периода - Report-First Sync Architecture
  // Приоритет: dataRange.startDate/endDate (from sync) > dateFrom/dateTo (user override) > fallback 30 days
  const getDefaultPeriod = (): DateRange => {
    // Fallback: последние 30 дней от сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 29);
    monthAgo.setHours(0, 0, 0, 0);
    return { from: monthAgo, to: today };
  };

  const [periodA, setPeriodA] = useState<DateRange | undefined>(getDefaultPeriod);
  
  // ФИКС глюка дат: ref для отслеживания локальных изменений
  // Предотвращает откат periodA из Redux после локального обновления
  const localDateChangeRef = useRef<{ from: number; to: number } | null>(null);
  const lastSyncedReportIdRef = useRef<string | null>(null);
  
  // Синхронизация periodA с данными из report ТОЛЬКО при загрузке/смене отчёта
  // Приоритет: dataRange (from sync) > dateFrom/dateTo (user override)
  // ФИКС: Игнорируем Redux если есть pending локальное изменение
  useEffect(() => {
    // Определяем источник дат: dataRange (from report-first sync) или dateFrom/dateTo (user saved)
    const dataRangeStart = currentReport?.dataRange?.startDate;
    const dataRangeEnd = currentReport?.dataRange?.endDate;
    const userDateFrom = currentReport?.dateFrom;
    const userDateTo = currentReport?.dateTo;
    
    // Приоритет: dataRange > dateFrom/dateTo (dataRange — это якорённый диапазон от lastActiveDate)
    const effectiveFrom = dataRangeStart || userDateFrom;
    const effectiveTo = dataRangeEnd || userDateTo;
    
    if (effectiveFrom && effectiveTo) {
      const from = new Date(effectiveFrom);
      const to = new Date(effectiveTo);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      
      const newFromTime = from.getTime();
      const newToTime = to.getTime();
      
      // ФИКС: Если это тот же отчёт и есть локальное изменение — игнорируем Redux
      if (lastSyncedReportIdRef.current === currentReport.id && localDateChangeRef.current) {
        const { from: localFrom, to: localTo } = localDateChangeRef.current;
        // Redux догнал локальное изменение — сбрасываем флаг
        if (newFromTime === localFrom && newToTime === localTo) {
          logger.log('[AnalyticsPage] Redux synced with local date change, clearing flag');
          localDateChangeRef.current = null;
        } else {
          // Redux ещё не синхронизирован — игнорируем его
          logger.log('[AnalyticsPage] Ignoring Redux dates, local change pending');
          return;
        }
      }
      
      logger.log('[AnalyticsPage] useEffect sync from report:', {
        reportId: currentReport.id,
        reportDateFrom: currentReport.dateFrom,
        reportDateTo: currentReport.dateTo,
      });
      
      // Используем функциональное обновление для проверки текущего состояния
      setPeriodA((currentPeriod) => {
        const currentFromTime = currentPeriod?.from?.getTime();
        const currentToTime = currentPeriod?.to?.getTime();
        
        // Если даты совпадают — возвращаем текущее состояние (без изменений)
        if (currentFromTime === newFromTime && currentToTime === newToTime) {
          logger.log('[AnalyticsPage] useEffect: dates match, skipping update');
          return currentPeriod;
        }
        
        logger.log('[AnalyticsPage] useEffect: updating periodA from report', {
          oldFrom: currentPeriod?.from ? format(currentPeriod.from, 'yyyy-MM-dd') : null,
          oldTo: currentPeriod?.to ? format(currentPeriod.to, 'yyyy-MM-dd') : null,
          newFrom: format(from, 'yyyy-MM-dd'),
          newTo: format(to, 'yyyy-MM-dd'),
        });
        
        // Обновляем
        lastSyncedReportIdRef.current = currentReport.id;
        return { from, to };
      });
    }
  }, [currentReport?.id, currentReport?.dateFrom, currentReport?.dateTo, currentReport?.dataRange?.startDate, currentReport?.dataRange?.endDate]);

  // analyticsFetchParams удалён — теперь используется useReportCache

  // Загружаем отчёты только если их нет в стейте
  const reportsAlreadyLoaded = reports.length > 0;
  
  useEffect(() => {
    if (!currentProjectId) return;
    // Не перезагружаем если отчёты уже есть
    if (reportsAlreadyLoaded) return;

    dispatch(fetchReportsByProject({ projectId: currentProjectId }));
  }, [currentProjectId, dispatch, reportsAlreadyLoaded]);

  // Периодическая проверка статуса синхронизации
  useEffect(() => {
    // Запускаем проверку синхронизации при монтировании
    dispatch(fetchSyncStatus());
    
    // Проверяем статус каждые 10 секунд пока идёт первичная синхронизация
    const interval = setInterval(() => {
      const status = syncStatusCurrent?.status;
      // Poll only while sync job is actually active
      if (status === 'queued' || status === 'running') {
        dispatch(fetchSyncStatus());
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [dispatch, syncStatusCurrent?.status]);

  // Polling статуса Report-First Sync: перемещён ниже после объявления useReportCache
  const isReportSyncing = currentReport?.status === 'syncing' || currentReport?.status === 'extending';
  const previousReportStatusRef = useRef<string | null>(null);
  
  // Флаг для предотвращения авто-выделения после ручного изменения пользователем
  // Сбрасывается при монтировании компонента, смене отчёта или таба
  const hasInitializedSelectionRef = useRef(false);
  const userModifiedSelectionRef = useRef(false); // Пользователь вручную менял выделение
  const lastTabRef = useRef<string | null>(null);
  const lastReportIdRef = useRef<string | null>(null);
  
  // Сбрасываем флаги при монтировании компонента (возврат на страницу)
  useEffect(() => {
    hasInitializedSelectionRef.current = false;
    userModifiedSelectionRef.current = false;
    lastTabRef.current = null;
    lastReportIdRef.current = null;
  }, []);
  
  useEffect(() => {
    if (!currentReportId || !isReportSyncing) {
      previousReportStatusRef.current = currentReport?.status ?? null;
      return;
    }

    // Polling каждые 3 секунды пока отчёт синхронизируется
    const interval = setInterval(() => {
      dispatch(getSyncStatusThunk({ reportId: currentReportId }));
    }, 3000);

    logger.log(`[AnalyticsPage] Started report sync polling for ${currentReportId}`);

    return () => {
      clearInterval(interval);
      logger.log(`[AnalyticsPage] Stopped report sync polling for ${currentReportId}`);
    };
  }, [dispatch, currentReportId, isReportSyncing]);

  // Отслеживаем завершение синхронизации для показа уведомления и рефреша данных
  // Перемещено ниже после объявления useReportCache


  const location = useLocation();
  // navigate уже объявлен выше для auto-init
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
  // Thumbnail zoom state
  const [zoomedThumbnail, setZoomedThumbnail] = useState<{ url: string; name: string } | null>(null);
  const [periodB, setPeriodB] = useState<DateRange | undefined>(undefined);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [alignment, setAlignment] = useState("previous");

  // Расширенный диапазон дат для режима сравнения
  // В режиме compare нужно загрузить данные за ОБА периода (A и B)
  const extendedDateRange = useMemo(() => {
    let result;
    if (compareEnabled && periodB?.from && periodA?.from) {
      // Берём самую раннюю дату из обоих периодов
      const periodAFrom = periodA.from;
      const periodBFrom = periodB.from;
      const fromDate = periodAFrom < periodBFrom ? periodAFrom : periodBFrom;
      
      // Берём самую позднюю дату из обоих периодов
      const periodATo = periodA.to ?? periodA.from;
      const periodBTo = periodB.to ?? periodB.from;
      const toDate = periodATo > periodBTo ? periodATo : periodBTo;
      
      result = {
        dateFrom: format(fromDate, "yyyy-MM-dd"),
        dateTo: format(toDate, "yyyy-MM-dd"),
      };
    } else {
      // Без сравнения — только Period A
      result = {
        dateFrom: format(periodA?.from ?? new Date(), "yyyy-MM-dd"),
        dateTo: format(periodA?.to ?? periodA?.from ?? new Date(), "yyyy-MM-dd"),
      };
    }
    logger.log('[AnalyticsPage] extendedDateRange computed:', result, 'from periodA:', periodA ? { from: format(periodA.from!, 'yyyy-MM-dd'), to: format(periodA.to!, 'yyyy-MM-dd') } : null);
    return result;
  }, [compareEnabled, periodA?.from?.getTime(), periodA?.to?.getTime(), periodB?.from?.getTime(), periodB?.to?.getTime()]);

  const [parentDisplay, setParentDisplay] = useState<"account" | "campaign" | "adset" | "ad" | "none">("account");
  const [parentFilter, setParentFilter] = useState<ParentFilter | null>(null);
  const [columnSorts, setColumnSorts] = useState<Record<string, ColumnSort>>({});
  const [columnConditions, setColumnConditions] = useState<Record<string, ColumnCondition>>({});
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  // ФИКС глюка табов: используем локальный state для мгновенного переключения
  // Это предотвращает моргание при переходе между табами
  const [localActiveTab, setLocalActiveTab] = useState<TabType>('campaigns');
  
  // Ref для отслеживания какому отчёту принадлежит локальный таб
  // ВАЖНО: ref должен быть объявлен ДО useEffect который его использует
  const localActiveTabReportIdRef = useRef<string | null>(null);
  
  // Синхронизируем локальный таб с Redux только при смене отчёта
  useEffect(() => {
    if (currentReport?.activeTab && currentReport.activeTab !== localActiveTab) {
      // Обновляем только если это новый отчёт (не оптимистичное обновление)
      const isNewReport = currentReport.id !== localActiveTabReportIdRef.current;
      if (isNewReport) {
        setLocalActiveTab(currentReport.activeTab);
        localActiveTabReportIdRef.current = currentReport.id;
      }
    }
  }, [currentReport?.id, currentReport?.activeTab]);
  
  // Используем локальный таб для рендера (мгновенное переключение)
  const activeTab = localActiveTab;

  // === КЭШИРОВАНИЕ ДАННЫХ ВСЕХ ТАБОВ ===
  // Подготавливаем selectionsByTab для кэша
  const selectionsByTab = useMemo(() => ({
    campaigns: currentReport?.selections?.campaigns || [],
    adsets: currentReport?.selections?.adsets || [],
    ads: currentReport?.selections?.ads || [],
    creatives: currentReport?.selections?.creatives || [],
  }), [currentReport?.selections]);

  // Маппинг accountId → accountName для отображения имён аккаунтов вместо ID
  const accountNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach(acc => {
      if (acc.adAccountId) {
        map[acc.adAccountId] = acc.name || acc.adAccountId;
      }
      if (acc.id) {
        map[acc.id] = acc.name || acc.id;
      }
    });
    return map;
  }, [accounts]);

  // Вычисляем даты загрузки (loadDate) из dataRange отчёта
  // loadDate = полный диапазон загруженных данных
  // displayDate = текущий выбранный пользователем период (periodA)
  const loadDates = useMemo(() => {
    const dataRange = currentReport?.dataRange;
    
    // Если есть dataRange от Report-First Sync — используем его
    if (dataRange?.startDate && dataRange?.endDate) {
      logger.log('[AnalyticsPage] Using dataRange for load dates:', {
        startDate: dataRange.startDate,
        endDate: dataRange.endDate,
        loadedDays: dataRange.loadedDays,
      });
      return {
        loadDateFrom: dataRange.startDate,
        loadDateTo: dataRange.endDate,
      };
    }
    
    // Fallback: используем periodA (старое поведение — до Report-First Sync)
    const fallback = {
      loadDateFrom: format(periodA?.from ?? new Date(), 'yyyy-MM-dd'),
      loadDateTo: format(periodA?.to ?? periodA?.from ?? new Date(), 'yyyy-MM-dd'),
    };
    logger.log('[AnalyticsPage] No dataRange, using periodA as fallback:', fallback);
    return fallback;
  }, [currentReport?.dataRange, periodA]);

  // Хук кэширования — загружает все табы параллельно + prefetch Period B
  // ВАЖНО: loadDate = полный dataRange, displayDate = текущий период
  // Смена периода НЕ перезагружает данные — только фильтрует!
  const {
    cache: reportCache,
    isLoading: isCacheLoading,
    isLoadingPeriodB,
    loadingTabs,
    getTabData,
    refreshCache,
    error: cacheError,
  } = useReportCache({
    workspaceId: currentProject?.workspaceId,
    reportId: currentReport?.id,
    loadDateFrom: loadDates.loadDateFrom,
    loadDateTo: loadDates.loadDateTo,
    displayDateFrom: format(periodA?.from ?? new Date(), 'yyyy-MM-dd'),
    displayDateTo: format(periodA?.to ?? periodA?.from ?? new Date(), 'yyyy-MM-dd'),
    periodBFrom: periodB?.from ? format(periodB.from, 'yyyy-MM-dd') : undefined,
    periodBTo: periodB?.to ? format(periodB.to, 'yyyy-MM-dd') : undefined,
    compareEnabled,
    attribution,
    accountIds: stableAccountIds,
    selectionsByTab,
    accountNameMap,
  });

  // Получаем данные текущего таба из кэша
  const currentTabData = getTabData(activeTab as CacheTabType);
  const periodBTabData = compareEnabled ? getTabData(activeTab as CacheTabType, true) : null;

  // Используем данные из кэша (или пустые объекты если кэш пуст)
  const metricsData = currentTabData?.metricsData || {};
  const itemsMetadata = currentTabData?.itemsMetadata || {};
  const hierarchyData = currentTabData?.hierarchyData || {};
  const isLoadingData = isCacheLoading;

  // === CRM АНАЛИТИКА ===
  // Хук для получения метрик из Kommo CRM
  const {
    metrics: crmMetrics,
    crmName,
    crmConnected,
    pipelines: crmPipelines,
    users: crmUsers,
    selectedPipelineId: crmPipelineId,
    selectedUserId: crmUserId,
    setSelectedPipelineId: setCrmPipelineId,
    setSelectedUserId: setCrmUserId,
    getMetricsForCampaign,
    getMetricsForAdset,
    getMetricsForAd,
    getMetricsForDate,
    isLoading: isCrmLoading,
  } = useCrmAnalytics({
    startDate: format(periodA?.from ?? new Date(), 'yyyy-MM-dd'),
    endDate: format(periodA?.to ?? periodA?.from ?? new Date(), 'yyyy-MM-dd'),
    campaignIds: currentReport?.selections?.campaigns,
    adsetIds: currentReport?.selections?.adsets,
    adIds: currentReport?.selections?.ads,
  });

  // Обновляем availableMetrics в Redux при изменении данных кэша
  useEffect(() => {
    if (currentTabData?.availableMetricKeys) {
      dispatch(setAvailableMetrics(currentTabData.availableMetricKeys));
    }
  }, [currentTabData?.availableMetricKeys, dispatch]);

  // Отслеживаем завершение Report-First Sync и обновляем данные
  useEffect(() => {
    const currentStatus = currentReport?.status;
    const prevStatus = previousReportStatusRef.current;

    // Если статус изменился с syncing/extending на ready — синхронизация завершена
    if ((prevStatus === 'syncing' || prevStatus === 'extending') && currentStatus === 'ready') {
      logger.log('[AnalyticsPage] Report sync completed! Refreshing data...');
      refreshCache();
    }

    previousReportStatusRef.current = currentStatus ?? null;
  }, [currentReport?.status, refreshCache]);

  // Отслеживаем завершение синхронизации для показа уведомления и рефреша данных
  useEffect(() => {
    const currentStatus = syncStatusCurrent?.status;
    const prevStatus = previousSyncStatusRef.current;
    
    // Если статус изменился на succeeded — синхронизация завершена
    // Иногда job может перейти queued -> succeeded слишком быстро, минуя running
    if (currentStatus === 'succeeded' && prevStatus !== 'succeeded') {
      logger.log('[AnalyticsPage] Sync completed! Refreshing data...');
      // Обновляем кэш через refreshCache
      refreshCache();
    }
    
    previousSyncStatusRef.current = currentStatus ?? null;
  }, [syncStatusCurrent?.status, refreshCache]);

  // Сбрасываем parentDisplay если выбранная опция недоступна для текущего таба
  useEffect(() => {
    const validOptions: Record<string, string[]> = {
      campaigns: ['account', 'none'],
      adsets: ['account', 'campaign', 'none'],
      ads: ['account', 'campaign', 'adset', 'none'],
      creatives: ['account', 'campaign', 'adset', 'ad', 'none'],
    };
    const allowed = validOptions[activeTab] || ['account', 'none'];
    if (!allowed.includes(parentDisplay)) {
      setParentDisplay('account');
    }
  }, [activeTab]);
  const [useTableSelection, setUseTableSelection] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast} = useToast();

  // Handler for extending data range when user clicks preset beyond loaded days
  const handleExtendRange = useCallback((targetDays: number) => {
    if (!currentProjectId || !currentReportId) return;
    
    const loadedDays = currentReport?.dataRange?.loadedDays || 30;
    if (targetDays <= loadedDays) return;
    
    logger.log('[AnalyticsPage] Extending data range:', { loadedDays, targetDays });
    toast({
      title: 'Extending data range',
      description: `Loading data for ${targetDays} days... This may take 1–3 minutes.`,
    });
    
    dispatch(extendRangeThunk({ 
      projectId: currentProjectId, 
      reportId: currentReportId, 
      targetDays 
    }));
  }, [currentProjectId, currentReportId, currentReport?.dataRange?.loadedDays, dispatch, toast]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Automatically switch activeTab to level with selected elements
  useEffect(() => {
    logger.log('🔍 useEffect checking activeTab:', { 
      hasCurrentReport: !!currentReport, 
      hasProjectId: !!currentProjectId,
      activeTab: currentReport?.activeTab,
      selections: currentReport?.selections
    });

    if (!currentReport || !currentProjectId) return;

    const { selections, activeTab: reportActiveTab } = currentReport;
    const currentTabHasData = selections[reportActiveTab]?.length > 0;

    logger.log('✅ Current tab data check:', { activeTab: reportActiveTab, currentTabHasData, selectionLength: selections[reportActiveTab]?.length });

    if (currentTabHasData) {
      autoTabFixSignatureRef.current = null;
      return;
    }

    const ensureValidTab = async () => {
      const tabPriority: TabType[] = ['creatives', 'ads', 'adsets', 'campaigns'];

      for (const tab of tabPriority) {
        if (selections[tab]?.length > 0) {
          const selectionFingerprint = JSON.stringify(selections[tab]);
          const runSignature = `${currentReport.id}:${tab}:${selectionFingerprint}`;

          if (autoTabFixSignatureRef.current === runSignature) {
            logger.log('⚠️ Skipping repeated activeTab auto-fix for', runSignature);
            return;
          }

          autoTabFixSignatureRef.current = runSignature;

          logger.log('🔄 Switching activeTab to:', tab, 'with', selections[tab]?.length, 'items');
          try {
            await dispatch(updateReportThunk({
              projectId: currentProjectId,
              reportId: currentReport.id,
              updates: { activeTab: tab },
            })).unwrap();
          } catch (error: any) {
            autoTabFixSignatureRef.current = null;
            toast({
              variant: "destructive",
              title: "Failed to update active tab",
              description: error?.message || "Unexpected error",
            });
          }
          break;
        }
      }
    };

    void ensureValidTab();
  }, [currentReport?.id, currentReport?.activeTab, currentReport?.selections, currentProjectId, dispatch, toast]);

  const applyColumnSort = (columnId: string, sort: ColumnSort | null) => {
    setColumnSorts(prev => {
      const newSorts = { ...prev };
      if (sort) {
        newSorts[columnId] = sort;
      } else {
        delete newSorts[columnId];
      }
      return newSorts;
    });
  };

  const applyColumnCondition = (columnId: string, condition: ColumnCondition | null) => {
    setColumnConditions(prev => {
      const newConditions = { ...prev };
      if (condition) {
        newConditions[columnId] = condition;
      } else {
        delete newConditions[columnId];
      }
      return newConditions;
    });
  };

  const toggleRowExpansion = (dateKey: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const toggleCheckbox = (itemKey: string) => {
    userModifiedSelectionRef.current = true;
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const toggleDateCheckbox = (dateKey: string, dateItems: string[]) => {
    userModifiedSelectionRef.current = true;
    const isChecked = checkedDates.has(dateKey);
    
    setCheckedDates(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });

    setCheckedItems(prev => {
      const newSet = new Set(prev);
      dateItems.forEach(itemKey => {
        if (isChecked) {
          newSet.delete(itemKey);
        } else {
          newSet.add(itemKey);
        }
      });
      return newSet;
    });
  };

  const toggleAllDates = () => {
    const allDatesChecked = checkedDates.size === filteredTableData.length;
    
    // Отмечаем, что пользователь вручную изменил выделение
    userModifiedSelectionRef.current = true;
    
    if (allDatesChecked) {
      // Uncheck all
      setCheckedDates(new Set());
      setCheckedItems(new Set());
    } else {
      // Check all visible items after filtering
      const allDateKeys = new Set<string>();
      const allItemKeys = new Set<string>();
      
      filteredTableData.forEach(row => {
        allDateKeys.add(row.id);
        row.items.forEach(item => {
          allItemKeys.add(item.key);
        });
      });
      
      setCheckedDates(allDateKeys);
      setCheckedItems(allItemKeys);
    }
  };

  const handleStartEditing = () => {
    if (currentReport) {
      setEditedName(currentReport.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (!currentProjectId || !currentReport || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    if (editedName.trim() !== currentReport.name) {
      try {
        await dispatch(updateReportThunk({
          projectId: currentProjectId,
          reportId: currentReport.id,
          updates: { name: editedName.trim() },
        })).unwrap();

        toast({
          title: "Success",
          description: "Report name updated",
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Failed to update report name",
          description: error?.message || "Unexpected error",
        });
      }
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  // Мгновенное переключение метрики + отложенное сохранение
  const handleToggleMetric = (metricId: string) => {
    if (!currentReport) return;

    const newMetrics = currentReport.selectedMetrics.includes(metricId)
      ? currentReport.selectedMetrics.filter(id => id !== metricId)
      : [...currentReport.selectedMetrics, metricId];

    queueUpdate({ selectedMetrics: newMetrics });
  };

  // ФИКС глюка табов: мгновенное локальное переключение + отложенное сохранение
  const handleTabChange = (tab: TabType) => {
    if (!currentReport || tab === localActiveTab) return;
    
    // 1. Мгновенно обновляем локальный state (без моргания)
    setLocalActiveTab(tab);
    
    // 2. Отложенное сохранение в Redux + сервер
    queueUpdate({ activeTab: tab });
  };

  const handleBreakdownsChange = (breakdowns: BreakdownType[]) => {
    if (!currentProjectId || !currentReport) return;

    dispatch(updateBreakdowns({
      projectId: currentProjectId,
      reportId: currentReport.id,
      breakdowns,
    }));
  };

  const handleBackToSelection = () => {
    navigate('/selection');
  };

  // Function to get parent of element
  const getParentInfo = (itemId: string) => {
    const hierarchy = hierarchyData[itemId];
    if (!hierarchy) return null;

    let parentLabel = '';
    let parentValue = '';
    let parentId = '';

    if (parentDisplay === 'account' && hierarchy.account) {
      parentLabel = 'Account';
      parentId = hierarchy.account;
      // Ищем имя аккаунта в сторе accounts, если нет — fallback на hierarchy.accountName
      const accountFromStore = accounts.find(acc => acc.adAccountId === hierarchy.account || acc.id === hierarchy.account);
      const name = accountFromStore?.name || hierarchy.accountName;
      parentValue = name && name !== parentId ? `${name} (${parentId})` : parentId;
    } else if (parentDisplay === 'campaign' && hierarchy.campaign) {
      parentLabel = 'Campaign';
      parentId = hierarchy.campaign;
      const name = hierarchy.campaignName;
      parentValue = name && name !== parentId ? `${name} (${parentId})` : parentId;
    } else if (parentDisplay === 'adset' && hierarchy.adset) {
      parentLabel = 'Ad Set';
      parentId = hierarchy.adset;
      const name = hierarchy.adsetName;
      parentValue = name && name !== parentId ? `${name} (${parentId})` : parentId;
    } else if (parentDisplay === 'ad' && hierarchy.ad) {
      parentLabel = 'Ad';
      parentId = hierarchy.ad;
      const name = hierarchy.adName;
      parentValue = name && name !== parentId ? `${name} (${parentId})` : parentId;
    }

    return parentValue ? { label: parentLabel, value: parentValue } : null;
  };

  // Get parent column label
  const getParentColumnLabel = () => {
    const labels: Record<string, string> = {
      'account': 'Account',
      'campaign': 'Campaign',
      'adset': 'Ad Set',
      'ad': 'Ad',
    };
    return labels[parentDisplay] || 'Parent';
  };

  // Color scheme for different parents (for visual differentiation)
  const getParentBadgeColor = (parentValue: string) => {
    const colors: Record<string, string> = {
      'Nike Russia': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Adidas Sport': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Puma Active': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Reebok Fit': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'Campaign Alpha': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'Campaign Beta': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'Campaign Gamma': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'Campaign Delta': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      'Campaign Epsilon': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    };
    return colors[parentValue] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  if (!currentProjectId || !currentProject) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-display-lg text-foreground">Analytics</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-body text-muted-foreground mb-4">
              No project selected. Please select a project first.
            </p>
            <Button onClick={() => navigate('/projects')} data-testid="button-back-to-projects">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentReport) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="border-b border-border">
          <div className="px-6 py-4 flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleBackToSelection}
              data-testid="button-back"
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-display-lg text-foreground">Analytics</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-body text-muted-foreground mb-4">
              No report available. Please create a report first.
            </p>
            <Button onClick={() => navigate('/selection')} data-testid="button-create-report">
              Go to Selection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Function to filter dates by period
  const filterDatesByPeriod = (period: DateRange | undefined, dates: string[]) => {
    if (!period?.from) return dates;
    
    // Normalize times to start of day in local timezone
    const fromDate = new Date(period.from);
    fromDate.setHours(0, 0, 0, 0);
    const fromTime = fromDate.getTime();
    
    const toDate = period.to ? new Date(period.to) : new Date(period.from);
    toDate.setHours(23, 59, 59, 999); // End of day
    const toTime = toDate.getTime();
    
    return dates.filter(dateStr => {
      // Parse DD.MM.YYYY format (Russian locale from mockMetricsData)
      const [day, month, year] = dateStr.split('.').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0); // Start of day in local timezone
      const dateTime = date.getTime();
      return dateTime >= fromTime && dateTime <= toTime;
    });
  };

  const selectedMetrics = currentReport?.selectedMetrics || [];
  const selectedIds = useMemo(() => {
    if (!currentReport) {
      return [];
    }
    const ids = currentReport.selections?.[activeTab] ?? [];
    return [...ids];
  }, [activeTab, currentReport]);
  const selectedIdsKey = selectedIds.join('|');
  const periodAKey = buildDateRangeKey(periodA);
  const periodBKey = buildDateRangeKey(periodB);
  const checkedItemsKey = useMemo(() => Array.from(checkedItems).sort().join('|'), [checkedItems]);

  // Используем предвычисленные tableRows из кэша — мгновенное переключение табов!
  const baseTableData = useMemo(() => {
    // Получаем предвычисленные строки из кэша
    const cachedRows = currentTabData?.tableRows;
    
    if (!cachedRows || cachedRows.length === 0 || !periodA) {
      return [];
    }

    // Фильтруем только по периоду (items уже готовы в кэше)
    const filteredRows = cachedRows.filter(row => {
      const [day, month, year] = row.date.split('.').map(Number);
      const rowDate = new Date(year, month - 1, day);
      rowDate.setHours(0, 0, 0, 0);
      
      const fromDate = new Date(periodA.from!);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = periodA.to ? new Date(periodA.to) : fromDate;
      toDate.setHours(23, 59, 59, 999);
      
      return rowDate >= fromDate && rowDate <= toDate;
    });

    logger.log('[AnalyticsPage] baseTableData from cache:', {
      cachedRowsCount: cachedRows.length,
      filteredRowsCount: filteredRows.length,
      activeTab,
    });

    return filteredRows;
  }, [currentTabData?.tableRows, periodAKey, activeTab]);

  const tableData = useMemo(() => {
    if (baseTableData.length === 0) {
      return [];
    }

    return baseTableData.map((row) => ({
      ...row,
      metrics: aggregateMetricsForItems(row.items, checkedItems, true),
    }));
  }, [baseTableData, checkedItems, checkedItemsKey]);

  // Initialize column order when selectedMetrics change
  useEffect(() => {
    setColumnOrder(selectedMetrics);
  }, [selectedMetrics.join(',')]);

  // Reset selection initialization flag when report or tab changes
  useEffect(() => {
    if (currentReportId !== lastReportIdRef.current || activeTab !== lastTabRef.current) {
      hasInitializedSelectionRef.current = false;
      userModifiedSelectionRef.current = false;
      lastReportIdRef.current = currentReportId;
      lastTabRef.current = activeTab;
    }
  }, [currentReportId, activeTab]);

  // Automatically select all rows and items ONLY on initial data load
  // After user manually modifies selection, stop auto-selecting
  useEffect(() => {
    if (baseTableData.length === 0) {
      setCheckedDates(new Set());
      setCheckedItems(new Set());
      hasInitializedSelectionRef.current = false;
      return;
    }

    // Skip auto-selection if user has manually modified selection
    if (userModifiedSelectionRef.current) {
      return;
    }

    // Skip auto-selection if already initialized for this report/tab
    if (hasInitializedSelectionRef.current) {
      return;
    }

    const allDates = new Set(baseTableData.map(row => row.id));
    const allItemKeys = new Set<string>();

    baseTableData.forEach(row => {
      row.items.forEach(item => {
        allItemKeys.add(item.key);
      });
    });

    setCheckedDates(allDates);
    setCheckedItems(allItemKeys);
    hasInitializedSelectionRef.current = true;
  }, [baseTableData]);

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

  // Use columnOrder for rendering, fallback to selectedMetrics if order not initialized
  const orderedMetrics = columnOrder.length > 0 ? columnOrder : selectedMetrics;

  // Filter out metrics that don't exist in available data (prevents showing empty columns)
  const filteredOrderedMetrics = useMemo(() => {
    if (availableMetricIds.length === 0) return orderedMetrics; // Don't filter if data not loaded
    return filterResolvableMetrics(orderedMetrics, availableMetricIds);
  }, [orderedMetrics, availableMetricIds]);

  // Resolve generic metrics (like 'conversions') to actual available metrics (like 'conversions_purchase')
  // Now uses metricsData to pick the variant with the most occurrences
  const resolvedOrderedMetrics = useMemo(() => {
    return resolveMetrics(filteredOrderedMetrics, availableMetricIds, metricsData);
  }, [filteredOrderedMetrics, availableMetricIds, metricsData]);

  // Mapping from original metric ID to resolved metric ID for quick lookup
  const metricResolutionMap = useMemo(() => {
    const map: Record<string, string> = {};
    filteredOrderedMetrics.forEach((originalId, index) => {
      map[originalId] = resolvedOrderedMetrics[index];
    });
    return map;
  }, [filteredOrderedMetrics, resolvedOrderedMetrics]);

  // Create data for period B (if comparison enabled)
  const tableDataForPeriodB = useMemo(() => {
    if (!currentReport || !compareEnabled || !periodB || selectedIds.length === 0) {
      return undefined;
    }

    const allDates = Object.keys(metricsData);
    const filteredDates = filterDatesByPeriod(periodB, allDates);

    if (filteredDates.length === 0) {
      return [];
    }

    return filteredDates.map((date) => {
      const items = buildItemsForDate(date, activeTab, selectedIds, metricsData, itemsMetadata);
      return {
        id: date,
        date,
        items,
        metrics: aggregateMetricsForItems(items),
      };
    });
  }, [activeTab, compareEnabled, currentReport?.id, periodBKey, selectedIdsKey, metricsData, itemsMetadata]);

  // Use useAnalyticsDataView hook for centralized filtering and data aggregation
  // For table always show all data
  const tableDataView = useAnalyticsDataView({
    tableData,
    columnConditions,
    columnSorts,
    checkedItems,
    checkedDates,
    parentFilter,
    parentDisplay,
    globalSearch,
    getParentInfo,
    selectedMetrics,
    filterMode: 'all',
  });

  // For charts and cards use mode based on toggle
  const chartsDataView = useAnalyticsDataView({
    tableData,
    columnConditions,
    columnSorts,
    checkedItems,
    checkedDates,
    parentFilter,
    parentDisplay,
    globalSearch,
    getParentInfo,
    selectedMetrics,
    filterMode: useTableSelection ? 'selection' : 'all',
    previousPeriodData: tableDataForPeriodB,
  });

  // Extract filtered data for table
  const filteredTableData = useMemo(() => {
    // Additional filtering: remove rows without items
    return tableDataView.filteredTableData.filter(dateRow => {
      const hasItems = dateRow.items.length > 0;
      if (!hasItems) {
        logger.log('⚠️ Row filtered out:', { date: dateRow.date, itemsLength: dateRow.items.length });
      }
      return hasItems;
    });
  }, [tableDataView.filteredTableData]);
  
  const totalRows = filteredTableData.length;
  const totalPages = totalRows === 0 ? 1 : Math.ceil(totalRows / rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTableData = useMemo(() => {
    if (totalRows === 0) {
      return [];
    }
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredTableData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredTableData, currentPage, rowsPerPage, totalRows]);

  const pageStart = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = totalRows === 0 ? 0 : Math.min(totalRows, currentPage * rowsPerPage);
  
  logger.log('🔢 Data views:', { 
    tableRows: filteredTableData.length, 
    checkedItemsSize: checkedItems.size,
    checkedDatesSize: checkedDates.size,
    useTableSelection,
    chartsVisibleItems: chartsDataView.visibleItems.length,
  });

  // Calculate status for date - "Active" if at least one child item is active (case-insensitive)
  const getDateStatus = (items: any[]) => {
    return items.some(item => isActiveStatus(item.status)) ? 'Active' : 'Paused';
  };

  // Calculate metric change for item between two periods
  const calculateItemMetricChange = (itemId: string, metricId: string) => {
    if (!periodA || !compareEnabled || !periodB) {
      return null;
    }

    const allDates = Object.keys(metricsData);
    const currentDates = filterDatesByPeriod(periodA, allDates);
    const previousDates = filterDatesByPeriod(periodB, allDates);

    const calculateTotal = (dates: string[]) => {
      let total = 0;
      dates.forEach(date => {
        const dateData = metricsData[date];
        if (dateData[itemId]?.[metricId] !== undefined) {
          total += dateData[itemId][metricId];
        }
      });
      return total;
    };

    const current = calculateTotal(currentDates);
    const previous = calculateTotal(previousDates);
    
    const percentChange = previous === 0 
      ? (current > 0 ? 100 : 0)
      : ((current - previous) / previous) * 100;

    return { current, previous, percentChange };
  };

  // Calculate metric change for date row (aggregated data) between two periods
  const calculateDateMetricChange = (date: string, metricId: string, items: any[]) => {
    if (!periodA || !compareEnabled || !periodB) {
      return null;
    }

    const allDates = Object.keys(metricsData);
    const currentDates = filterDatesByPeriod(periodA, allDates);
    const previousDates = filterDatesByPeriod(periodB, allDates);

    // Find index of current date in period A
    const dateIndexA = currentDates.indexOf(date);
    if (dateIndexA === -1) return null;

    // Get corresponding date from period B
    const correspondingDateB = previousDates[dateIndexA];
    if (!correspondingDateB) return null;

    // Calculate current value (aggregation across all items for this date)
    const dateDataCurrent = metricsData[date];
    let current = 0;
    items.forEach(item => {
      if (dateDataCurrent[item.id]?.[metricId] !== undefined) {
        current += dateDataCurrent[item.id][metricId];
      }
    });

    // Calculate previous value (aggregation across all items for corresponding date from period B)
    const dateDataPrevious = metricsData[correspondingDateB];
    let previous = 0;
    items.forEach(item => {
      if (dateDataPrevious?.[item.id]?.[metricId] !== undefined) {
        previous += dateDataPrevious[item.id][metricId];
      }
    });

    const percentChange = previous === 0 
      ? (current > 0 ? 100 : 0)
      : ((current - previous) / previous) * 100;

    return { current, previous, percentChange };
  };

  // Calculate "Summary" row - aggregate only checked dates
  // Use smart aggregation: sum base metrics, calculate derived ones
  const getSummaryRow = () => {
    // Collect all metrics from checked rows
    const allMetricIds = new Set<string>();
    filteredTableData.forEach(row => {
      if (checkedDates.has(row.id)) {
        Object.keys(row.metrics).forEach(metricId => allMetricIds.add(metricId));
      }
    });
    
    // Collect dependencies for derived metrics
    const allNeededMetrics = new Set<string>();
    allMetricIds.forEach(metricId => {
      if (isDerivedMetric(metricId)) {
        getMetricDependencies(metricId).forEach(dep => allNeededMetrics.add(dep));
      } else {
        allNeededMetrics.add(metricId);
      }
    });
    
    // Sum ONLY base metrics from checked rows
    const baseMetrics: Record<string, number> = {};
    allNeededMetrics.forEach(metricId => {
      baseMetrics[metricId] = 0;
    });
    
    filteredTableData.forEach(row => {
      if (checkedDates.has(row.id)) {
        allNeededMetrics.forEach(metricId => {
          if (isSummableMetric(metricId) && row.metrics[metricId] !== undefined) {
            baseMetrics[metricId] = (baseMetrics[metricId] || 0) + row.metrics[metricId];
          }
        });
      }
    });
    
    // Calculate derived metrics
    const summaryMetrics: Record<string, number> = {};
    allMetricIds.forEach(metricId => {
      if (isDerivedMetric(metricId)) {
        const calculated = calculateDerivedMetric(metricId, baseMetrics);
        summaryMetrics[metricId] = calculated !== null ? calculated : 0;
      } else {
        summaryMetrics[metricId] = baseMetrics[metricId] || 0;
      }
    });
    
    return summaryMetrics;
  };

  const summaryRow = getSummaryRow();

  // Automatically check all items and dates when loading/changing data
  useEffect(() => {
    if (!currentReport) return;
    
    const allItemKeys = new Set<string>();
    const allDateKeys = new Set<string>();
    
    tableData.forEach(row => {
      allDateKeys.add(row.id);
      row.items.forEach(item => {
        allItemKeys.add(item.key);
      });
    });
    
    // Update only if list changed
    if (allItemKeys.size > 0) {
      setCheckedItems(allItemKeys);
      setCheckedDates(allDateKeys);
    }
  }, [currentReport?.id, currentReport?.activeTab, currentReport?.selections]);

  // Показываем Loading Overlay ВСЕГДА когда нет данных для отображения
  // Это включает: первичную загрузку, переключение табов, смену дат, любую ситуацию без данных
  useEffect(() => {
    // Не показываем лоадер, если ещё не выбран/не загружен отчёт
    if (!currentReport?.id) {
      setIsInitialSyncInProgress(false);
      return;
    }

    const hasNoData = Object.keys(metricsData).length === 0;
    const isGlobalLoading = isCacheLoading;
    const isCurrentTabLoading = loadingTabs.has(activeTab as TabType);
    const isAnyLoading = isGlobalLoading || isCurrentTabLoading;

    const reportStatus = currentReport?.status;
    const isReportGenerating = reportStatus === 'pending' || reportStatus === 'syncing' || reportStatus === 'extending';

    const syncJobStatus = syncStatusCurrent?.status;
    const isSyncJobActive = syncJobStatus === 'queued' || syncJobStatus === 'running';

    // Показываем overlay только когда реально идёт загрузка/синхронизация.
    // Если данных нет, но синхронизации нет — не держим бесконечный лоадер.
    const shouldShowOverlay =
      isAnyLoading ||
      (hasNoData && (isReportGenerating || isSyncJobActive));

    if (shouldShowOverlay) {
      logger.log('[AnalyticsPage] Showing loading overlay', {
        hasNoData,
        isGlobalLoading,
        isCurrentTabLoading,
        activeTab,
        reportStatus,
        syncJobStatus,
      });
    }

    setIsInitialSyncInProgress(shouldShowOverlay);
  }, [
    currentReport?.id,
    currentReport?.status,
    metricsData,
    isCacheLoading,
    loadingTabs,
    activeTab,
    syncStatusCurrent?.status,
  ]);

  return (
    <div className="flex flex-col h-full bg-background">
        {/* 3D Loading Overlay — показывается ВСЕГДА когда нет данных */}
        {/* НИКОГДА не показываем пустые карточки "No data available" */}
        <LoadingOverlay 
          isLoading={isInitialSyncInProgress} 
          message="Loading analytics data..." 
        />
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleBackToSelection}
                  data-testid="button-back"
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex flex-col min-w-0 max-w-[400px]">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="text-display-lg text-foreground bg-transparent border-b border-foreground outline-none w-full"
                      data-testid="input-report-name-edit"
                    />
                  ) : (
                    <div 
                      className="overflow-x-auto scrollbar-thin max-w-full"
                    >
                      <h1
                        onClick={handleStartEditing}
                        className="text-display-lg text-foreground cursor-pointer hover:opacity-80 whitespace-nowrap"
                        data-testid="text-report-name"
                      >
                        {currentReport.name}
                      </h1>
                    </div>
                  )}
                  <p className="text-body-sm text-muted-foreground" data-testid="text-created-date">
                    Created: {new Date(currentReport.createdAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })}
                    <span className="ml-2 text-muted-foreground/60 font-mono text-[10px]" title={`Report ID: ${currentReport.id}`}>
                      #{currentReport.code || currentReport.id.slice(0, 8)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 flex-1">
                <div className="flex items-center gap-1">
                  {parentDisplay !== 'none' && (
                    <ParentFilterPopover
                      currentFilter={parentFilter}
                      onApplyFilter={setParentFilter}
                    />
                  )}
                  <Select value={parentDisplay} onValueChange={(value: any) => setParentDisplay(value)}>
                    <SelectTrigger className="w-auto h-auto border-0 shadow-none hover:bg-accent/50 py-0.5 px-2 gap-1" data-testid="select-parent-display">
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] text-muted-foreground leading-tight">Parent:</span>
                        <span className="text-sm font-normal leading-tight whitespace-nowrap">{
                          parentDisplay === 'account' ? 'Account' : 
                          parentDisplay === 'campaign' ? 'Campaign' : 
                          parentDisplay === 'adset' ? 'Ad Set' : 
                          parentDisplay === 'ad' ? 'Ad' : 
                          'Don\'t show'
                        }</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border">
                      <SelectItem value="account" className="border-b border-border">Account</SelectItem>
                      {(activeTab === 'adsets' || activeTab === 'ads' || activeTab === 'creatives') && (
                        <SelectItem value="campaign" className="border-b border-border">Campaign</SelectItem>
                      )}
                      {(activeTab === 'ads' || activeTab === 'creatives') && (
                        <SelectItem value="adset" className="border-b border-border">Ad Set</SelectItem>
                      )}
                      {activeTab === 'creatives' && (
                        <SelectItem value="ad" className="border-b border-border">Ad</SelectItem>
                      )}
                      <SelectItem value="none">Don't show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={attribution} onValueChange={handleAttributionChange} disabled={isLoadingAttributions}>
                  <SelectTrigger className="w-auto h-auto border-0 shadow-none hover:bg-accent/50 py-0.5 px-2 gap-1" data-testid="select-attribution">
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] text-muted-foreground leading-tight">Attribution:</span>
                      <span className="text-sm font-normal leading-tight whitespace-nowrap">
                        {isLoadingAttributions ? 'Loading...' : 
                         availableAttributions.find(a => a.value === attribution)?.label || attribution}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border max-h-[400px]">
                    {availableAttributions.length > 0 ? (
                      <>
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Available Attribution Windows</div>
                        {availableAttributions.map((attr) => (
                          <SelectItem 
                            key={attr.value} 
                            value={attr.value}
                            className={attr.value === attribution ? 'bg-primary/10 text-primary font-medium' : ''}
                          >
                            <span className={attr.value === attribution ? 'text-primary' : ''}>
                              {attr.label} ({attr.count.toLocaleString()} records)
                            </span>
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Click + View (Recommended)</div>
                        <SelectItem 
                          value="7d_click_1d_view"
                          className={attribution === '7d_click_1d_view' ? 'bg-primary/10 text-primary font-medium' : ''}
                        >
                          <span className={attribution === '7d_click_1d_view' ? 'text-primary' : ''}>
                            7d click / 1d view (Default)
                          </span>
                        </SelectItem>
                        <SelectItem 
                          value="28d_click_1d_view"
                          className={attribution === '28d_click_1d_view' ? 'bg-primary/10 text-primary font-medium' : ''}
                        >
                          <span className={attribution === '28d_click_1d_view' ? 'text-primary' : ''}>
                            28d click / 1d view
                          </span>
                        </SelectItem>
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mt-2">Click Only</div>
                        <SelectItem 
                          value="1d_click"
                          className={attribution === '1d_click' ? 'bg-primary/10 text-primary font-medium' : ''}
                        >
                          <span className={attribution === '1d_click' ? 'text-primary' : ''}>1d click only</span>
                        </SelectItem>
                        <SelectItem 
                          value="7d_click"
                          className={attribution === '7d_click' ? 'bg-primary/10 text-primary font-medium' : ''}
                        >
                          <span className={attribution === '7d_click' ? 'text-primary' : ''}>7d click only</span>
                        </SelectItem>
                        <SelectItem 
                          value="28d_click"
                          className={attribution === '28d_click' ? 'bg-primary/10 text-primary font-medium' : ''}
                        >
                          <span className={attribution === '28d_click' ? 'text-primary' : ''}>28d click only</span>
                        </SelectItem>
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mt-2">View Only</div>
                        <SelectItem 
                          value="1d_view"
                          className={attribution === '1d_view' ? 'bg-primary/10 text-primary font-medium' : ''}
                        >
                          <span className={attribution === '1d_view' ? 'text-primary' : ''}>1d view only</span>
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {/* CRM Filters — показываем только если CRM подключён */}
                {crmConnected && (
                  <>
                    <Select 
                      value={crmPipelineId?.toString() || 'all'} 
                      onValueChange={(v) => setCrmPipelineId(v === 'all' ? null : Number(v))}
                    >
                      <SelectTrigger className="w-auto h-auto border-0 shadow-none hover:bg-accent/50 py-0.5 px-2 gap-1" data-testid="select-crm-pipeline">
                        <div className="flex flex-col items-start">
                          <span className="text-[11px] text-muted-foreground leading-tight">{crmName} Pipeline:</span>
                          <span className="text-sm font-normal leading-tight whitespace-nowrap">
                            {crmPipelineId 
                              ? crmPipelines.find(p => p.id === crmPipelineId)?.name || 'Pipeline'
                              : 'All Pipelines'}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border max-h-[300px]">
                        <SelectItem value="all">All Pipelines</SelectItem>
                        {crmPipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={crmUserId?.toString() || 'all'} 
                      onValueChange={(v) => setCrmUserId(v === 'all' ? null : Number(v))}
                    >
                      <SelectTrigger className="w-auto h-auto border-0 shadow-none hover:bg-accent/50 py-0.5 px-2 gap-1" data-testid="select-crm-user">
                        <div className="flex flex-col items-start">
                          <span className="text-[11px] text-muted-foreground leading-tight">Manager:</span>
                          <span className="text-sm font-normal leading-tight whitespace-nowrap">
                            {crmUserId 
                              ? crmUsers.find(u => u.id === crmUserId)?.name || 'Manager'
                              : 'All Managers'}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border max-h-[300px]">
                        <SelectItem value="all">All Managers</SelectItem>
                        {crmUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <DateRangePicker
                  periodA={periodA}
                  periodB={periodB}
                  compareEnabled={compareEnabled}
                  showColor={showColor}
                  alignment={alignment}
                  showOnlySelected={useTableSelection}
                  loadedDays={currentReport?.dataRange?.loadedDays}
                  isSyncing={isReportSyncing}
                  onExtendRange={handleExtendRange}
                  onChange={(data) => {
                    logger.log('[AnalyticsPage] DateRangePicker onChange:', {
                      periodA: data.periodA ? {
                        from: format(data.periodA.from!, 'yyyy-MM-dd'),
                        to: format(data.periodA.to!, 'yyyy-MM-dd'),
                      } : null,
                      periodB: data.periodB ? {
                        from: format(data.periodB.from!, 'yyyy-MM-dd'),
                        to: format(data.periodB.to!, 'yyyy-MM-dd'),
                      } : null,
                    });
                    
                    // ФИКС глюка дат: запоминаем локальное изменение ПЕРЕД обновлением state
                    if (data.periodA?.from && data.periodA?.to) {
                      localDateChangeRef.current = {
                        from: data.periodA.from.getTime(),
                        to: data.periodA.to.getTime(),
                      };
                    }
                    
                    setPeriodA(data.periodA);
                    setPeriodB(data.periodB);
                    setCompareEnabled(data.compareEnabled);
                    setShowColor(data.showColor);
                    setAlignment(data.alignment);
                    setUseTableSelection(data.showOnlySelected);
                    
                    // Сохраняем даты в report на сервере (debounced)
                    if (data.periodA?.from && data.periodA?.to) {
                      const dateFrom = format(data.periodA.from, "yyyy-MM-dd");
                      const dateTo = format(data.periodA.to, "yyyy-MM-dd");
                      logger.log('[AnalyticsPage] Queueing dates save:', { dateFrom, dateTo });
                      queueUpdate({ dateFrom, dateTo });
                    }
                  }}
                  className="w-auto min-w-[280px]"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="w-full">
            {/* TEMPORARILY HIDDEN: Breakdowns Panel 
            <BreakdownsPanel 
              selectedBreakdowns={currentReport?.breakdowns || []}
              onChange={handleBreakdownsChange}
            />
            */}
            <div className="p-6">
              <DashboardChartGrid 
                report={currentReport} 
                projectId={currentProjectId} 
                periodA={periodA} 
                periodB={compareEnabled ? periodB : undefined} 
                alignment={alignment}
                dataView={chartsDataView}
                crmMetrics={crmMetrics}
                crmName={crmName}
              />
              <DashboardMetricCardsSection 
                report={currentReport} 
                projectId={currentProjectId} 
                periodA={periodA} 
                periodB={compareEnabled ? periodB : undefined}
                dataView={chartsDataView}
                currencyCode={accountCurrency}
                crmMetrics={crmMetrics}
                crmName={crmName}
              />
            </div>

            <div className="flex border-b border-border w-full">
              <button
                onClick={() => handleTabChange('campaigns')}
                className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === 'campaigns'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-campaigns"
              >
                <Megaphone className="w-5 h-5" />
                <span className="font-medium">Campaigns</span>
              </button>
              <button
                onClick={() => handleTabChange('adsets')}
                className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === 'adsets'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-adsets"
              >
                <Layers className="w-5 h-5" />
                <span className="font-medium">Ad Sets</span>
              </button>
              <button
                onClick={() => handleTabChange('ads')}
                className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === 'ads'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-ads"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Ads</span>
              </button>
              <button
                onClick={() => handleTabChange('creatives')}
                className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === 'creatives'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-creatives"
              >
                <Image className="w-5 h-5" />
                <span className="font-medium">Creatives</span>
              </button>
            </div>
            
            <div>
                {/* Global Filter Summary Banner */}
                {Object.keys(columnConditions).length > 0 && (
                  <div className="bg-primary/5 border-l-4 border-primary px-6 py-3 mb-4" data-testid="filter-summary-banner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {Object.keys(columnConditions).length} active filter{Object.keys(columnConditions).length !== 1 ? 's' : ''}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(columnConditions).map(([columnId, condition]) => {
                              const allMetrics = metricCategories.flatMap(cat => {
                                if (cat.subcategories) {
                                  return cat.subcategories.flatMap(sub => sub.metrics);
                                }
                                return cat.metrics || [];
                              });
                              const metric = allMetrics.find(m => m.id === columnId);
                              const columnName = metric?.name || columnId.charAt(0).toUpperCase() + columnId.slice(1);
                              
                              return (
                                <Badge 
                                  key={columnId}
                                  variant="secondary"
                                  className="text-xs bg-primary/10 text-primary hover:bg-primary/20"
                                  data-testid={`filter-badge-${columnId}`}
                                >
                                  <span className="font-semibold">{columnName}</span>: {getFilterDescription(condition)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setColumnConditions({});
                          toast({
                            title: "Filters cleared",
                            description: "All filters have been removed",
                          });
                        }}
                        data-testid="button-clear-all-filters"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <table className="w-full" data-testid="table-metrics">
                        <thead className="bg-muted sticky top-0 z-20">
                          <tr>
                            <th className="px-4 py-3 text-left sticky left-0 bg-muted z-30 w-12" data-testid="table-header-checkbox">
                              <Checkbox
                                checked={checkedDates.size === filteredTableData.length && filteredTableData.length > 0}
                                onCheckedChange={toggleAllDates}
                                data-testid="checkbox-all-dates"
                              />
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted z-20" data-testid="table-header-date">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2">
                                  <span>Date</span>
                                  <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen} modal={false}>
                                    <PopoverTrigger asChild>
                                      <button 
                                        className={`p-0.5 hover:bg-muted-foreground/10 rounded ${(columnSorts['date'] || columnConditions['date']) ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`}
                                        data-testid="button-filter-date"
                                      >
                                        <Filter className="w-3 h-3" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-auto z-50" align="start" sideOffset={5}>
                                      <FilterMenu
                                        columnId="date"
                                        columnType="date"
                                        currentSort={columnSorts['date']}
                                        currentCondition={columnConditions['date']}
                                        onApplySort={(sort) => applyColumnSort('date', sort)}
                                        onApplyCondition={(condition) => applyColumnCondition('date', condition)}
                                        onClose={() => setDateFilterOpen(false)}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                {columnConditions['date'] && (
                                  <Badge 
                                    variant="secondary" 
                                    className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary hover:bg-primary/20 font-mono"
                                    data-testid="badge-filter-date"
                                  >
                                    {getFilterDescription(columnConditions['date'])}
                                  </Badge>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted z-20" data-testid="table-header-status">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2">
                                  <span>Status</span>
                                  <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
                                    <PopoverTrigger asChild>
                                      <button 
                                        className={`p-0.5 hover:bg-muted-foreground/10 rounded ${columnConditions['status'] ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`}
                                        data-testid="button-filter-status"
                                      >
                                        <Filter className="w-3 h-3" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-auto" align="start" sideOffset={5}>
                                      <FilterMenu
                                        columnId="status"
                                        columnType="status"
                                        currentSort={columnSorts['status']}
                                        currentCondition={columnConditions['status']}
                                        onApplySort={(sort) => applyColumnSort('status', sort)}
                                        onApplyCondition={(condition) => applyColumnCondition('status', condition)}
                                        onClose={() => setStatusFilterOpen(false)}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                {columnConditions['status'] && (
                                  <Badge 
                                    variant="secondary" 
                                    className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary hover:bg-primary/20 font-mono"
                                    data-testid="badge-filter-status"
                                  >
                                    {getFilterDescription(columnConditions['status'])}
                                  </Badge>
                                )}
                              </div>
                            </th>
                            <SortableContext
                              items={filteredOrderedMetrics}
                              strategy={horizontalListSortingStrategy}
                            >
                              {filteredOrderedMetrics.map((metricId) => {
                                // Get resolved metric ID (e.g., 'conversions' → 'conversions_purchase')
                                const resolvedMetricId = metricResolutionMap[metricId] || metricId;
                                
                                // Try to find metric name from categories, fallback to formatMetricName for dynamic metrics
                                const allMetrics = metricCategories.flatMap(cat => {
                                  if (cat.subcategories) {
                                    return cat.subcategories.flatMap(sub => sub.metrics);
                                  }
                                  return cat.metrics || [];
                                });
                                const metric = allMetrics.find(m => m.id === resolvedMetricId);
                                const metricName = metric?.name || formatMetricName(resolvedMetricId);
                                
                                return (
                                  <SortableMetricHeader
                                    key={metricId}
                                    metricId={metricId}
                                    metricName={metricName}
                                    currentSort={columnSorts[metricId]}
                                    currentCondition={columnConditions[metricId]}
                                    onApplySort={(sort) => applyColumnSort(metricId, sort)}
                                    onApplyCondition={(condition) => applyColumnCondition(metricId, condition)}
                                  />
                                );
                              })}
                            </SortableContext>
                          </tr>
                        </thead>
                      <tbody className="bg-background divide-y divide-border">
                        {paginatedTableData.map((row) => {
                          const isExpanded = expandedRows.has(row.id);
                          const dateStatus = getDateStatus(row.items);
                          const dateItemKeys = row.items.map(item => item.key);
                          
                          // Проверяем, есть ли статистика для этой даты
                          const hasDateStatistics = dateHasAnyMetricData(row.metrics);
                          
                          // Строка даты без статистики — показываем сообщение вместо метрик
                          const noStatsRow = !hasDateStatistics ? (
                            <tr key={row.id} data-testid={`table-row-${row.id}`} className="hover:bg-muted/50 opacity-60">
                              <td className="px-4 py-4 sticky left-0 bg-background hover:bg-muted/50 z-10">
                                <Checkbox
                                  checked={checkedDates.has(row.id)}
                                  onCheckedChange={() => toggleDateCheckbox(row.id, dateItemKeys)}
                                  data-testid={`checkbox-date-${row.id}`}
                                  disabled
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap bg-background hover:bg-muted/50" data-testid={`table-cell-date-${row.id}`}>
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4"></span>
                                  <span className="text-body font-medium text-muted-foreground">{row.date}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-body text-foreground">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-body-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                  Paused
                                </span>
                              </td>
                              <td colSpan={filteredOrderedMetrics.length} className="px-6 py-4 text-center text-muted-foreground italic">
                                No statistics available for this date
                              </td>
                            </tr>
                          ) : null;
                          
                          // Если нет статистики — показываем noStatsRow
                          if (!hasDateStatistics) {
                            return noStatsRow;
                          }
                          
                          const mainRow = (
                            <tr key={row.id} data-testid={`table-row-${row.id}`} className="hover:bg-muted/50">
                              <td className="px-4 py-4 sticky left-0 bg-background hover:bg-muted/50 z-10">
                                <Checkbox
                                  checked={checkedDates.has(row.id)}
                                  onCheckedChange={() => toggleDateCheckbox(row.id, dateItemKeys)}
                                  data-testid={`checkbox-date-${row.id}`}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap bg-background hover:bg-muted/50" data-testid={`table-cell-date-${row.id}`}>
                                <button
                                  onClick={() => toggleRowExpansion(row.id)}
                                  className="flex items-center gap-2 w-full text-left"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <span className="text-body font-medium text-foreground">{row.date}</span>
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-body text-foreground">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-body-sm font-medium ${
                                  dateStatus === 'Active' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                }`}>
                                  {dateStatus === 'Active' ? 'Active' : 'Paused'}
                                </span>
                              </td>
                              {filteredOrderedMetrics.map((metricId) => {
                                // Get resolved metric ID for data access
                                const resolvedMetricId = metricResolutionMap[metricId] || metricId;
                                const change = calculateDateMetricChange(row.date, resolvedMetricId, row.items);
                                const trendColorClass = change ? getMetricChangeColorClass(resolvedMetricId, change.percentChange) : '';
                                
                                // Для CRM метрик агрегируем по дате из хука
                                let metricValue: number | undefined;
                                if (isCrmMetric(resolvedMetricId)) {
                                  const dateMetrics = getMetricsForDate(row.date);
                                  metricValue = dateMetrics[resolvedMetricId as keyof typeof dateMetrics];
                                } else {
                                  metricValue = row.metrics[resolvedMetricId];
                                }
                                
                                return (
                                  <td
                                    key={metricId}
                                    className="px-6 py-4 whitespace-nowrap text-body text-foreground text-center"
                                    data-testid={`table-cell-${row.id}-${metricId}`}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <div>
                                        {metricValue !== undefined
                                          ? formatMetricValue(metricValue, resolvedMetricId, accountCurrency)
                                          : '-'}
                                      </div>
                                      {change && !isCrmMetric(resolvedMetricId) && (
                                        <div className="flex items-center gap-1">
                                          {change.percentChange === 0 ? (
                                            <Minus className="w-3 h-3 text-muted-foreground" />
                                          ) : change.percentChange > 0 ? (
                                            <TrendingUp className={`w-3 h-3 ${trendColorClass}`} />
                                          ) : (
                                            <TrendingDown className={`w-3 h-3 ${trendColorClass}`} />
                                          )}
                                          <span className={`text-xs font-medium ${trendColorClass}`}>
                                            {Math.abs(change.percentChange).toFixed(1)}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                          
                          // Header for child rows (appears when date is expanded)
                          const childHeader = null;
                          
                          // Фильтруем items — показываем только те, у которых impressions > 0
                          const itemsWithData = row.items.filter(hasImpressions);
                          
                          // Child rows (items within date) — только с показами
                          const subRows = isExpanded ? (
                            itemsWithData.length === 0 ? [
                              // Placeholder если все items без показов
                              <tr key={`${row.id}-no-data`} className="bg-muted/30">
                                <td className="px-4 py-3"></td>
                                <td colSpan={filteredOrderedMetrics.length + 2} className="px-6 py-4 text-center text-muted-foreground italic">
                                  No items with impressions for this date
                                </td>
                              </tr>
                            ] : itemsWithData.map((item, itemIndex) => {
                            const parentInfo = getParentInfo(item.id);
                            const isLastItem = itemIndex === itemsWithData.length - 1;
                            
                            return (
                              <tr key={item.key} className="hover:bg-muted/50 relative" data-testid={`table-subrow-${row.id}-${item.id}`}>
                                <td className="px-4 py-3 sticky left-0 bg-background hover:bg-muted/50 z-10">
                                  <Checkbox
                                    checked={checkedItems.has(item.key)}
                                    onCheckedChange={() => toggleCheckbox(item.key)}
                                    data-testid={`checkbox-${item.key}`}
                                  />
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap bg-background hover:bg-muted/50 relative">
                                  <div className="pl-8 flex items-center gap-3 relative">
                                    {/* Vertical line and horizontal branch */}
                                    <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center">
                                      {/* Vertical line */}
                                      {!isLastItem && (
                                        <div className="absolute left-4 top-0 bottom-0 w-px bg-border"></div>
                                      )}
                                      {/* Vertical line for last item (only to middle) */}
                                      {isLastItem && (
                                        <div className="absolute left-4 top-0 h-1/2 w-px bg-border"></div>
                                      )}
                                      {/* Horizontal branch */}
                                      <div className="absolute left-4 top-1/2 w-4 h-px bg-border"></div>
                                    </div>
                                    {activeTab === 'creatives' && (
                                      item.thumbnail ? (
                                        <div 
                                          className="relative w-12 h-12 flex-shrink-0 group cursor-pointer"
                                          onClick={() => setZoomedThumbnail({ url: item.thumbnail!, name: item.name })}
                                        >
                                          <img 
                                            src={item.thumbnail} 
                                            alt={item.name}
                                            className="w-12 h-12 object-cover rounded border border-border"
                                            data-testid={`thumbnail-${item.key}`}
                                          />
                                          {/* Zoom overlay on hover */}
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                            <ZoomIn className="w-5 h-5 text-white" />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="w-12 h-12 bg-muted rounded border border-border flex items-center justify-center flex-shrink-0">
                                          <Image className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                      )
                                    )}
                                    <div>
                                      {parentDisplay !== 'none' && parentInfo && (
                                        <div className="mb-1">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-body-sm font-medium ${getParentBadgeColor(parentInfo.value)}`}>
                                            {parentInfo.value}
                                          </span>
                                        </div>
                                      )}
                                      <div className="text-body text-foreground">{item.name}</div>
                                      <div className="text-body-sm text-muted-foreground">ID: {item.subtitle}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-body text-foreground">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-body-sm font-medium ${
                                    isActiveStatus(item.status)
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                {filteredOrderedMetrics.map((metricId) => {
                                  // Get resolved metric ID for data access
                                  const resolvedMetricId = metricResolutionMap[metricId] || metricId;
                                  const change = calculateItemMetricChange(item.id, resolvedMetricId);
                                  const trendColorClass = change ? getMetricChangeColorClass(resolvedMetricId, change.percentChange) : '';
                                  
                                  // Для CRM метрик получаем значения из хука
                                  let metricValue: number | undefined;
                                  if (isCrmMetric(resolvedMetricId)) {
                                    const crmData = activeTab === 'campaigns' 
                                      ? getMetricsForCampaign(item.id)
                                      : activeTab === 'adsets' 
                                        ? getMetricsForAdset(item.id) 
                                        : getMetricsForAd(item.id);
                                    metricValue = getCrmMetricValue(crmData, resolvedMetricId);
                                  } else {
                                    metricValue = item.metrics[resolvedMetricId];
                                  }
                                  
                                  return (
                                    <td
                                      key={metricId}
                                      className="px-6 py-3 whitespace-nowrap text-body text-foreground text-center"
                                      data-testid={`table-subcell-${row.id}-${item.id}-${metricId}`}
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        <div>
                                          {metricValue !== undefined
                                            ? formatMetricValue(metricValue, resolvedMetricId, accountCurrency)
                                            : '-'}
                                        </div>
                                        {change && !isCrmMetric(resolvedMetricId) && (
                                          <div className="flex items-center gap-1">
                                            {change.percentChange === 0 ? (
                                              <Minus className="w-3 h-3 text-muted-foreground" />
                                            ) : change.percentChange > 0 ? (
                                              <TrendingUp className={`w-3 h-3 ${trendColorClass}`} />
                                            ) : (
                                              <TrendingDown className={`w-3 h-3 ${trendColorClass}`} />
                                            )}
                                            <span className={`text-xs font-medium ${trendColorClass}`}>
                                              {Math.abs(change.percentChange).toFixed(1)}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })) : [];
                          
                          return childHeader ? [mainRow, childHeader, ...subRows] : [mainRow, ...subRows];
                        })}
                        {filteredTableData.length > 0 && checkedDates.size > 0 && (
                          <tr className="bg-primary/5 border-t-2 border-primary font-bold" data-testid="table-row-summary">
                            <td className="px-4 py-4 sticky left-0 bg-primary/5 z-10">
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap bg-primary/5" data-testid="table-cell-summary-label">
                              <span className="text-body font-bold text-foreground">Total</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-body text-foreground"></td>
                            {filteredOrderedMetrics.map((metricId) => {
                              // Get resolved metric ID for data access
                              const resolvedMetricId = metricResolutionMap[metricId] || metricId;
                              
                              // Для CRM метрик берём totals из crmMetrics
                              let metricValue: number | undefined;
                              if (isCrmMetric(resolvedMetricId) && crmMetrics?.totals) {
                                metricValue = crmMetrics.totals[resolvedMetricId as keyof typeof crmMetrics.totals];
                              } else {
                                metricValue = summaryRow[resolvedMetricId];
                              }
                              
                              return (
                                <td
                                  key={metricId}
                                  className="px-6 py-4 whitespace-nowrap text-body font-bold text-foreground text-center"
                                  data-testid={`table-cell-summary-${metricId}`}
                                >
                                  {metricValue !== undefined
                                    ? formatMetricValue(metricValue, resolvedMetricId, accountCurrency)
                                    : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        )}
                        {filteredTableData.length === 0 && (
                          <tr data-testid="table-row-empty">
                            <td colSpan={filteredOrderedMetrics.length + 3} className="px-6 py-12 text-center" data-testid="empty-state">
                              <div className="flex flex-col items-center gap-4">
                                <BarChart3 className="w-12 h-12 text-muted-foreground" />
                                {tableData.length > 0 ? (
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-muted-foreground mb-2 font-medium">No data matching applied filters</p>
                                      <p className="text-sm text-muted-foreground">Try changing filter conditions or reset filters</p>
                                    </div>
                                    {Object.keys(columnConditions).length > 0 && (
                                      <div className="inline-block bg-muted px-4 py-2 rounded-lg">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Active filters:</p>
                                        <div className="space-y-1">
                                          {Object.entries(columnConditions).map(([colId, condition]) => {
                                            if (condition.type === 'numeric') {
                                              const operatorText = {
                                                'greater': 'greater than',
                                                'less': 'less than',
                                                'equal': 'equals',
                                                'not-equal': 'not equals',
                                                'between': 'between'
                                              }[condition.operator];
                                              return (
                                                <p key={colId} className="text-xs text-foreground">
                                                  <span className="font-semibold">{colId}</span>: {operatorText} {condition.value}
                                                  {condition.operator === 'between' && ` - ${condition.valueTo}`}
                                                </p>
                                              );
                                            }
                                            return null;
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">No {activeTab} selected in this report</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {filteredTableData.length > 0 && (
                      <div className="flex flex-col gap-3 px-6 py-4 border-t border-border sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {pageStart}-{pageEnd} of {totalRows} days
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-2 text-sm">
                            <span>Rows per page</span>
                            <Select
                              value={String(rowsPerPage)}
                              onValueChange={(value) => {
                                setRowsPerPage(Number(value));
                                setCurrentPage(1);
                              }}
                            >
                              <SelectTrigger className="w-[90px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent align="end">
                                {[15, 30, 50, 100].map(option => (
                                  <SelectItem key={option} value={String(option)}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {currentPage} of {totalPages}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage >= totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    </DndContext>
                  </div>
                </div>
            </div>
          </div>
        </div>

      {/* Thumbnail Zoom Dialog */}
      <Dialog open={!!zoomedThumbnail} onOpenChange={(open) => !open && setZoomedThumbnail(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-0">
          {zoomedThumbnail && (
            <div className="relative">
              {/* Close button */}
              <button
                onClick={() => setZoomedThumbnail(null)}
                className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              {/* Image */}
              <img
                src={zoomedThumbnail.url}
                alt={zoomedThumbnail.name}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm font-medium truncate">{zoomedThumbnail.name}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
