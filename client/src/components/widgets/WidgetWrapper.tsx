/**
 * WidgetWrapper — базовая обёртка для всех виджетов
 * 
 * Предоставляет:
 * - Карточку с заголовком и действиями
 * - Loading состояние
 * - Error состояние
 * - Refresh функционал
 */

import { ReactNode, memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertCircle, Settings, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WidgetWrapperProps {
  /** Уникальный ID виджета */
  widgetId: string;
  
  /** Заголовок виджета */
  title: string;
  
  /** Подзаголовок (опционально) */
  subtitle?: string;
  
  /** Состояние загрузки */
  isLoading?: boolean;
  
  /** Состояние ошибки */
  isError?: boolean;
  
  /** Текст ошибки */
  errorMessage?: string;
  
  /** Функция обновления */
  onRefresh?: () => void;
  
  /** Функция настройки */
  onConfigure?: () => void;
  
  /** Функция удаления */
  onRemove?: () => void;
  
  /** Можно ли перетаскивать */
  isDraggable?: boolean;
  
  /** Классы контейнера */
  className?: string;
  
  /** Классы контента */
  contentClassName?: string;
  
  /** Контент виджета */
  children: ReactNode;
  
  /** Высота виджета */
  height?: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
  
  /** Показывать ли header */
  showHeader?: boolean;
  
  /** Дополнительные действия в header (alias для headerAction) */
  headerActions?: ReactNode;
  
  /** Дополнительные действия в header (alias для headerActions) */
  headerAction?: ReactNode;
  
  /** Ошибка (альтернатива isError + errorMessage) */
  error?: Error | string | null;
}

const heightClasses = {
  auto: '',
  sm: 'h-[200px]',
  md: 'h-[300px]',
  lg: 'h-[400px]',
  xl: 'h-[500px]',
};

/**
 * Skeleton для загрузки виджета
 */
function WidgetSkeleton({ height = 'md' }: { height?: WidgetWrapperProps['height'] }) {
  return (
    <div className={cn('space-y-3', heightClasses[height || 'md'])}>
      <Skeleton className="h-4 w-[60%]" />
      <Skeleton className="h-4 w-[80%]" />
      <Skeleton className="h-4 w-[40%]" />
      <div className="flex-1">
        <Skeleton className="h-full w-full min-h-[100px]" />
      </div>
    </div>
  );
}

/**
 * Состояние ошибки виджета
 */
function WidgetError({ 
  message = 'Failed to load widget', 
  onRetry 
}: { 
  message?: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center p-4">
      <AlertCircle className="w-10 h-10 text-destructive mb-3" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Базовая обёртка виджета
 */
export const WidgetWrapper = memo(function WidgetWrapper({
  widgetId,
  title,
  subtitle,
  isLoading = false,
  isError = false,
  errorMessage,
  error,
  onRefresh,
  onConfigure,
  onRemove,
  isDraggable = false,
  className,
  contentClassName,
  children,
  height = 'auto',
  showHeader = true,
  headerActions,
  headerAction,
}: WidgetWrapperProps) {
  // Нормализация error prop
  const hasError = isError || Boolean(error);
  const errorMsg = errorMessage || (error instanceof Error ? error.message : error) || 'Failed to load widget';
  
  // Объединение headerActions и headerAction
  const allHeaderActions = headerActions || headerAction;
  
  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-shadow hover:shadow-md',
        heightClasses[height],
        className
      )}
      data-testid={`widget-${widgetId}`}
    >
      {showHeader && (
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            {isDraggable && (
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
            )}
            <div>
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {allHeaderActions}
            
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRefresh}
                disabled={isLoading}
                data-testid={`widget-refresh-${widgetId}`}
              >
                <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
              </Button>
            )}
            
            {onConfigure && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onConfigure}
                data-testid={`widget-configure-${widgetId}`}
              >
                <Settings className="w-3 h-3" />
              </Button>
            )}
            
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                data-testid={`widget-remove-${widgetId}`}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={cn('pt-0', contentClassName)}>
        {isLoading ? (
          <WidgetSkeleton height={height} />
        ) : hasError ? (
          <WidgetError message={errorMsg} onRetry={onRefresh} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
});

export default WidgetWrapper;
