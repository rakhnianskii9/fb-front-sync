import { useEffect, useCallback, useState, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { AppDispatch } from '@/store';
import type { ReportStatus, DataRangeInfo } from '@/store/slices/reportsSlice';
import {
  selectAutoRefreshLimit,
  selectSyncStatusLoading,
  selectReportSyncInfo,
} from '@/store/slices/reportsSlice';
import {
  toggleAutoRefreshThunk,
  getSyncStatusThunk,
  extendRangeThunk,
  cancelSyncThunk,
} from '@/store/slices/reportsThunks';

interface ReportSyncStatusProps {
  reportId: string;
  projectId: string;
  configId?: string; // Now optional - backend can derive from workspace
  compact?: boolean;
}

// Статус-иконка синхронизации
const StatusIcon = ({ status }: { status: ReportStatus }) => {
  switch (status) {
    case 'syncing':
    case 'extending':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    case 'ready':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

// Текст статуса
const getStatusText = (status: ReportStatus, syncProgress?: number): string => {
  // Форматируем прогресс: если > 100, это дробное число — показываем 2 знака
  const formatProgress = (p: number) => p > 100 ? (p / 100).toFixed(0) : Math.round(p);
  
  switch (status) {
    case 'syncing':
      return syncProgress !== undefined ? `Syncing ${formatProgress(syncProgress)}%` : 'Syncing...';
    case 'extending':
      return syncProgress !== undefined ? `Extending ${formatProgress(syncProgress)}%` : 'Extending...';
    case 'ready':
      return 'Ready';
    case 'error':
      return 'Error';
    case 'pending':
      return 'Pending';
    case 'deleted':
      return 'Deleted';
    default:
      return 'Unknown';
  }
};

// Форматирование диапазона дат
const formatDataRange = (dataRange: DataRangeInfo | null | undefined): string => {
  if (!dataRange) return 'No data';
  const { loadedDays, requestedDays } = dataRange;
  if (loadedDays === requestedDays) {
    return `${loadedDays} days`;
  }
  return `${loadedDays}/${requestedDays} days`;
};

function ReportSyncStatusInner({
  reportId,
  projectId,
  configId,
  compact = false,
}: ReportSyncStatusProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const syncInfo = useSelector(selectReportSyncInfo(projectId, reportId));
  const isLoading = useSelector(selectSyncStatusLoading(reportId));
  const autoRefreshLimit = useSelector(selectAutoRefreshLimit);

  const isSyncing = syncInfo?.status === 'syncing' || syncInfo?.status === 'extending';

  // Поллинг статуса во время синхронизации
  useEffect(() => {
    if (isSyncing && !pollingInterval) {
      const interval = setInterval(() => {
        dispatch(getSyncStatusThunk({ reportId }));
      }, 3000); // каждые 3 секунды
      setPollingInterval(interval);
    } else if (!isSyncing && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [isSyncing, pollingInterval, reportId, dispatch]);

  // Toggle auto-refresh
  const handleToggleAutoRefresh = useCallback(async () => {
    const newEnabled = !syncInfo?.autoRefresh;
    
    // Check limit before enabling
    if (newEnabled && autoRefreshLimit.remaining <= 0) {
      toast({
        title: "Limit reached",
        description: `You are using ${autoRefreshLimit.current} of ${autoRefreshLimit.limit} auto-refresh slots. Disable auto-refresh on another report.`,
        variant: "destructive",
      });
      return;
    }

    dispatch(toggleAutoRefreshThunk({ reportId, enabled: newEnabled }));
  }, [dispatch, reportId, syncInfo?.autoRefresh, autoRefreshLimit, toast]);

  // Extend range
  const handleExtendRange = useCallback((targetDays: number) => {
    dispatch(extendRangeThunk({ projectId, reportId, targetDays, configId }));
  }, [dispatch, projectId, reportId, configId]);

  // Cancel sync
  const handleCancelSync = useCallback(() => {
    dispatch(cancelSyncThunk({ projectId, reportId, reason: 'User cancelled' }));
  }, [dispatch, projectId, reportId]);

  if (!syncInfo) return null;

  // Default status if not defined
  const status = syncInfo.status || 'pending';

  // Compact mode - status icon only
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <StatusIcon status={status} />
              {isSyncing && syncInfo.syncProgress && (
                <span className="text-xs text-muted-foreground">{syncInfo.syncProgress}%</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getStatusText(status, syncInfo.syncProgress)}</p>
            {syncInfo.dataRange && (
              <p className="text-xs text-muted-foreground">
                Data: {formatDataRange(syncInfo.dataRange)}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full mode
  return (
    <div className="flex flex-col gap-3 p-4 bg-card border border-card-border rounded-lg">
      {/* Status and progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className="text-sm font-medium">
            {getStatusText(status, syncInfo.syncProgress)}
          </span>
        </div>
        
        {isSyncing && (
          <Button variant="ghost" size="sm" onClick={handleCancelSync} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>

      {/* Progress bar during sync */}
      {isSyncing && syncInfo.syncProgress !== undefined && (
        <Progress value={syncInfo.syncProgress} className="h-2" />
      )}

      {/* Data range info */}
      {syncInfo.dataRange && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Loaded: {formatDataRange(syncInfo.dataRange)}</span>
          </div>

          {/* Extend range button */}
          {status === 'ready' && syncInfo.dataRange.loadedDays < 360 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  Extend
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {syncInfo.dataRange.loadedDays < 90 && (
                  <DropdownMenuItem onClick={() => handleExtendRange(90)}>
                    Up to 90 days
                  </DropdownMenuItem>
                )}
                {syncInfo.dataRange.loadedDays < 180 && (
                  <DropdownMenuItem onClick={() => handleExtendRange(180)}>
                    Up to 180 days
                  </DropdownMenuItem>
                )}
                {syncInfo.dataRange.loadedDays < 360 && (
                  <DropdownMenuItem onClick={() => handleExtendRange(360)}>
                    Up to 360 days
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Sync error */}
      {status === 'error' && syncInfo.syncError && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
          {syncInfo.syncError}
        </div>
      )}

      {/* Auto-refresh toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-card-border">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Auto-refresh</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs">
                  {autoRefreshLimit.current}/{autoRefreshLimit.limit}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Used {autoRefreshLimit.current} of {autoRefreshLimit.limit} slots</p>
                <p className="text-xs text-muted-foreground">
                  Reports with auto-refresh sync every 30 minutes
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Switch
          checked={syncInfo.autoRefresh || false}
          onCheckedChange={handleToggleAutoRefresh}
          disabled={isLoading || (!syncInfo.autoRefresh && autoRefreshLimit.remaining <= 0)}
        />
      </div>
    </div>
  );
}

export default memo(ReportSyncStatusInner);

// Компактный компонент только для тумблера auto-refresh
export function AutoRefreshToggle({
  reportId,
  projectId,
}: {
  reportId: string;
  projectId: string;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const syncInfo = useSelector(selectReportSyncInfo(projectId, reportId));
  const autoRefreshLimit = useSelector(selectAutoRefreshLimit);
  const isLoading = useSelector(selectSyncStatusLoading(reportId));

  const handleToggle = useCallback(() => {
    const newEnabled = !syncInfo?.autoRefresh;
    if (newEnabled && autoRefreshLimit.remaining <= 0) {
      toast({
        title: "Limit reached",
        description: `Used ${autoRefreshLimit.current} of ${autoRefreshLimit.limit} slots.`,
        variant: "destructive",
      });
      return;
    }
    dispatch(toggleAutoRefreshThunk({ reportId, enabled: newEnabled }));
  }, [dispatch, reportId, syncInfo?.autoRefresh, autoRefreshLimit, toast]);

  if (!syncInfo) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${syncInfo.autoRefresh ? 'text-green-500' : 'text-muted-foreground'}`} />
            <Switch
              checked={syncInfo.autoRefresh || false}
              onCheckedChange={handleToggle}
              disabled={isLoading || (!syncInfo.autoRefresh && autoRefreshLimit.remaining <= 0)}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{syncInfo.autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}</p>
          <p className="text-xs text-muted-foreground">
            Слотов: {autoRefreshLimit.current}/{autoRefreshLimit.limit}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Компактный бейдж статуса для списка отчётов
export function SyncStatusBadge({ status, syncProgress }: { status: ReportStatus; syncProgress?: number }) {
  const variants: Record<ReportStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    syncing: 'secondary',
    ready: 'default',
    extending: 'secondary',
    error: 'destructive',
    deleted: 'outline',
  };

  return (
    <Badge variant={variants[status]} className="gap-1">
      <StatusIcon status={status} />
      <span className="text-xs">{getStatusText(status, syncProgress)}</span>
    </Badge>
  );
}
