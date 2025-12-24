/**
 * ROMIByCreativeWidget — виджет ROMI by Creative
 * 
 * Отображает таблицу креативов с метриками:
 * - Затраты (Spend)
 * - Лиды (Leads)
 * - Квалифицированные лиды (Qualified Leads)
 * - Выручка (Revenue)
 * - ROMI (Return on Marketing Investment)
 * 
 * Требует интеграции с CRM для revenue/qualified leads
 */

import { memo, useState, useMemo } from 'react';
import { WidgetWrapper, type WidgetWrapperProps } from './WidgetWrapper';
import { useWidgetCache, type WidgetRequest } from '@/hooks/useWidgetCache';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Image,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/formatters';

// Типы для ROMI данных
interface ROMICreativeData {
  creativeId: string;
  creativeName: string;
  thumbnailUrl?: string;
  
  // FB метрики
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  leads: number;
  costPerLead: number;
  
  // CRM метрики
  qualifiedLeads: number;
  qualificationRate: number;
  revenue: number;
  avgDealSize: number;
  
  // Расчётные
  romi: number;
  roiClass: 'profitable' | 'break-even' | 'unprofitable';
}

type SortField = 'spend' | 'leads' | 'qualifiedLeads' | 'revenue' | 'romi' | 'ctr' | 'qualificationRate';
type SortOrder = 'asc' | 'desc';

interface ROMIByCreativeWidgetProps extends Omit<WidgetWrapperProps, 'widgetId' | 'title' | 'children'> {
  // Обязательные props
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  accountIds: string[];
  
  // Опциональные
  title?: string;
  attribution?: string;
  currencyCode?: string;
  pageSize?: number;
  showFilters?: boolean;
  onCreativeClick?: (creativeId: string) => void;
}

// Колонки таблицы
const COLUMNS = [
  { id: 'creative', label: 'Creative', sortable: false },
  { id: 'spend', label: 'Spend', sortable: true },
  { id: 'leads', label: 'Leads', sortable: true },
  { id: 'ctr', label: 'CTR', sortable: true },
  { id: 'qualifiedLeads', label: 'Qualified', sortable: true },
  { id: 'qualificationRate', label: 'Qual. Rate', sortable: true },
  { id: 'revenue', label: 'Revenue', sortable: true },
  { id: 'romi', label: 'ROMI', sortable: true },
];

// Рейтинг ROMI классов
const ROMI_BADGES: Record<string, { label: string; className: string }> = {
  profitable: { 
    label: 'Profitable', 
    className: 'bg-green-500/10 text-green-600 border-green-500/30' 
  },
  'break-even': { 
    label: 'Break-even', 
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' 
  },
  unprofitable: { 
    label: 'Unprofitable', 
    className: 'bg-red-500/10 text-red-600 border-red-500/30' 
  },
};

export const ROMIByCreativeWidget = memo(function ROMIByCreativeWidget({
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  accountIds,
  title = 'ROMI by Creative',
  attribution = '7d_click_1d_view',
  currencyCode = 'USD',
  pageSize = 10,
  showFilters = true,
  onCreativeClick,
  ...wrapperProps
}: ROMIByCreativeWidgetProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('romi');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [roiFilter, setRoiFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  
  // Widget ID
  const widgetId = `romi-creative-${reportId}-${dateFrom}-${dateTo}`;
  
  // Запрос данных
  const request: WidgetRequest = {
    widgetId,
    widgetType: 'romi-creative',
    entityType: 'creative',
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
    metricIds: ['spend', 'impressions', 'clicks', 'ctr', 'leads'],
    filters: {
      breakdown: 'creative',
      includeCRM: true,
    } as any,
  };
  
  const { data, isLoading, error, refetch } = useWidgetCache(request, {
    enabled: Boolean(workspaceId && reportId && accountIds.length > 0),
  });
  
  // Обработка данных
  const creatives = useMemo(() => {
    if (!data?.rows) return [];
    
    return data.rows.map((row: any): ROMICreativeData => {
      const spend = row.spend || 0;
      const leads = row.leads || 0;
      const qualifiedLeads = row.qualifiedLeads || 0;
      const revenue = row.revenue || 0;
      
      // Расчёт ROMI: (Revenue - Spend) / Spend * 100
      const romi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
      
      // Классификация
      let roiClass: 'profitable' | 'break-even' | 'unprofitable';
      if (romi > 10) roiClass = 'profitable';
      else if (romi >= -10) roiClass = 'break-even';
      else roiClass = 'unprofitable';
      
      return {
        creativeId: row.creativeId || row.id,
        creativeName: row.creativeName || row.name || 'Unknown',
        thumbnailUrl: row.thumbnailUrl || row.thumbnail,
        spend,
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0,
        leads,
        costPerLead: leads > 0 ? spend / leads : 0,
        qualifiedLeads,
        qualificationRate: leads > 0 ? (qualifiedLeads / leads) * 100 : 0,
        revenue,
        avgDealSize: qualifiedLeads > 0 ? revenue / qualifiedLeads : 0,
        romi,
        roiClass,
      };
    });
  }, [data]);
  
  // Фильтрация и сортировка
  const filteredCreatives = useMemo(() => {
    let result = [...creatives];
    
    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.creativeName.toLowerCase().includes(query) ||
        c.creativeId.toLowerCase().includes(query)
      );
    }
    
    // Фильтр по ROI классу
    if (roiFilter !== 'all') {
      result = result.filter(c => c.roiClass === roiFilter);
    }
    
    // Сортировка
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const diff = (aVal as number) - (bVal as number);
      return sortOrder === 'desc' ? -diff : diff;
    });
    
    return result;
  }, [creatives, searchQuery, roiFilter, sortField, sortOrder]);
  
  // Пагинация
  const totalPages = Math.ceil(filteredCreatives.length / pageSize);
  const paginatedCreatives = filteredCreatives.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  
  // Обработчик сортировки
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  // Иконка сортировки
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground/50" />;
    return sortOrder === 'desc' 
      ? <ArrowDown className="w-3 h-3 ml-1" />
      : <ArrowUp className="w-3 h-3 ml-1" />;
  };
  
  // Summary статистика
  const summary = useMemo(() => {
    if (!creatives.length) return null;
    
    const totalSpend = creatives.reduce((sum: number, c: ROMICreativeData) => sum + c.spend, 0);
    const totalRevenue = creatives.reduce((sum: number, c: ROMICreativeData) => sum + c.revenue, 0);
    const totalLeads = creatives.reduce((sum: number, c: ROMICreativeData) => sum + c.leads, 0);
    const totalQualified = creatives.reduce((sum: number, c: ROMICreativeData) => sum + c.qualifiedLeads, 0);
    const avgRomi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
    
    return { totalSpend, totalRevenue, totalLeads, totalQualified, avgRomi };
  }, [creatives]);
  
  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={title}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      headerAction={
        showFilters && (
          <div className="flex items-center gap-2">
            <Select value={roiFilter} onValueChange={setRoiFilter}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue placeholder="All ROMI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="profitable">Profitable</SelectItem>
                <SelectItem value="break-even">Break-even</SelectItem>
                <SelectItem value="unprofitable">Unprofitable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      }
      {...wrapperProps}
    >
      <div className="flex flex-col h-full">
        {/* Summary Bar */}
        {summary && (
          <div className="grid grid-cols-5 gap-4 p-3 bg-muted/30 rounded-lg mb-4">
            <div>
              <div className="text-xs text-muted-foreground">Total Spend</div>
              <div className="text-sm font-semibold">
                {formatCurrency(summary.totalSpend, currencyCode)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
              <div className="text-sm font-semibold text-green-600">
                {formatCurrency(summary.totalRevenue, currencyCode)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Leads</div>
              <div className="text-sm font-semibold">{formatNumber(summary.totalLeads)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Qualified</div>
              <div className="text-sm font-semibold">{formatNumber(summary.totalQualified)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg ROMI</div>
              <div className={cn(
                'text-sm font-semibold',
                summary.avgRomi > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {summary.avgRomi >= 0 ? '+' : ''}{summary.avgRomi.toFixed(1)}%
              </div>
            </div>
          </div>
        )}
        
        {/* Search */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search creatives..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        
        {/* Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                {COLUMNS.map(col => (
                  <TableHead 
                    key={col.id}
                    className={cn(
                      col.sortable && 'cursor-pointer hover:bg-muted/50 select-none',
                      col.id === 'creative' && 'w-[300px]'
                    )}
                    onClick={col.sortable ? () => handleSort(col.id as SortField) : undefined}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon field={col.id as SortField} />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCreatives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="text-center py-8 text-muted-foreground">
                    No creatives found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCreatives.map((creative) => (
                  <TableRow
                    key={creative.creativeId}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50',
                      onCreativeClick && 'cursor-pointer'
                    )}
                    onClick={() => onCreativeClick?.(creative.creativeId)}
                  >
                    {/* Creative */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {creative.thumbnailUrl ? (
                          <img 
                            src={creative.thumbnailUrl} 
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Image className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate max-w-[220px]">
                            {creative.creativeName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {creative.creativeId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Spend */}
                    <TableCell className="text-right">
                      {formatCurrency(creative.spend, currencyCode)}
                    </TableCell>
                    
                    {/* Leads */}
                    <TableCell className="text-right">
                      {formatNumber(creative.leads)}
                    </TableCell>
                    
                    {/* CTR */}
                    <TableCell className="text-right">
                      {formatPercent(creative.ctr)}
                    </TableCell>
                    
                    {/* Qualified Leads */}
                    <TableCell className="text-right">
                      {formatNumber(creative.qualifiedLeads)}
                    </TableCell>
                    
                    {/* Qualification Rate */}
                    <TableCell className="text-right">
                      <span className={cn(
                        creative.qualificationRate >= 30 ? 'text-green-600' :
                        creative.qualificationRate >= 15 ? 'text-yellow-600' :
                        'text-red-600'
                      )}>
                        {formatPercent(creative.qualificationRate)}
                      </span>
                    </TableCell>
                    
                    {/* Revenue */}
                    <TableCell className="text-right">
                      <span className="text-green-600">
                        {formatCurrency(creative.revenue, currencyCode)}
                      </span>
                    </TableCell>
                    
                    {/* ROMI */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {creative.romi > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : creative.romi < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={cn(
                          'font-medium',
                          creative.romi > 0 ? 'text-green-600' :
                          creative.romi < 0 ? 'text-red-600' :
                          'text-muted-foreground'
                        )}>
                          {creative.romi >= 0 ? '+' : ''}{creative.romi.toFixed(1)}%
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', ROMI_BADGES[creative.roiClass].className)}
                        >
                          {ROMI_BADGES[creative.roiClass].label}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredCreatives.length)} of {filteredCreatives.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
});

export default ROMIByCreativeWidget;
