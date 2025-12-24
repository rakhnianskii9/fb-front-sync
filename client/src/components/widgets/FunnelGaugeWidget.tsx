/**
 * FunnelGaugeWidget — Главный виджет Workspace 1: Overview
 * 
 * Full Funnel FB Ads → CRM + Plan/Fact Gauge
 * 
 * ECharts компоненты:
 * - Funnel: https://echarts.apache.org/examples/en/editor.html?c=funnel
 * - Grade Gauge: https://echarts.apache.org/examples/en/editor.html?c=gauge-grade
 * 
 * Структура:
 * - FB Ads: Impressions → Clicks → Results
 * - Match Rate разделитель
 * - CRM: Leads → Qualified → Won + Revenue
 * - Plan/Fact прогресс-бары справа
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetRequest } from '@/hooks/useWidgetCache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Smartphone,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/formatters';

// Типы
interface FunnelStage {
  id: string;
  name: string;
  value: number;
  target?: number;
  percentOfTotal: number;
  conversionRate?: number;
  color: string;
  icon?: typeof Smartphone;
  section: 'facebook' | 'crm';
}

interface FunnelTargets {
  impressions?: number;
  clicks?: number;
  results?: number;
  crmLeads?: number;
  qualified?: number;
  won?: number;
  revenue?: number;
}

interface FunnelGaugeWidgetProps {
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  accountIds: string[];
  attribution?: string;
  currencyCode?: string;
  targets?: FunnelTargets;
  onSetTargets?: () => void;
  onStageClick?: (stageId: string) => void;
}

// Цвета для этапов
const STAGE_COLORS = {
  impressions: '#3b82f6',  // blue
  clicks: '#6366f1',       // indigo
  results: '#8b5cf6',      // violet
  crmLeads: '#10b981',     // emerald
  qualified: '#14b8a6',    // teal
  won: '#22c55e',          // green
};

export const FunnelGaugeWidget = memo(function FunnelGaugeWidget({
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  accountIds,
  attribution = '7d_click_1d_view',
  currencyCode = 'USD',
  targets,
  onSetTargets,
  onStageClick,
}: FunnelGaugeWidgetProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  
  const widgetId = `funnel-gauge-${reportId}-${dateFrom}-${dateTo}`;
  
  // Запрос данных
  const request: WidgetRequest = {
    widgetId,
    widgetType: 'funnel',
    entityType: 'campaign',
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
    metricIds: ['impressions', 'clicks', 'conversions', 'spend'],
    filters: {
      includeCRM: true,
    },
  };
  
  const { data, isLoading, error, refetch } = useWidgetCache(request, {
    enabled: Boolean(workspaceId && reportId && accountIds.length > 0),
  });
  
  // Формируем данные воронки
  const funnelData = useMemo(() => {
    if (!data) return null;
    
    const metrics = data.totals || data;
    
    // FB Ads этапы
    const impressions = metrics.impressions || 0;
    const clicks = metrics.clicks || 0;
    const results = metrics.conversions || metrics.results || 0;
    const spend = metrics.spend || 0;
    
    // CRM этапы (если есть)
    const crmLeads = metrics.crmLeads || metrics.leads || 0;
    const qualified = metrics.qualified || metrics.qualifiedLeads || 0;
    const won = metrics.won || metrics.sales || 0;
    const revenue = metrics.revenue || 0;
    
    // Match Rate
    const matchRate = results > 0 && crmLeads > 0 
      ? Math.min(100, (crmLeads / results) * 100)
      : 0;
    
    // ROMI
    const romi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
    
    const stages: FunnelStage[] = [
      {
        id: 'impressions',
        name: 'Impressions',
        value: impressions,
        target: targets?.impressions,
        percentOfTotal: 100,
        color: STAGE_COLORS.impressions,
        icon: Smartphone,
        section: 'facebook',
      },
      {
        id: 'clicks',
        name: 'Clicks',
        value: clicks,
        target: targets?.clicks,
        percentOfTotal: impressions > 0 ? (clicks / impressions) * 100 : 0,
        conversionRate: impressions > 0 ? (clicks / impressions) * 100 : 0,
        color: STAGE_COLORS.clicks,
        section: 'facebook',
      },
      {
        id: 'results',
        name: 'Results',
        value: results,
        target: targets?.results,
        percentOfTotal: impressions > 0 ? (results / impressions) * 100 : 0,
        conversionRate: clicks > 0 ? (results / clicks) * 100 : 0,
        color: STAGE_COLORS.results,
        section: 'facebook',
      },
      {
        id: 'crmLeads',
        name: 'CRM Leads',
        value: crmLeads,
        target: targets?.crmLeads,
        percentOfTotal: impressions > 0 ? (crmLeads / impressions) * 100 : 0,
        conversionRate: matchRate,
        color: STAGE_COLORS.crmLeads,
        icon: Briefcase,
        section: 'crm',
      },
      {
        id: 'qualified',
        name: 'Qualified',
        value: qualified,
        target: targets?.qualified,
        percentOfTotal: impressions > 0 ? (qualified / impressions) * 100 : 0,
        conversionRate: crmLeads > 0 ? (qualified / crmLeads) * 100 : 0,
        color: STAGE_COLORS.qualified,
        section: 'crm',
      },
      {
        id: 'won',
        name: 'Won',
        value: won,
        target: targets?.won,
        percentOfTotal: impressions > 0 ? (won / impressions) * 100 : 0,
        conversionRate: qualified > 0 ? (won / qualified) * 100 : 0,
        color: STAGE_COLORS.won,
        section: 'crm',
      },
    ];
    
    return {
      stages,
      matchRate,
      spend,
      revenue,
      romi,
      hasCRM: crmLeads > 0,
    };
  }, [data, targets]);
  
  // Обработчик клика по этапу
  const handleStageClick = useCallback((stageId: string) => {
    setSelectedStage(stageId === selectedStage ? null : stageId);
    onStageClick?.(stageId);
  }, [selectedStage, onStageClick]);
  
  // Рендер этапа воронки
  const renderStage = (stage: FunnelStage, maxWidth: number) => {
    const width = Math.max(20, stage.percentOfTotal * (maxWidth / 100));
    const progress = stage.target 
      ? Math.min(100, (stage.value / stage.target) * 100)
      : 0;
    const isOverTarget = stage.target && stage.value > stage.target;
    
    return (
      <div
        key={stage.id}
        className={cn(
          'cursor-pointer transition-all duration-200',
          'hover:scale-[1.02]',
          selectedStage === stage.id && 'ring-2 ring-primary ring-offset-2'
        )}
        onClick={() => handleStageClick(stage.id)}
      >
        <div className="flex items-center gap-4">
          {/* Funnel bar */}
          <div className="flex-1 flex justify-center">
            <div
              className="h-12 rounded-md flex items-center justify-center text-white font-medium transition-all"
              style={{
                width: `${width}%`,
                backgroundColor: stage.color,
                minWidth: '120px',
              }}
            >
              <span className="text-sm">{stage.name}</span>
              <span className="ml-2 font-bold">{formatNumber(stage.value)}</span>
            </div>
          </div>
          
          {/* Plan/Fact */}
          {stage.target && (
            <div className="w-48 flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {formatNumber(stage.target)}
                  </span>
                  <span className={cn(
                    'font-medium',
                    isOverTarget ? 'text-green-600' : 
                    progress >= 80 ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, progress)} 
                  className={cn(
                    'h-2',
                    isOverTarget && '[&>div]:bg-green-500'
                  )}
                />
              </div>
              {isOverTarget && (
                <TrendingUp className="w-4 h-4 text-green-500" />
              )}
            </div>
          )}
          
          {/* Conversion rate */}
          {stage.conversionRate !== undefined && stage.id !== 'impressions' && (
            <div className="w-16 text-right text-xs text-muted-foreground">
              {stage.conversionRate.toFixed(1)}% ↓
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <WidgetWrapper
      widgetId={widgetId}
      title="Full Funnel + Plan/Fact"
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      headerAction={
        onSetTargets && (
          <Button variant="ghost" size="sm" onClick={onSetTargets}>
            <Settings className="w-4 h-4 mr-1" />
            Set Targets
          </Button>
        )
      }
    >
      {funnelData && (
        <div className="space-y-1">
          {/* FB Ads Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Smartphone className="w-4 h-4" />
              FACEBOOK ADS
            </div>
            <div className="space-y-1">
              {funnelData.stages
                .filter(s => s.section === 'facebook')
                .map(stage => renderStage(stage, 100))}
            </div>
          </div>
          
          {/* Match Rate Divider */}
          <div className="flex items-center gap-2 py-3">
            <div className="flex-1 border-t-2 border-dashed border-yellow-500/50" />
            <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-600">
              <Zap className="w-3 h-3" />
              Match Rate: {funnelData.matchRate.toFixed(0)}%
            </Badge>
            <div className="flex-1 border-t-2 border-dashed border-yellow-500/50" />
          </div>
          
          {/* CRM Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              CRM (Kommo)
              {!funnelData.hasCRM && (
                <Badge variant="outline" className="text-xs">Not connected</Badge>
              )}
            </div>
            <div className="space-y-1">
              {funnelData.stages
                .filter(s => s.section === 'crm')
                .map(stage => renderStage(stage, 60))}
            </div>
          </div>
          
          {/* Bottom Stats */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-muted-foreground">Total Spend</div>
                <div className="text-lg font-bold">
                  {formatCurrency(funnelData.spend, currencyCode)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Revenue</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(funnelData.revenue, currencyCode)}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-muted-foreground">ROMI</div>
              <div className={cn(
                'text-2xl font-bold flex items-center gap-1',
                funnelData.romi > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {funnelData.romi > 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                {funnelData.romi.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
});

export default FunnelGaugeWidget;
