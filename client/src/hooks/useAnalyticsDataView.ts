import { useMemo } from 'react';
import { isDerivedMetric, calculateDerivedMetric, isSummableMetric, getMetricDependencies } from '@/lib/metricFormulas';

// Types for Analytics data
export interface AnalyticsItem {
  id: string;
  key: string;
  name: string;
  subtitle?: string;
  status: string;
  thumbnail?: string;
  metrics: Record<string, number>;
}

export interface AnalyticsDateRow {
  id: string;
  date: string;
  items: AnalyticsItem[];
  metrics: Record<string, number>;
}

// Filter condition types
export interface TextFilterCondition {
  type: 'text';
  operator: 'contains' | 'not-contains' | 'equal';
  value: string;
}

export interface NumericFilterCondition {
  type: 'numeric';
  operator: 'greater' | 'less' | 'equal' | 'between' | 'not-equal';
  value: string;
  valueTo?: string;
}

export interface StatusFilterCondition {
  type: 'status';
  values: string[];
}

export interface DateFilterCondition {
  type: 'date';
  operator: 'before' | 'after' | 'on';
  value: string;
}

export type FilterCondition = TextFilterCondition | NumericFilterCondition | StatusFilterCondition | DateFilterCondition;

export interface ParentFilter {
  operator: 'contains' | 'not-contains' | 'equal';
  values: string[];  // Массив значений для множественного фильтра
}

export interface SortConfig {
  direction: 'asc' | 'desc';
}

export interface AggregatedMetrics {
  [metricId: string]: {
    total: number;
    change?: number | null;
    changePercent?: number | null;
  };
}

export interface AnalyticsDataView {
  filteredTableData: AnalyticsDateRow[];
  filteredPreviousPeriodData?: AnalyticsDateRow[];
  visibleItems: AnalyticsItem[];
  aggregatedMetrics: AggregatedMetrics;
  filteredItemIds: string[]; // filtered element IDs for charts
  totalRows: number;
  selectedRows: number;
}

interface UseAnalyticsDataViewProps {
  tableData: AnalyticsDateRow[];
  columnConditions: Record<string, FilterCondition | null>;
  columnSorts: Record<string, SortConfig | null>;
  checkedItems: Set<string>;
  checkedDates: Set<string>;
  parentFilter?: ParentFilter | null;
  parentDisplay?: string;
  globalSearch?: string;
  getParentInfo?: (itemId: string) => { value: string } | null;
  selectedMetrics?: string[];
  filterMode?: 'selection' | 'all'; // selection: only selected rows, all: entire filtered table
  previousPeriodData?: AnalyticsDateRow[]; // data for previous period (Period B)
}

/**
 * Centralized hook for managing Analytics data
 * Combines filtering, sorting, aggregation and data preparation for visualizations
 */
export function useAnalyticsDataView({
  tableData,
  columnConditions,
  columnSorts,
  checkedItems,
  checkedDates,
  parentFilter,
  parentDisplay = 'none',
  globalSearch = '',
  getParentInfo,
  selectedMetrics = [],
  filterMode = 'all',
  previousPeriodData,
}: UseAnalyticsDataViewProps): AnalyticsDataView {
  
  // Stable Set snapshots for memoization
  // Use sorted string for reliable content change tracking
  const checkedItemsKey = Array.from(checkedItems).sort().join('|');
  const checkedDatesKey = Array.from(checkedDates).sort().join('|');
  
  const checkedItemsArray = useMemo(() => Array.from(checkedItems), [checkedItemsKey]);
  const checkedDatesArray = useMemo(() => Array.from(checkedDates), [checkedDatesKey]);
  
  // Apply filters to table data
  const filteredTableData = useMemo(() => {
    let result = [...tableData];

    // Apply date sorting if exists
    const dateSort = columnSorts['date'];
    if (dateSort) {
      result = [...result].sort((a, b) => {
        // Parse DD.MM.YYYY format for proper date comparison
        const [aDay, aMonth, aYear] = a.date.split('.').map(Number);
        const [bDay, bMonth, bYear] = b.date.split('.').map(Number);
        const aDate = new Date(aYear, aMonth - 1, aDay).getTime();
        const bDate = new Date(bYear, bMonth - 1, bDay).getTime();
        return dateSort.direction === 'asc' 
          ? aDate - bDate 
          : bDate - aDate;
      });
    }

    // Apply date condition if exists
    const dateCondition = columnConditions['date'];
    if (dateCondition) {
      if (dateCondition.type === 'date') {
        result = result.filter(dateRow => {
          // Parse DD.MM.YYYY format
          const [day, month, year] = dateRow.date.split('.').map(Number);
          const rowDate = new Date(year, month - 1, day);
          const filterDate = new Date(dateCondition.value);
          
          // Reset times to compare just dates
          rowDate.setHours(0, 0, 0, 0);
          filterDate.setHours(0, 0, 0, 0);
          
          switch (dateCondition.operator) {
            case 'before':
              return rowDate < filterDate;
            case 'after':
              return rowDate > filterDate;
            case 'on':
              return rowDate.getTime() === filterDate.getTime();
            default:
              return true;
          }
        });
      } else if (dateCondition.type === 'text') {
        result = result.filter(dateRow => {
          const date = dateRow.date.toLowerCase();
          const value = String(dateCondition.value).toLowerCase();
          
          switch (dateCondition.operator) {
            case 'contains':
              return date.includes(value);
            case 'not-contains':
              return !date.includes(value);
            case 'equal':
              return date === value;
            default:
              return true;
          }
        });
      }
    }

    // Apply mode filter (only selected dates or all)
    if (filterMode === 'selection' && checkedDatesArray.length > 0) {
      result = result.filter(dateRow => checkedDatesArray.includes(dateRow.id));
    }

    // Apply metric filtering at date level (BEFORE processing items)
    // Use ORIGINAL dateRow metrics, not recalculated
    Object.entries(columnConditions).forEach(([columnId, condition]) => {
      if (columnId === 'date' || columnId === 'status' || !condition) return;
      
      if (condition.type === 'numeric') {
        result = result.filter(dateRow => {
          const value = dateRow.metrics[columnId] || 0;
          const filterValue = Number(condition.value);
          
          // Round for comparison (precision to 2 decimal places)
          const roundedValue = Math.round(value * 100) / 100;
          const roundedFilterValue = Math.round(filterValue * 100) / 100;
          
          switch (condition.operator) {
            case 'greater':
              return value > filterValue;
            case 'less':
              return value < filterValue;
            case 'equal':
              return roundedValue === roundedFilterValue;
            case 'not-equal':
              return roundedValue !== roundedFilterValue;
            case 'between':
              const filterValueTo = Number(condition.valueTo);
              return value >= filterValue && value <= filterValueTo;
            default:
              return true;
          }
        });
      }
    });

    const processedData = result.map(dateRow => {
      let filteredItems = [...dateRow.items];

      // Apply global search
      if (globalSearch && globalSearch.trim()) {
        const searchLower = globalSearch.toLowerCase().trim();
        filteredItems = filteredItems.filter(item =>
          item.name.toLowerCase().includes(searchLower) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(searchLower))
        );
      }

      // Apply status conditions
      const statusCondition = columnConditions['status'];
      if (statusCondition && statusCondition.type === 'status' && statusCondition.values) {
        filteredItems = filteredItems.filter(item => 
          statusCondition.values!.includes(item.status)
        );
      }

      // Apply parent filter if exists
      if (parentFilter && parentFilter.values.length > 0 && parentDisplay !== 'none' && getParentInfo) {
        filteredItems = filteredItems.filter(item => {
          const parentInfo = getParentInfo(item.id);
          if (!parentInfo) return false;
          const parentValue = parentInfo.value.toLowerCase();
          
          switch (parentFilter.operator) {
            case 'contains':
              // Любое из значений должно содержаться в parent
              return parentFilter.values.some(v => parentValue.includes(v.toLowerCase()));
            case 'not-contains':
              // Ни одно из значений не должно содержаться в parent
              return parentFilter.values.every(v => !parentValue.includes(v.toLowerCase()));
            case 'equal':
              // Parent должен быть равен любому из значений
              return parentFilter.values.some(v => parentValue === v.toLowerCase());
            default:
              return true;
          }
        });
      }

      // Apply sorting for metrics
      Object.entries(columnSorts).forEach(([columnId, sort]) => {
        if (columnId === 'date' || columnId === 'status' || !sort) return;
        filteredItems = [...filteredItems].sort((a, b) => {
          const aVal = a.metrics[columnId] || 0;
          const bVal = b.metrics[columnId] || 0;
          return sort.direction === 'desc' ? bVal - aVal : aVal - bVal;
        });
      });

      // Apply filters (text and numeric) to items
      Object.entries(columnConditions).forEach(([columnId, condition]) => {
        if (columnId === 'date' || columnId === 'status' || !condition) return;
        
        // Text filters apply to item names
        if (condition.type === 'text') {
          filteredItems = filteredItems.filter(item => {
            const itemName = item.name.toLowerCase();
            const filterValue = String(condition.value).toLowerCase();
            
            switch (condition.operator) {
              case 'contains':
                return itemName.includes(filterValue);
              case 'not-contains':
                return !itemName.includes(filterValue);
              case 'equal':
                return itemName === filterValue;
              default:
                return true;
            }
          });
        }
        
        // Numeric filters apply to item metrics
        if (condition.type === 'numeric') {
          filteredItems = filteredItems.filter(item => {
            const value = item.metrics[columnId] || 0;
            const filterValue = Number(condition.value);
            
            // Round for comparison (precision to 2 decimal places)
            const roundedValue = Math.round(value * 100) / 100;
            const roundedFilterValue = Math.round(filterValue * 100) / 100;
            
            switch (condition.operator) {
              case 'greater':
                return value > filterValue;
              case 'less':
                return value < filterValue;
              case 'equal':
                return roundedValue === roundedFilterValue;
              case 'not-equal':
                return roundedValue !== roundedFilterValue;
              case 'between':
                const filterValueTo = Number(condition.valueTo);
                return value >= filterValue && value <= filterValueTo;
              default:
                return true;
            }
          });
        }
      });

      // Apply mode filter (only selected elements or all)
      if (filterMode === 'selection' && checkedItemsArray.length > 0) {
        filteredItems = filteredItems.filter(item => checkedItemsArray.includes(item.key));
      }

      // Recalculate aggregated metrics based on filtered elements
      // Collect all metrics from items
      const allMetricIds = new Set<string>();
      filteredItems.forEach(item => {
        Object.keys(item.metrics).forEach(metricId => allMetricIds.add(metricId));
      });
      
      // Collect dependencies for derived metrics
      const allNeededMetrics = new Set<string>();
      allMetricIds.forEach(metricId => {
        if (isDerivedMetric(metricId)) {
          getMetricDependencies(metricId).forEach(dep => allNeededMetrics.add(dep));
        } else {
          allNeededMetrics.add(metricId);
        }
      });
      
      // Sum ONLY base metrics
      const baseMetrics: Record<string, number> = {};
      allNeededMetrics.forEach(metricId => {
        baseMetrics[metricId] = 0;
      });
      
      filteredItems.forEach(item => {
        allNeededMetrics.forEach(metricId => {
          if (isSummableMetric(metricId) && item.metrics[metricId] !== undefined) {
            baseMetrics[metricId] = (baseMetrics[metricId] || 0) + item.metrics[metricId];
          }
        });
      });
      
      // Calculate derived metrics
      const aggregatedMetrics: Record<string, number> = {};
      allMetricIds.forEach(metricId => {
        if (isDerivedMetric(metricId)) {
          const calculated = calculateDerivedMetric(metricId, baseMetrics);
          aggregatedMetrics[metricId] = calculated !== null ? calculated : 0;
        } else {
          aggregatedMetrics[metricId] = baseMetrics[metricId] || 0;
        }
      });

      return {
        ...dateRow,
        items: filteredItems,
        metrics: aggregatedMetrics,
      };
    });
    
    // Apply metric sorting to date rows (after metrics are recalculated)
    let sortedResult = processedData;
    Object.entries(columnSorts).forEach(([columnId, sort]) => {
      if (columnId === 'date' || columnId === 'status' || !sort) return;
      sortedResult = [...sortedResult].sort((a, b) => {
        const aVal = a.metrics[columnId] || 0;
        const bVal = b.metrics[columnId] || 0;
        return sort.direction === 'desc' ? bVal - aVal : aVal - bVal;
      });
    });
    
    return sortedResult;
  }, [
    tableData,
    columnConditions,
    columnSorts,
    checkedItemsArray,
    checkedDatesArray,
    parentFilter,
    parentDisplay,
    globalSearch,
    getParentInfo,
    filterMode,
  ]);

  // Apply filters to previous period data
  const filteredPreviousPeriodData = useMemo(() => {
    if (!previousPeriodData) return undefined;

    // Extract checked item IDs from current period data
    const checkedItemIds = new Set<string>();
    if (filterMode === 'selection') {
      filteredTableData.forEach(row => {
        row.items.forEach(item => {
          if (checkedItems.has(item.key)) {
            checkedItemIds.add(item.id);
          }
        });
      });
    }

    return previousPeriodData.map(dateRow => {
      let filteredItems = [...dateRow.items];

      // Apply global search
      if (globalSearch && globalSearch.trim()) {
        const searchLower = globalSearch.toLowerCase().trim();
        filteredItems = filteredItems.filter(item =>
          item.name.toLowerCase().includes(searchLower) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(searchLower))
        );
      }

      // Apply status conditions
      const statusCondition = columnConditions['status'];
      if (statusCondition && statusCondition.type === 'status' && statusCondition.values) {
        filteredItems = filteredItems.filter(item => 
          statusCondition.values!.includes(item.status)
        );
      }

      // Apply parent filter if exists
      if (parentFilter && parentFilter.values.length > 0 && parentDisplay !== 'none' && getParentInfo) {
        filteredItems = filteredItems.filter(item => {
          const parentInfo = getParentInfo(item.id);
          if (!parentInfo) return false;
          const parentValue = parentInfo.value.toLowerCase();
          
          switch (parentFilter.operator) {
            case 'contains':
              // Любое из значений должно содержаться в parent
              return parentFilter.values.some(v => parentValue.includes(v.toLowerCase()));
            case 'not-contains':
              // Ни одно из значений не должно содержаться в parent
              return parentFilter.values.every(v => !parentValue.includes(v.toLowerCase()));
            case 'equal':
              // Parent должен быть равен любому из значений
              return parentFilter.values.some(v => parentValue === v.toLowerCase());
            default:
              return true;
          }
        });
      }

      // Apply filters (text and numeric) to items
      Object.entries(columnConditions).forEach(([columnId, condition]) => {
        if (columnId === 'date' || columnId === 'status' || !condition) return;
        
        if (condition.type === 'text') {
          filteredItems = filteredItems.filter(item => {
            const itemName = item.name.toLowerCase();
            const filterValue = String(condition.value).toLowerCase();
            
            switch (condition.operator) {
              case 'contains':
                return itemName.includes(filterValue);
              case 'not-contains':
                return !itemName.includes(filterValue);
              case 'equal':
                return itemName === filterValue;
              default:
                return true;
            }
          });
        }
        
        // Numeric filters apply to item metrics
        if (condition.type === 'numeric') {
          filteredItems = filteredItems.filter(item => {
            const value = item.metrics[columnId] || 0;
            const filterValue = Number(condition.value);
            
            const roundedValue = Math.round(value * 100) / 100;
            const roundedFilterValue = Math.round(filterValue * 100) / 100;
            
            switch (condition.operator) {
              case 'greater':
                return value > filterValue;
              case 'less':
                return value < filterValue;
              case 'equal':
                return roundedValue === roundedFilterValue;
              case 'not-equal':
                return roundedValue !== roundedFilterValue;
              case 'between':
                const filterValueTo = Number(condition.valueTo);
                return value >= filterValue && value <= filterValueTo;
              default:
                return true;
            }
          });
        }
      });

      // Apply mode filter (only selected elements)
      if (filterMode === 'selection' && checkedItemIds.size > 0) {
        filteredItems = filteredItems.filter(item => checkedItemIds.has(item.id));
      }

      // Recalculate aggregated metrics based on filtered elements
      const allMetricIds = new Set<string>();
      filteredItems.forEach(item => {
        Object.keys(item.metrics).forEach(metricId => allMetricIds.add(metricId));
      });
      
      const allNeededMetrics = new Set<string>();
      allMetricIds.forEach(metricId => {
        if (isDerivedMetric(metricId)) {
          getMetricDependencies(metricId).forEach(dep => allNeededMetrics.add(dep));
        } else {
          allNeededMetrics.add(metricId);
        }
      });
      
      const baseMetrics: Record<string, number> = {};
      allNeededMetrics.forEach(metricId => {
        baseMetrics[metricId] = 0;
      });
      
      filteredItems.forEach(item => {
        allNeededMetrics.forEach(metricId => {
          if (isSummableMetric(metricId) && item.metrics[metricId] !== undefined) {
            baseMetrics[metricId] = (baseMetrics[metricId] || 0) + item.metrics[metricId];
          }
        });
      });
      
      const aggregatedMetrics: Record<string, number> = {};
      allMetricIds.forEach(metricId => {
        if (isDerivedMetric(metricId)) {
          const calculated = calculateDerivedMetric(metricId, baseMetrics);
          aggregatedMetrics[metricId] = calculated !== null ? calculated : 0;
        } else {
          aggregatedMetrics[metricId] = baseMetrics[metricId] || 0;
        }
      });

      return {
        ...dateRow,
        items: filteredItems,
        metrics: aggregatedMetrics,
      };
    });
  }, [
    previousPeriodData,
    filteredTableData,
    checkedItems,
    filterMode,
    columnConditions,
    parentFilter,
    parentDisplay,
    globalSearch,
    getParentInfo,
  ]);

  // Extract all visible items from filtered data
  const visibleItems = useMemo(() => {
    const items: AnalyticsItem[] = [];
    filteredTableData.forEach(dateRow => {
      items.push(...dateRow.items);
    });
    return items;
  }, [filteredTableData]);

  // Calculate aggregated metrics for cards
  const aggregatedMetrics = useMemo(() => {
    // Collect all metrics
    const allMetricIds = new Set<string>();
    filteredTableData.forEach(dateRow => {
      Object.keys(dateRow.metrics).forEach(metricId => allMetricIds.add(metricId));
    });
    
    // Collect dependencies for derived metrics
    const allNeededMetrics = new Set<string>();
    allMetricIds.forEach(metricId => {
      if (isDerivedMetric(metricId)) {
        getMetricDependencies(metricId).forEach(dep => allNeededMetrics.add(dep));
      } else {
        allNeededMetrics.add(metricId);
      }
    });
    
    // Sum ONLY base metrics for current period (Period A)
    const baseMetrics: Record<string, number> = {};
    allNeededMetrics.forEach(metricId => {
      baseMetrics[metricId] = 0;
    });
    
    filteredTableData.forEach(dateRow => {
      allNeededMetrics.forEach(metricId => {
        if (isSummableMetric(metricId) && dateRow.metrics[metricId] !== undefined) {
          baseMetrics[metricId] = (baseMetrics[metricId] || 0) + dateRow.metrics[metricId];
        }
      });
    });
    
    // If there is previous period data (Period B), sum it as well
    let previousBaseMetrics: Record<string, number> | null = null;
    if (filteredPreviousPeriodData && filteredPreviousPeriodData.length > 0) {
      previousBaseMetrics = {};
      allNeededMetrics.forEach(metricId => {
        previousBaseMetrics![metricId] = 0;
      });
      
      filteredPreviousPeriodData.forEach(dateRow => {
        allNeededMetrics.forEach(metricId => {
          if (isSummableMetric(metricId) && dateRow.metrics[metricId] !== undefined) {
            previousBaseMetrics![metricId] = (previousBaseMetrics![metricId] || 0) + dateRow.metrics[metricId];
          }
        });
      });
    }
    
    // Calculate derived metrics
    const metrics: AggregatedMetrics = {};
    allMetricIds.forEach(metricId => {
      const currentTotal = isDerivedMetric(metricId)
        ? calculateDerivedMetric(metricId, baseMetrics) || 0
        : baseMetrics[metricId] || 0;
      
      let change: number | null = null;
      let changePercent: number | null = null;
      
      // Calculate change if there is previous period data
      if (previousBaseMetrics) {
        const previousTotal = isDerivedMetric(metricId)
          ? calculateDerivedMetric(metricId, previousBaseMetrics) || 0
          : previousBaseMetrics[metricId] || 0;
        
        change = currentTotal - previousTotal;
        changePercent = previousTotal === 0
          ? (currentTotal > 0 ? 100 : 0)
          : ((currentTotal - previousTotal) / previousTotal) * 100;
      }
      
      metrics[metricId] = { 
        total: currentTotal, 
        change, 
        changePercent 
      };
    });

    return metrics;
  }, [filteredTableData, filteredPreviousPeriodData]);

  // Get list of item IDs for charts (only filtered/selected)
  const filteredItemIds = useMemo(() => {
    return visibleItems.map(item => item.id);
  }, [visibleItems]);

  return {
    filteredTableData,
    filteredPreviousPeriodData,
    visibleItems,
    aggregatedMetrics,
    filteredItemIds,
    totalRows: filteredTableData.length,
    selectedRows: checkedDatesArray.filter(dateId => 
      filteredTableData.some(row => row.id === dateId)
    ).length,
  };
}
