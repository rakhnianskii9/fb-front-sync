/**
 * WorkspaceTabs — компонент переключения рабочих столов
 * 
 * Предоставляет табы для переключения между:
 * 1. Overview — Full Funnel FB→CRM + Plan/Fact (FunnelGaugeWidget)
 * 2. Attribution — Treemap/Tree paths (TreemapTreeWidget)
 * 3. Compare — Grouped/Stacked bar N×M (CompareBarWidget)
 */

import { memo, useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { WorkspaceProvider, type WorkspaceProviderProps } from './WorkspaceContext';
import { OverviewWorkspace } from './OverviewWorkspace';
import { AttributionWorkspace } from './AttributionWorkspace';
import { CompareWorkspace } from './CompareWorkspace';
import { 
  LayoutDashboard, 
  GitBranch, 
  BarChart3,
} from 'lucide-react';

export type WorkspaceType = 'overview' | 'attribution' | 'compare';

interface WorkspaceTabsProps extends Omit<WorkspaceProviderProps, 'children'> {
  /** Начальный рабочий стол */
  defaultWorkspace?: WorkspaceType;
  
  /** Callback при смене рабочего стола */
  onWorkspaceChange?: (workspace: WorkspaceType) => void;
  
  /** Кастомный контент для каждого рабочего стола */
  customContent?: {
    overview?: ReactNode;
    attribution?: ReactNode;
    compare?: ReactNode;
  };
}

const WORKSPACE_CONFIG: Record<WorkspaceType, {
  icon: typeof LayoutDashboard;
  label: string;
  description: string;
}> = {
  overview: {
    icon: LayoutDashboard,
    label: 'Overview',
    description: 'Full Funnel + Plan/Fact',
  },
  attribution: {
    icon: GitBranch,
    label: 'Attribution',
    description: 'Paths to conversion',
  },
  compare: {
    icon: BarChart3,
    label: 'Compare',
    description: 'N×M comparison',
  },
};

export const WorkspaceTabs = memo(function WorkspaceTabs({
  defaultWorkspace = 'overview',
  onWorkspaceChange,
  customContent,
  ...providerProps
}: WorkspaceTabsProps) {
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceType>(defaultWorkspace);
  
  const handleWorkspaceChange = (value: string) => {
    const workspace = value as WorkspaceType;
    setCurrentWorkspace(workspace);
    onWorkspaceChange?.(workspace);
  };
  
  return (
    <WorkspaceProvider {...providerProps}>
      <div className="flex flex-col h-full">
        {/* Workspace Tabs */}
        <Tabs 
          value={currentWorkspace} 
          onValueChange={handleWorkspaceChange}
          className="flex flex-col h-full"
        >
          <div className="border-b bg-muted/30 px-6">
            <TabsList className="h-12 bg-transparent gap-1">
              {Object.entries(WORKSPACE_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{config.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          
          {/* Workspace Content */}
          <TabsContent value="overview" className="flex-1 m-0 overflow-hidden">
            {customContent?.overview || (
              <OverviewWorkspace
                onNavigateToCompare={() => handleWorkspaceChange('compare')}
              />
            )}
          </TabsContent>
          
          <TabsContent value="attribution" className="flex-1 m-0 overflow-hidden">
            {customContent?.attribution || (
              <AttributionWorkspace />
            )}
          </TabsContent>
          
          <TabsContent value="compare" className="flex-1 m-0 overflow-hidden">
            {customContent?.compare || (
              <CompareWorkspace />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </WorkspaceProvider>
  );
});

export default WorkspaceTabs;
