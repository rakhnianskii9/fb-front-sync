/**
 * OverviewWorkspace — Рабочий стол 1: Обзор
 * 
 * Цель: Быстрый снимок эффективности
 * 
 * Главный виджет: FunnelGaugeWidget (Full Funnel FB→CRM + Plan/Fact)
 * Второстепенные: KPI карточки, Trend charts
 */

import { memo, useState } from 'react';
import { 
  MetricCardsGroup,
  LineChartWidget,
  FunnelGaugeWidget,
} from '@/components/widgets';
import { useWorkspaceContext, useWidgetProps } from './WorkspaceContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewWorkspaceProps {
  /** Callback при клике на "View All" в ROMI виджете */
  onNavigateToCompare?: () => void;
  /** Callback для открытия модалки установки targets */
  onSetTargets?: () => void;
}

export const OverviewWorkspace = memo(function OverviewWorkspace({
  onNavigateToCompare,
  onSetTargets,
}: OverviewWorkspaceProps) {
  const ctx = useWorkspaceContext();
  const widgetProps = useWidgetProps();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  
  if (!ctx.isReady) {
    return <OverviewSkeleton />;
  }
  
  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* ГЛАВНЫЙ ВИДЖЕТ: Full Funnel + Plan/Fact */}
        <section>
          <FunnelGaugeWidget
            onSetTargets={onSetTargets}
            onStageClick={setSelectedStage}
            {...widgetProps}
          />
        </section>
        
        {/* Второстепенные виджеты */}
        <section className="grid grid-cols-3 gap-4">
          {/* Revenue vs Spend trend */}
          <LineChartWidget
            title="Revenue vs Spend"
            metricIds={['spend', 'revenue']}
            entityType="campaign"
            height="sm"
            {...widgetProps}
          />
          
          {/* ROMI Trend */}
          <LineChartWidget
            title="ROMI Trend"
            metricIds={['romi']}
            entityType="campaign"
            height="sm"
            showLegend={false}
            {...widgetProps}
          />
          
          {/* Conversion Rate + Results */}
          <LineChartWidget
            title="Conversions"
            metricIds={['conversions', 'ctr']}
            entityType="campaign"
            height="sm"
            {...widgetProps}
          />
        </section>
        
        {/* KPI Плитка (10 карточек) */}
        <section>
          <MetricCardsGroup
            metrics={[
              { id: 'impressions', label: 'Impressions' },
              { id: 'ctr', label: 'CTR' },
              { id: 'cpm', label: 'CPM' },
              { id: 'conversions', label: 'Results' },
              { id: 'cpr', label: 'CPR' },
              { id: 'crmLeads', label: 'CRM Leads' },
              { id: 'qualified', label: 'Qualified' },
              { id: 'won', label: 'Sales (Won)' },
              { id: 'revenue', label: 'Revenue' },
              { id: 'romi', label: 'ROMI' },
            ]}
            entityType="campaign"
            columns={5}
            {...widgetProps}
          />
        </section>
      </div>
      
      {/* Detail Panel (при клике на этап воронки) */}
      {selectedStage && (
        <div className="w-80 border-l bg-muted/30 p-4 overflow-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">{selectedStage}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-2">By Campaign</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Summer Sale</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retargeting</span>
                    <span className="font-medium">30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lookalike</span>
                    <span className="font-medium">25%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-2">By Placement</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Instagram</span>
                    <span className="font-medium">55%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Facebook</span>
                    <span className="font-medium">40%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audience Network</span>
                    <span className="font-medium">5%</span>
                  </div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setSelectedStage(null)}
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

function OverviewSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-[400px] w-full rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-[200px] rounded-lg" />
        <Skeleton className="h-[200px] rounded-lg" />
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default OverviewWorkspace;
