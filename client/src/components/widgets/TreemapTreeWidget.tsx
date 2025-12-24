/**
 * TreemapTreeWidget — Главный виджет Workspace 2: Attribution
 * 
 * Attribution Paths — Treemap ↔ Tree Toggle
 * 
 * ECharts компоненты:
 * - Treemap: https://echarts.apache.org/examples/en/editor.html?c=treemap-drill-down
 * - Radial Tree: https://echarts.apache.org/examples/en/editor.html?c=tree-radial
 * - Vertical Tree: https://echarts.apache.org/examples/en/editor.html?c=tree-vertical
 * - Sankey (альт.): https://echarts.apache.org/examples/en/editor.html?c=sankey-energy
 * 
 * Показывает:
 * - Пути атрибуции до конверсии
 * - Площадь = количество конверсий
 * - Цвет = CPR (cost per result)
 */

import { memo, useState, useMemo } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetRequest } from '@/hooks/useWidgetCache';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  LayoutGrid, 
  GitBranch,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency } from '@/lib/formatters';

// Типы
interface AttributionPath {
  pathId: string;
  pathPattern: string;  // "Instagram → Facebook → Conv"
  touchpoints: string[];
  conversions: number;
  revenue: number;
  spend: number;
  cpr: number;
  percentOfTotal: number;
  avgTouches: number;
  avgDaysToConvert: number;
}

interface TreemapTreeWidgetProps {
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  accountIds: string[];
  attribution?: string;
  currencyCode?: string;
  onPathClick?: (path: AttributionPath) => void;
}

type ViewMode = 'treemap' | 'tree';
type GroupBy = 'campaign' | 'placement' | 'source';

// Цвета для CPR (от зелёного к красному)
const getCPRColor = (cpr: number, avgCpr: number): string => {
  const ratio = cpr / avgCpr;
  if (ratio < 0.7) return '#22c55e';  // green - очень хороший
  if (ratio < 0.9) return '#84cc16';  // lime - хороший
  if (ratio < 1.1) return '#eab308';  // yellow - средний
  if (ratio < 1.3) return '#f97316';  // orange - выше среднего
  return '#ef4444';                    // red - плохой
};

export const TreemapTreeWidget = memo(function TreemapTreeWidget({
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  accountIds,
  attribution = '7d_click_1d_view',
  currencyCode = 'USD',
  onPathClick,
}: TreemapTreeWidgetProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('treemap');
  const [groupBy, setGroupBy] = useState<GroupBy>('campaign');
  const [selectedPath, setSelectedPath] = useState<AttributionPath | null>(null);
  
  const widgetId = `treemap-tree-${reportId}-${dateFrom}-${dateTo}`;
  
  // Запрос данных
  const request: WidgetRequest = {
    widgetId,
    widgetType: 'attribution-paths' as any,
    entityType: 'creative',
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
    metricIds: ['conversions', 'spend', 'revenue'],
    filters: {
      groupBy,
      includeAttribution: true,
    } as any,
  };
  
  const { data, isLoading, error, refetch } = useWidgetCache(request, {
    enabled: Boolean(workspaceId && reportId && accountIds.length > 0),
  });
  
  // Обработка данных
  const pathsData = useMemo(() => {
    if (!data?.paths) {
      // Mock data для демонстрации
      return {
        paths: [
          {
            pathId: '1',
            pathPattern: 'Instagram → Facebook → Conversion',
            touchpoints: ['Instagram', 'Facebook'],
            conversions: 234,
            revenue: 12450,
            spend: 4329,
            cpr: 18.5,
            percentOfTotal: 38,
            avgTouches: 2.4,
            avgDaysToConvert: 3.2,
          },
          {
            pathId: '2',
            pathPattern: 'Facebook only (direct)',
            touchpoints: ['Facebook'],
            conversions: 156,
            revenue: 8320,
            spend: 3480,
            cpr: 22.3,
            percentOfTotal: 25,
            avgTouches: 1.0,
            avgDaysToConvert: 1.5,
          },
          {
            pathId: '3',
            pathPattern: 'Instagram only',
            touchpoints: ['Instagram'],
            conversions: 89,
            revenue: 4560,
            spend: 1353,
            cpr: 15.2,
            percentOfTotal: 14,
            avgTouches: 1.0,
            avgDaysToConvert: 2.1,
          },
          {
            pathId: '4',
            pathPattern: 'Search → Instagram → Conversion',
            touchpoints: ['Search', 'Instagram'],
            conversions: 67,
            revenue: 3890,
            spend: 2090,
            cpr: 31.2,
            percentOfTotal: 11,
            avgTouches: 2.1,
            avgDaysToConvert: 5.4,
          },
          {
            pathId: '5',
            pathPattern: 'Instagram → Search',
            touchpoints: ['Instagram', 'Search'],
            conversions: 45,
            revenue: 2340,
            spend: 1300,
            cpr: 28.9,
            percentOfTotal: 7,
            avgTouches: 2.0,
            avgDaysToConvert: 4.2,
          },
          {
            pathId: '6',
            pathPattern: '3+ touches',
            touchpoints: ['Multiple'],
            conversions: 28,
            revenue: 1890,
            spend: 1179,
            cpr: 42.1,
            percentOfTotal: 5,
            avgTouches: 3.5,
            avgDaysToConvert: 7.8,
          },
        ] as AttributionPath[],
        totals: {
          conversions: 619,
          avgTouches: 2.1,
          avgDays: 4.3,
          crossPlatform: 55,
          bestCpr: 15.2,
          singleTouch: 45,
        },
        avgCpr: 23.5,
      };
    }
    
    return {
      paths: data.paths as AttributionPath[],
      totals: data.totals as any,
      avgCpr: (data as any).avgCpr || 20,
    };
  }, [data]);
  
  // Обработчик клика по пути
  const handlePathClick = (path: AttributionPath) => {
    setSelectedPath(path);
    onPathClick?.(path);
  };
  
  // Рендер Treemap view
  const renderTreemap = () => {
    const { paths, avgCpr } = pathsData;
    
    // Разбиваем на 2 ряда
    const row1 = paths.slice(0, 3);
    const row2 = paths.slice(3);
    
    return (
      <div className="space-y-2">
        {/* Row 1 - большие блоки */}
        <div className="flex gap-2 h-40">
          {row1.map((path) => (
            <div
              key={path.pathId}
              className={cn(
                'rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.02]',
                'flex flex-col justify-between',
                selectedPath?.pathId === path.pathId && 'ring-2 ring-primary'
              )}
              style={{
                flex: path.percentOfTotal,
                backgroundColor: getCPRColor(path.cpr, avgCpr),
                minWidth: '100px',
              }}
              onClick={() => handlePathClick(path)}
            >
              <div className="text-white/90 text-sm font-medium truncate">
                {path.pathPattern}
              </div>
              <div className="text-white space-y-1">
                <div className="text-2xl font-bold">{formatNumber(path.conversions)} conv</div>
                <div className="text-sm opacity-80">
                  {formatCurrency(path.cpr, currencyCode)} CPR
                </div>
                <div className="text-xs opacity-70">{path.percentOfTotal}%</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Row 2 - меньшие блоки */}
        <div className="flex gap-2 h-24">
          {row2.map((path) => (
            <div
              key={path.pathId}
              className={cn(
                'rounded-lg p-2 cursor-pointer transition-all hover:scale-[1.02]',
                'flex flex-col justify-between',
                selectedPath?.pathId === path.pathId && 'ring-2 ring-primary'
              )}
              style={{
                flex: path.percentOfTotal,
                backgroundColor: getCPRColor(path.cpr, avgCpr),
                minWidth: '80px',
              }}
              onClick={() => handlePathClick(path)}
            >
              <div className="text-white/90 text-xs truncate">
                {path.pathPattern}
              </div>
              <div className="text-white">
                <div className="text-lg font-bold">{formatNumber(path.conversions)}</div>
                <div className="text-xs opacity-80">{formatCurrency(path.cpr, currencyCode)} CPR</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
          <span>Площадь = кол-во конверсий</span>
          <span>|</span>
          <div className="flex items-center gap-2">
            <span>Цвет = CPR:</span>
            <div className="flex gap-1">
              <div className="w-4 h-3 rounded bg-green-500" title="Низкий" />
              <div className="w-4 h-3 rounded bg-lime-500" />
              <div className="w-4 h-3 rounded bg-yellow-500" />
              <div className="w-4 h-3 rounded bg-orange-500" />
              <div className="w-4 h-3 rounded bg-red-500" title="Высокий" />
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Рендер Tree view (упрощённый)
  const renderTree = () => {
    const { paths } = pathsData;
    
    return (
      <div className="space-y-4">
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <GitBranch className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Tree View требует ECharts интеграции
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            См. <a 
              href="https://echarts.apache.org/examples/en/editor.html?c=tree-radial" 
              target="_blank"
              className="text-primary underline"
            >
              Radial Tree Example
            </a>
          </p>
          
          {/* Временный список путей */}
          <div className="mt-6 text-left max-w-md mx-auto space-y-2">
            {paths.slice(0, 4).map((path, i) => (
              <div 
                key={path.pathId}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-muted-foreground">{i + 1}.</span>
                <span>{path.pathPattern}</span>
                <Badge variant="outline" className="ml-auto">
                  {path.conversions} conv
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <WidgetWrapper
      widgetId={widgetId}
      title="Attribution Paths"
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      headerAction={
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-7">
              <TabsTrigger value="treemap" className="h-6 px-2 text-xs gap-1">
                <LayoutGrid className="w-3 h-3" />
                Treemap
              </TabsTrigger>
              <TabsTrigger value="tree" className="h-6 px-2 text-xs gap-1">
                <GitBranch className="w-3 h-3" />
                Tree
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Group By */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign">By Campaign</SelectItem>
              <SelectItem value="placement">By Placement</SelectItem>
              <SelectItem value="source">By Source</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Main visualization */}
        {viewMode === 'treemap' ? renderTreemap() : renderTree()}
        
        {/* KPI row */}
        <div className="grid grid-cols-6 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold">{formatNumber(pathsData.totals.conversions)}</div>
            <div className="text-xs text-muted-foreground">Total Conv</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{pathsData.totals.avgTouches}</div>
            <div className="text-xs text-muted-foreground">Avg Touches</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{pathsData.totals.avgDays}d</div>
            <div className="text-xs text-muted-foreground">Avg Days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{pathsData.totals.crossPlatform}%</div>
            <div className="text-xs text-muted-foreground">Cross-platform</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(pathsData.totals.bestCpr, currencyCode)}
            </div>
            <div className="text-xs text-muted-foreground">Best CPR</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{pathsData.totals.singleTouch}%</div>
            <div className="text-xs text-muted-foreground">Single-touch</div>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
});

export default TreemapTreeWidget;
