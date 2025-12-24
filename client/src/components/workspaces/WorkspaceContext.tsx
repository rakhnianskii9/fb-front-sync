/**
 * WorkspaceContext — контекст для рабочих столов
 * 
 * Предоставляет общие параметры всем виджетам:
 * - workspaceId, reportId
 * - dateFrom, dateTo
 * - attribution
 * - accountIds
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  selectCurrentProject,
  selectCurrentReport,
  selectAccounts,
} from '@/store/selectors';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export interface WorkspaceContextValue {
  // Идентификаторы
  workspaceId: string | undefined;
  projectId: string | undefined;
  reportId: string | undefined;
  
  // Даты
  dateFrom: string;
  dateTo: string;
  periodA: DateRange | undefined;
  periodB: DateRange | undefined;
  compareEnabled: boolean;
  
  // Атрибуция
  attribution: string;
  
  // Аккаунты
  accountIds: string[];
  
  // Валюта
  currencyCode: string;
  
  // Selections
  selections: {
    campaigns: string[];
    adsets: string[];
    ads: string[];
    creatives: string[];
  };
  
  // Состояние
  isReady: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export interface WorkspaceProviderProps {
  children: ReactNode;
  periodA?: DateRange;
  periodB?: DateRange;
  compareEnabled?: boolean;
  attribution?: string;
}

export function WorkspaceProvider({
  children,
  periodA,
  periodB,
  compareEnabled = false,
  attribution = '7d_click_1d_view',
}: WorkspaceProviderProps) {
  const currentProject = useAppSelector(selectCurrentProject);
  const currentReport = useAppSelector(selectCurrentReport);
  const accounts = useAppSelector(selectAccounts);
  
  const value = useMemo((): WorkspaceContextValue => {
    // Даты
    const dateFrom = periodA?.from 
      ? format(periodA.from, 'yyyy-MM-dd') 
      : format(new Date(), 'yyyy-MM-dd');
    const dateTo = periodA?.to 
      ? format(periodA.to, 'yyyy-MM-dd') 
      : dateFrom;
    
    // Account IDs
    const accountIds = accounts?.map(a => a.adAccountId || a.id).filter(Boolean) || [];
    
    // Валюта
    const currencies = [...new Set(accounts?.map(a => a.currency).filter((c): c is string => Boolean(c)) || [])];
    const currencyCode = currencies.length === 1 ? currencies[0] : 'USD';
    
    // Selections
    const selections = {
      campaigns: currentReport?.selections?.campaigns || [],
      adsets: currentReport?.selections?.adsets || [],
      ads: currentReport?.selections?.ads || [],
      creatives: currentReport?.selections?.creatives || [],
    };
    
    // Готовность
    const isReady = Boolean(
      currentProject?.workspaceId &&
      currentReport?.id &&
      accountIds.length > 0
    );
    
    return {
      workspaceId: currentProject?.workspaceId,
      projectId: currentProject?.id,
      reportId: currentReport?.id,
      dateFrom,
      dateTo,
      periodA,
      periodB,
      compareEnabled,
      attribution: currentReport?.attribution || attribution,
      accountIds,
      currencyCode,
      selections,
      isReady,
    };
  }, [
    currentProject?.workspaceId,
    currentProject?.id,
    currentReport?.id,
    currentReport?.attribution,
    currentReport?.selections,
    accounts,
    periodA,
    periodB,
    compareEnabled,
    attribution,
  ]);
  
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
  }
  return context;
}

/**
 * Hook для получения общих пропсов виджетов
 */
export function useWidgetProps() {
  const ctx = useWorkspaceContext();
  
  return useMemo(() => ({
    workspaceId: ctx.workspaceId,
    reportId: ctx.reportId,
    dateFrom: ctx.dateFrom,
    dateTo: ctx.dateTo,
    attribution: ctx.attribution,
    accountIds: ctx.accountIds,
    currencyCode: ctx.currencyCode,
  }), [
    ctx.workspaceId,
    ctx.reportId,
    ctx.dateFrom,
    ctx.dateTo,
    ctx.attribution,
    ctx.accountIds,
    ctx.currencyCode,
  ]);
}

export default WorkspaceContext;
