/**
 * CompareBarWidget — Главный виджет Workspace 3: Compare
 * 
 * Grouped/Stacked/Normalized Bar Chart для сравнения N×M
 * 
 * ECharts компонент:
 * - Bar Stack Normalization: https://echarts.apache.org/examples/en/editor.html?c=bar-stack-normalization-and-variation
 * 
 * Режимы:
 * - Multi-compare: N entities × M metrics
 * - Single + Breakdown: 1 entity × breakdown attribute × M metrics
 * - Aggregate + Breakdown: All entities × breakdown attribute × M metrics
 * 
 * Display modes:
 * - Grouped: метрики рядом
 * - Stacked: метрики друг на друге
 * - Normalized %: каждая entity = 100%
 */

import { memo, useState, useMemo } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetRequest } from '@/hooks/useWidgetCache';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { 
  BarChart3, 
  Layers, 
  Percent,
  Settings2,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/formatters';

// Типы
type DisplayMode = 'grouped' | 'stacked' | 'normalized';
type CompareMode = 'multi-compare' | 'single-breakdown' | 'aggregate-breakdown';
type EntityType = 'campaigns' | 'adsets' | 'ads' | 'creatives';

interface CompareEntity {
  id: string;
  name: string;
  metrics: Record<string, number>;
}

// Breakdown атрибуты
const BREAKDOWN_ATTRIBUTES = [
  { value: 'placement', label: 'By Placement' },
  { value: 'objective', label: 'By Objective' },
  { value: 'optimization_goal', label: 'By Optimization Goal' },
  { value: 'budget_type', label: 'By Budget Type' },
  { value: 'bid_strategy', label: 'By Bid Strategy' },
  { value: 'destination_type', label: 'By Destination Type' },
];

// Доступные метрики
const AVAILABLE_METRICS = [
  { id: 'spend', label: 'Spend', color: '#3b82f6' },
  { id: 'impressions', label: 'Impressions', color: '#8b5cf6' },
  { id: 'clicks', label: 'Clicks', color: '#ec4899' },
  { id: 'conversions', label: 'Results', color: '#10b981' },
  { id: 'ctr', label: 'CTR', color: '#f59e0b' },
  { id: 'cpc', label: 'CPC', color: '#6366f1' },
  { id: 'cpm', label: 'CPM', color: '#14b8a6' },
  { id: 'revenue', label: 'Revenue', color: '#22c55e' },
  { id: 'roas', label: 'ROAS', color: '#eab308' },
];

interface CompareBarWidgetProps {
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  accountIds: string[];
  attribution?: string;
  currencyCode?: string;
  
  // Предварительно выбранные сущности
  selectedEntityIds?: string[];
  entityType?: EntityType;
  
  // Callbacks
  onEntityClick?: (entityId: string) => void;
}

export const CompareBarWidget = memo(function CompareBarWidget({
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  accountIds,
  attribution = '7d_click_1d_view',
  currencyCode = 'USD',
  selectedEntityIds,
  entityType = 'campaigns',
  onEntityClick,
}: CompareBarWidgetProps) {
  // State
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grouped');
  const [compareMode, setCompareMode] = useState<CompareMode>('multi-compare');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['spend', 'conversions', 'revenue']);
  const [breakdownAttr, setBreakdownAttr] = useState('placement');
  const [sortBy, setSortBy] = useState('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const widgetId = `compare-bar-${reportId}-${dateFrom}-${dateTo}-${entityType}`;
  
  // Запрос данных
  const request: WidgetRequest = {
    widgetId,
    widgetType: 'comparison' as any,
    entityType: entityType.slice(0, -1) as any, // campaigns -> campaign
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
    metricIds: selectedMetrics,
    filters: {
      entityIds: selectedEntityIds,
      breakdown: compareMode !== 'multi-compare' ? breakdownAttr : undefined,
    } as any,
  };
  
  const { data, isLoading, error, refetch } = useWidgetCache(request, {
    enabled: Boolean(workspaceId && reportId && accountIds.length > 0),
  });
  
  // Обработка данных
  const chartData = useMemo(() => {
    if (!data?.rows) {
      // Mock data
      return [
        { name: 'Summer Sale', spend: 2500, conversions: 450, revenue: 8500 },
        { name: 'Retargeting', spend: 1800, conversions: 320, revenue: 6200 },
        { name: 'Lookalike', spend: 1200, conversions: 180, revenue: 3800 },
        { name: 'Brand Awareness', spend: 800, conversions: 95, revenue: 1900 },
        { name: 'Video Promo', spend: 600, conversions: 75, revenue: 1500 },
      ];
    }
    
    let rows = data.rows.map((row: any) => ({
      id: row.id,
      name: row.name || row.campaignName || 'Unknown',
      ...selectedMetrics.reduce((acc, metric) => ({
        ...acc,
        [metric]: row[metric] || 0,
      }), {}),
    }));
    
    // Сортировка
    rows.sort((a: any, b: any) => {
      const diff = (a[sortBy] || 0) - (b[sortBy] || 0);
      return sortOrder === 'desc' ? -diff : diff;
    });
    
    // Нормализация для normalized mode
    if (displayMode === 'normalized') {
      rows = rows.map((row: any) => {
        const total = selectedMetrics.reduce((sum, m) => sum + (row[m] || 0), 0);
        return {
          ...row,
          ...selectedMetrics.reduce((acc, metric) => ({
            ...acc,
            [metric]: total > 0 ? ((row[metric] || 0) / total) * 100 : 0,
          }), {}),
        };
      });
    }
    
    return rows;
  }, [data, selectedMetrics, sortBy, sortOrder, displayMode]);
  
  // Переключение метрики
  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId)
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    );
  };
  
  // Форматирование tooltip
  const formatTooltipValue = (value: number, metric: string): string => {
    if (displayMode === 'normalized') {
      return `${value.toFixed(1)}%`;
    }
    if (metric === 'spend' || metric === 'revenue' || metric === 'cpc' || metric === 'cpm') {
      return formatCurrency(value, currencyCode);
    }
    if (metric === 'ctr' || metric === 'roas') {
      return formatPercent(value);
    }
    return formatNumber(value);
  };
  
  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <Card className="p-3 shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {formatTooltipValue(entry.value, entry.dataKey)}
            </span>
          </div>
        ))}
      </Card>
    );
  };
  
  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={`Compare ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      headerAction={
        <div className="flex items-center gap-2">
          {/* Display Mode */}
          <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as DisplayMode)}>
            <TabsList className="h-7">
              <TabsTrigger value="grouped" className="h-6 px-2 text-xs gap-1" title="Grouped">
                <BarChart3 className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="stacked" className="h-6 px-2 text-xs gap-1" title="Stacked">
                <Layers className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="normalized" className="h-6 px-2 text-xs gap-1" title="Normalized %">
                <Percent className="w-3 h-3" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedMetrics.map(m => (
                <SelectItem key={m} value={m}>
                  {AVAILABLE_METRICS.find(am => am.id === m)?.label || m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Metrics Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Settings2 className="w-3 h-3" />
                Metrics
                <Badge variant="secondary" className="ml-1 h-4 px-1">
                  {selectedMetrics.length}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">Select Metrics</p>
                {AVAILABLE_METRICS.map(metric => (
                  <div key={metric.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`metric-${metric.id}`}
                      checked={selectedMetrics.includes(metric.id)}
                      onCheckedChange={() => toggleMetric(metric.id)}
                    />
                    <Label 
                      htmlFor={`metric-${metric.id}`}
                      className="text-sm flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: metric.color }}
                      />
                      {metric.label}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Chart */}
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              barGap={displayMode === 'grouped' ? 4 : 0}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => displayMode === 'normalized' ? `${v}%` : formatNumber(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-xs">
                    {AVAILABLE_METRICS.find(m => m.id === value)?.label || value}
                  </span>
                )}
              />
              
              {selectedMetrics.map((metric, index) => {
                const metricConfig = AVAILABLE_METRICS.find(m => m.id === metric);
                return (
                  <Bar
                    key={metric}
                    dataKey={metric}
                    name={metric}
                    fill={metricConfig?.color || '#8884d8'}
                    stackId={displayMode !== 'grouped' ? 'stack' : undefined}
                    radius={displayMode === 'grouped' ? [4, 4, 0, 0] : undefined}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* KPI Summary */}
        <div className="grid grid-cols-6 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold">{chartData.length}</div>
            <div className="text-xs text-muted-foreground">Entities</div>
          </div>
          {selectedMetrics.slice(0, 5).map(metric => {
            const total = chartData.reduce((sum: number, row: any) => sum + (row[metric] || 0), 0);
            const avg = total / (chartData.length || 1);
            return (
              <div key={metric} className="text-center">
                <div className="text-lg font-bold">
                  {formatTooltipValue(avg, metric)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg {AVAILABLE_METRICS.find(m => m.id === metric)?.label || metric}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetWrapper>
  );
});

export default CompareBarWidget;
