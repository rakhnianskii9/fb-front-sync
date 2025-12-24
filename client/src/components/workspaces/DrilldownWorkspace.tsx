/**
 * DrilldownWorkspace — Рабочий стол 2: Drill-down
 * 
 * Цель: Глубокий анализ по уровням
 * 
 * Особенности:
 * - Табы: Campaigns → AdSets → Ads → Creatives
 * - Таблица с сортировкой и фильтрацией
 * - Детальные метрики
 * - Хлебные крошки для навигации
 */

import { memo, useState } from 'react';
import { 
  DataTableWidget,
  MetricCardsGroup,
  LineChartWidget,
} from '@/components/widgets';
import { useWorkspaceContext, useWidgetProps } from './WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { 
  Megaphone, 
  Layers, 
  FileText, 
  Image,
  ChevronRight,
} from 'lucide-react';
import type { WidgetEntityType } from '@/hooks/useWidgetCache';

type DrilldownLevel = 'campaign' | 'adset' | 'ad' | 'creative';

interface Breadcrumb {
  level: DrilldownLevel;
  id: string;
  name: string;
}

interface DrilldownWorkspaceProps {
  /** Начальный уровень */
  initialLevel?: DrilldownLevel;
}

const LEVEL_CONFIG: Record<DrilldownLevel, {
  icon: typeof Megaphone;
  label: string;
  pluralLabel: string;
  entityType: WidgetEntityType;
}> = {
  campaign: {
    icon: Megaphone,
    label: 'Campaign',
    pluralLabel: 'Campaigns',
    entityType: 'campaign',
  },
  adset: {
    icon: Layers,
    label: 'Ad Set',
    pluralLabel: 'Ad Sets',
    entityType: 'adset',
  },
  ad: {
    icon: FileText,
    label: 'Ad',
    pluralLabel: 'Ads',
    entityType: 'ad',
  },
  creative: {
    icon: Image,
    label: 'Creative',
    pluralLabel: 'Creatives',
    entityType: 'creative',
  },
};

// Метрики для каждого уровня
const LEVEL_METRICS: Record<DrilldownLevel, string[]> = {
  campaign: ['spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cpc', 'cpm'],
  adset: ['spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cpc', 'cpm'],
  ad: ['spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cpc', 'cpm'],
  creative: ['spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cpc'],
};

// KPI метрики для карточек
const KPI_METRICS = [
  { id: 'spend', label: 'Spend' },
  { id: 'impressions', label: 'Impressions' },
  { id: 'clicks', label: 'Clicks' },
  { id: 'conversions', label: 'Conversions' },
];

export const DrilldownWorkspace = memo(function DrilldownWorkspace({
  initialLevel = 'campaign',
}: DrilldownWorkspaceProps) {
  const ctx = useWorkspaceContext();
  const widgetProps = useWidgetProps();
  
  const [currentLevel, setCurrentLevel] = useState<DrilldownLevel>(initialLevel);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[] | undefined>(undefined);
  
  if (!ctx.isReady) {
    return <DrilldownSkeleton />;
  }
  
  const levelConfig = LEVEL_CONFIG[currentLevel];
  const tableMetrics = LEVEL_METRICS[currentLevel];
  
  // Обработка drill-down
  const handleDrillDown = (entityId: string, entityName: string) => {
    const levels: DrilldownLevel[] = ['campaign', 'adset', 'ad', 'creative'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1];
      
      setBreadcrumbs(prev => [...prev, {
        level: currentLevel,
        id: entityId,
        name: entityName,
      }]);
      
      setSelectedEntityIds([entityId]);
      setCurrentLevel(nextLevel);
    }
  };
  
  // Обработка навигации по хлебным крошкам
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Клик на "All"
      setBreadcrumbs([]);
      setSelectedEntityIds(undefined);
      setCurrentLevel('campaign');
    } else {
      const crumb = breadcrumbs[index];
      setBreadcrumbs(prev => prev.slice(0, index));
      
      if (index === 0) {
        setSelectedEntityIds(undefined);
      } else {
        setSelectedEntityIds([breadcrumbs[index - 1].id]);
      }
      
      setCurrentLevel(crumb.level);
    }
  };
  
  // Обработка смены таба
  const handleTabChange = (level: string) => {
    setCurrentLevel(level as DrilldownLevel);
    setBreadcrumbs([]);
    setSelectedEntityIds(undefined);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header с табами */}
      <div className="border-b bg-background px-6 py-3">
        <Tabs value={currentLevel} onValueChange={handleTabChange}>
          <TabsList>
            {Object.entries(LEVEL_CONFIG).map(([level, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={level} value={level} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {config.pluralLabel}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 mt-3 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
              onClick={() => handleBreadcrumbClick(-1)}
            >
              All {LEVEL_CONFIG.campaign.pluralLabel}
            </Button>
            
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {crumb.name}
                </Button>
              </div>
            ))}
            
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">{levelConfig.pluralLabel}</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Cards */}
        <MetricCardsGroup
          metrics={KPI_METRICS}
          entityType={levelConfig.entityType}
          entityIds={selectedEntityIds}
          columns={4}
          {...widgetProps}
        />
        
        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          <LineChartWidget
            title="Performance Trend"
            metricIds={['spend', 'conversions']}
            entityType={levelConfig.entityType}
            entityIds={selectedEntityIds}
            height="sm"
            {...widgetProps}
          />
          
          <LineChartWidget
            title="Efficiency Trend"
            metricIds={['ctr', 'cpc']}
            entityType={levelConfig.entityType}
            entityIds={selectedEntityIds}
            height="sm"
            {...widgetProps}
          />
        </div>
        
        {/* Data Table */}
        <DataTableWidget
          title={levelConfig.pluralLabel}
          metricIds={tableMetrics}
          entityType={levelConfig.entityType}
          entityIds={selectedEntityIds}
          height="xl"
          showSearch
          showThumbnail={currentLevel === 'creative'}
          pageSize={15}
          {...widgetProps}
        />
      </div>
    </div>
  );
});

function DrilldownSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background px-6 py-3">
        <Skeleton className="h-10 w-[400px]" />
      </div>
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-4 h-[200px]">
            <Skeleton className="h-full w-full" />
          </Card>
          <Card className="p-4 h-[200px]">
            <Skeleton className="h-full w-full" />
          </Card>
        </div>
        <Card className="p-4 h-[400px]">
          <Skeleton className="h-full w-full" />
        </Card>
      </div>
    </div>
  );
}

export default DrilldownWorkspace;
