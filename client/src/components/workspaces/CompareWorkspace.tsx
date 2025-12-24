/**
 * CompareWorkspace — Рабочий стол 3: Compare
 * 
 * Цель: Сравнение N сущностей по M метрикам
 * 
 * Главный виджет: CompareBarWidget (Grouped/Stacked/Normalized bar)
 * Второстепенные: ScatterBubbleWidget, ROMIByCreativeWidget, PieDonutWidget
 */

import { memo, useState } from 'react';
import { 
  MetricCardsGroup,
  CompareBarWidget,
  ScatterBubbleWidget,
  ROMIByCreativeWidget,
  PieDonutWidget,
} from '@/components/widgets';
import { useWorkspaceContext, useWidgetProps } from './WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3,
  Image,
  ScatterChart,
  Filter,
} from 'lucide-react';

// Entity types для сравнения
const ENTITY_TYPES = [
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'adsets', label: 'Ad Sets' },
  { value: 'ads', label: 'Ads' },
  { value: 'creatives', label: 'Creatives' },
];

// Breakdown атрибуты
const BREAKDOWN_OPTIONS = [
  { value: 'none', label: 'No Breakdown' },
  { value: 'placement', label: 'By Placement' },
  { value: 'objective', label: 'By Objective' },
  { value: 'budget_type', label: 'By Budget Type' },
  { value: 'optimization_goal', label: 'By Optimization Goal' },
  { value: 'bid_strategy', label: 'By Bid Strategy' },
];

interface CompareWorkspaceProps {
  /** Callback при выборе entity */
  onEntitySelect?: (entityId: string) => void;
}

type CompareView = 'bar' | 'scatter' | 'romi';

export const CompareWorkspace = memo(function CompareWorkspace({
  onEntitySelect,
}: CompareWorkspaceProps) {
  const ctx = useWorkspaceContext();
  const widgetProps = useWidgetProps();
  
  const [entityType, setEntityType] = useState<string>('campaigns');
  const [breakdown, setBreakdown] = useState('none');
  const [activeView, setActiveView] = useState<CompareView>('bar');
  
  if (!ctx.isReady) {
    return <CompareSkeleton />;
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Compare</h2>
            
            {/* Entity Type Selector */}
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map(et => (
                  <SelectItem key={et.value} value={et.value}>
                    {et.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Breakdown Selector */}
            <Select value={breakdown} onValueChange={setBreakdown}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-3 h-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BREAKDOWN_OPTIONS.map(b => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* View Toggle */}
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as CompareView)}>
            <TabsList>
              <TabsTrigger value="bar" className="gap-1">
                <BarChart3 className="w-4 h-4" />
                Bar Chart
              </TabsTrigger>
              <TabsTrigger value="scatter" className="gap-1">
                <ScatterChart className="w-4 h-4" />
                Scatter
              </TabsTrigger>
              <TabsTrigger value="romi" className="gap-1">
                <Image className="w-4 h-4" />
                ROMI Table
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Summary */}
        <MetricCardsGroup
          metrics={[
            { id: 'entities_count', label: 'Entities' },
            { id: 'spend', label: 'Total Spend' },
            { id: 'avg_cpr', label: 'Avg CPR' },
            { id: 'best_performer', label: 'Best Performer' },
            { id: 'spread', label: 'Spread (Max-Min)' },
            { id: 'std_dev', label: 'Std Deviation' },
          ]}
          entityType={entityType.slice(0, -1) as any}
          columns={6}
          {...widgetProps}
        />
        
        {/* ГЛАВНЫЙ ВИДЖЕТ — зависит от activeView */}
        {activeView === 'bar' && (
          <CompareBarWidget
            entityType={entityType as any}
            onEntityClick={onEntitySelect}
            {...widgetProps}
          />
        )}
        
        {activeView === 'scatter' && (
          <ScatterBubbleWidget
            title="Correlation Analysis"
            entityType={entityType.slice(0, -1) as any}
            onEntityClick={onEntitySelect}
            {...widgetProps}
          />
        )}
        
        {activeView === 'romi' && (
          <ROMIByCreativeWidget
            title="ROMI by Creative"
            onCreativeClick={onEntitySelect}
            {...widgetProps}
          />
        )}
        
        {/* Второстепенные виджеты (показываем только если не активны) */}
        <section className="grid grid-cols-2 gap-4">
          {activeView !== 'scatter' && (
            <ScatterBubbleWidget
              title="CPR vs Spend"
              entityType={entityType.slice(0, -1) as any}
              onEntityClick={onEntitySelect}
              {...widgetProps}
            />
          )}
          
          <PieDonutWidget
            title={`Spend by ${breakdown === 'none' ? 'Placement' : breakdown.replace('_', ' ')}`}
            breakdown={breakdown === 'none' ? 'placement' : breakdown}
            metric="spend"
            variant="donut"
            {...widgetProps}
          />
        </section>
      </div>
    </div>
  );
});

function CompareSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background px-6 py-3">
        <div className="flex justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-[140px]" />
            <Skeleton className="h-10 w-[160px]" />
          </div>
          <Skeleton className="h-10 w-[300px]" />
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[300px] rounded-lg" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default CompareWorkspace;
