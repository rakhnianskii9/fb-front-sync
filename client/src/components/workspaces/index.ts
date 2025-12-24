/**
 * Экспорт компонентов рабочих столов
 * 
 * Workspaces:
 * 1. OverviewWorkspace — Full Funnel FB→CRM + Plan/Fact
 * 2. AttributionWorkspace — Treemap/Tree attribution paths
 * 3. CompareWorkspace — Grouped/Stacked bar N×M comparison
 * 
 * DrilldownWorkspace оставлен для возможного будущего использования
 */

export { WorkspaceProvider, useWorkspaceContext, useWidgetProps } from './WorkspaceContext';
export { OverviewWorkspace } from './OverviewWorkspace';
export { AttributionWorkspace } from './AttributionWorkspace';
export { CompareWorkspace } from './CompareWorkspace';
export { DrilldownWorkspace } from './DrilldownWorkspace';
export { WorkspaceTabs, type WorkspaceType } from './WorkspaceTabs';
