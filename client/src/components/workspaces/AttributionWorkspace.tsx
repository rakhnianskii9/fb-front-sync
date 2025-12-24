/**
 * AttributionWorkspace — Рабочий стол 2: Attribution
 * 
 * Цель: Анализ путей атрибуции до конверсии
 * 
 * Главный виджет: TreemapTreeWidget (Treemap ↔ Tree toggle)
 * Второстепенные: Model Comparison, Time to Convert, Touch Frequency
 */

import { memo, useState } from 'react';
import { 
  MetricCardsGroup,
  TreemapTreeWidget,
  HistogramWidget,
  PieDonutWidget,
  BarChartWidget,
} from '@/components/widgets';
import { useWorkspaceContext, useWidgetProps } from './WorkspaceContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GitBranch, Info } from 'lucide-react';

interface AttributionWorkspaceProps {
  /** Callback при выборе пути */
  onPathSelect?: (pathId: string) => void;
}

// Attribution модели
const ATTRIBUTION_MODELS = [
  { value: 'last_touch', label: 'Last Touch' },
  { value: 'first_touch', label: 'First Touch' },
  { value: 'linear', label: 'Linear' },
  { value: 'time_decay', label: 'Time Decay' },
  { value: 'position_based', label: 'Position Based' },
];

export const AttributionWorkspace = memo(function AttributionWorkspace({
  onPathSelect,
}: AttributionWorkspaceProps) {
  const ctx = useWorkspaceContext();
  const widgetProps = useWidgetProps();
  const [attributionModel, setAttributionModel] = useState('last_touch');
  const [selectedPath, setSelectedPath] = useState<any>(null);
  
  if (!ctx.isReady) {
    return <AttributionSkeleton />;
  }
  
  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Attribution Analysis
          </h2>
          <Select value={attributionModel} onValueChange={setAttributionModel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Attribution Model" />
            </SelectTrigger>
            <SelectContent>
              {ATTRIBUTION_MODELS.map(model => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* ГЛАВНЫЙ ВИДЖЕТ: Treemap/Tree */}
        <section>
          <TreemapTreeWidget
            onPathClick={(path) => {
              setSelectedPath(path);
              onPathSelect?.(path.pathId);
            }}
            {...widgetProps}
          />
        </section>
        
        {/* Второстепенные виджеты */}
        <section className="grid grid-cols-3 gap-4">
          {/* Attribution Model Comparison */}
          <BarChartWidget
            title="Model Comparison (CPR)"
            metricId="cpr"
            entityType="campaign"
            height="sm"
            maxItems={5}
            layout="horizontal"
            {...widgetProps}
          />
          
          {/* Time to Convert */}
          <HistogramWidget
            title="Time to Convert"
            distributionType="time_to_convert"
            {...widgetProps}
          />
          
          {/* Touch Frequency */}
          <PieDonutWidget
            title="Touch Frequency"
            breakdown="touch_frequency"
            metric="conversions"
            variant="donut"
            {...widgetProps}
          />
        </section>
        
        {/* KPI Плитка */}
        <section>
          <MetricCardsGroup
            metrics={[
              { id: 'total_conversions', label: 'Total Conversions' },
              { id: 'avg_touches', label: 'Avg Touches' },
              { id: 'avg_days', label: 'Avg Days to Convert' },
              { id: 'cross_platform', label: 'Cross-platform %' },
              { id: 'best_path_cpr', label: 'Best Path CPR' },
              { id: 'single_touch', label: 'Single-touch %' },
            ]}
            entityType="campaign"
            columns={6}
            {...widgetProps}
          />
        </section>
      </div>
      
      {/* Detail Panel (при клике на путь) */}
      {selectedPath && (
        <div className="w-80 border-l bg-muted/30 p-4 overflow-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedPath.pathPattern}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Statistics</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Conversions</div>
                    <div className="font-medium">{selectedPath.conversions}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">% of Total</div>
                    <div className="font-medium">{selectedPath.percentOfTotal}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg CPR</div>
                    <div className="font-medium">${selectedPath.cpr}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Days</div>
                    <div className="font-medium">{selectedPath.avgDaysToConvert}d</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Touchpoints</div>
                <div className="space-y-1">
                  {selectedPath.touchpoints?.map((tp: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                        {i + 1}
                      </div>
                      <span>{tp}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Cross-platform paths convert 23% better than single-platform
                  </span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setSelectedPath(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
});

function AttributionSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <Skeleton className="h-[350px] w-full rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-[200px] rounded-lg" />
        <Skeleton className="h-[200px] rounded-lg" />
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
      <div className="grid grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AttributionWorkspace;
