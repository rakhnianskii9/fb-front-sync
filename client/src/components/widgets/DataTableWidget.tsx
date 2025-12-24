/**
 * DataTableWidget — виджет таблицы данных
 * 
 * Использует useWidgetCache для независимого кэширования
 * Поддерживает сортировку, поиск, пагинацию
 */

import { memo, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Search, Image as ImageIcon } from 'lucide-react';
import { WidgetWrapper } from './WidgetWrapper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWidgetCache, type WidgetEntityType } from '@/hooks/useWidgetCache';
import { formatMetricValue } from '@/lib/formatters';
import { formatMetricName } from '@/data/metrics';
import { cn } from '@/lib/utils';

export interface DataTableWidgetProps {
  /** Заголовок таблицы */
  title: string;
  
  /** ID метрик для колонок */
  metricIds: string[];
  
  /** Тип сущности */
  entityType: WidgetEntityType;
  
  /** ID конкретных сущностей (опционально) */
  entityIds?: string[];
  
  /** Параметры контекста */
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  attribution: string;
  accountIds: string[];
  
  /** Код валюты */
  currencyCode?: string;
  
  /** Высота таблицы */
  height?: 'sm' | 'md' | 'lg' | 'xl';
  
  /** Показывать поиск */
  showSearch?: boolean;
  
  /** Показывать thumbnail (для creatives) */
  showThumbnail?: boolean;
  
  /** Количество строк на страницу */
  pageSize?: number;
  
  /** Классы */
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;
interface SortConfig {
  column: string;
  direction: SortDirection;
}

export const DataTableWidget = memo(function DataTableWidget({
  title,
  metricIds,
  entityType,
  entityIds,
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  attribution,
  accountIds,
  currencyCode = 'USD',
  height = 'lg',
  showSearch = true,
  showThumbnail = false,
  pageSize = 10,
  className,
}: DataTableWidgetProps) {
  const widgetId = `data-table-${entityType}-${metricIds.join('-')}`;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: metricIds[0], direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useWidgetCache({
    widgetId,
    widgetType: 'table',
    entityType,
    metricIds,
    entityIds,
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
  });

  // Преобразуем и фильтруем данные
  const tableData = useMemo(() => {
    if (!data?.byEntity) return [];
    
    let items = Object.values(data.byEntity);
    
    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    }
    
    // Сортировка
    if (sortConfig.column && sortConfig.direction) {
      items.sort((a, b) => {
        const aVal = a.metrics[sortConfig.column] ?? 0;
        const bVal = b.metrics[sortConfig.column] ?? 0;
        return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }
    
    return items;
  }, [data?.byEntity, searchQuery, sortConfig]);

  // Пагинация
  const totalPages = Math.ceil(tableData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tableData.slice(start, start + pageSize);
  }, [tableData, currentPage, pageSize]);

  // Сортировка
  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev.column !== column) {
        return { column, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { column, direction: 'asc' };
      }
      return { column, direction: 'desc' };
    });
  };

  const getSortIcon = (column: string) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === 'desc' 
      ? <ChevronDown className="w-3 h-3" />
      : <ChevronUp className="w-3 h-3" />;
  };

  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={title}
      subtitle={`${tableData.length} ${entityType}s`}
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      onRefresh={() => refetch()}
      className={className}
      height={height}
    >
      <div className="flex flex-col h-full">
        {/* Search */}
        {showSearch && (
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 h-8"
              />
            </div>
          </div>
        )}
        
        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                {showThumbnail && (
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground w-12">
                    
                  </th>
                )}
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">
                  Status
                </th>
                {metricIds.map(metricId => (
                  <th 
                    key={metricId}
                    className="px-3 py-2 text-right font-medium text-muted-foreground cursor-pointer hover:bg-muted-foreground/10"
                    onClick={() => handleSort(metricId)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span className="truncate">{formatMetricName(metricId)}</span>
                      {getSortIcon(metricId)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.length === 0 ? (
                <tr>
                  <td 
                    colSpan={metricIds.length + 2 + (showThumbnail ? 1 : 0)} 
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map(entity => (
                  <tr key={entity.id} className="hover:bg-muted/50">
                    {showThumbnail && (
                      <td className="px-2 py-2">
                        {entity.thumbnail ? (
                          <img 
                            src={entity.thumbnail} 
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="font-medium truncate max-w-[200px]" title={entity.name}>
                        {entity.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {entity.id}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge 
                        variant={entity.status === 'Active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {entity.status}
                      </Badge>
                    </td>
                    {metricIds.map(metricId => (
                      <td key={metricId} className="px-3 py-2 text-right font-medium">
                        {formatMetricValue(entity.metrics[metricId] ?? 0, metricId, currencyCode)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
});

export default DataTableWidget;
