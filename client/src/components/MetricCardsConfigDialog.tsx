import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, Search } from "lucide-react";
import type { MetricCardConfig, ChartSlotConfig } from "@/store/slices/reportsSlice";
import { metricCategories, findMetricCategory, formatMetricName } from "@/data/metrics";
import { useAppSelector } from "@/store/hooks";
import { selectAvailableMetricIds } from "@/store/selectors";

// Дефолтные метрики для карточек (синхронизировано с DashboardMetricCards)
const DEFAULT_METRIC_CARDS: MetricCardConfig[] = [
  { metricId: 'impressions', order: 0 },
  { metricId: 'unique_clicks', order: 1 },
  { metricId: 'spend', order: 2 },
  { metricId: 'conversions', order: 3 },
  { metricId: 'unique_ctr', order: 4 },
  { metricId: 'cost_per_unique_click', order: 5 },
];

interface MetricCardsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: MetricCardConfig[];
  onSave: (config: MetricCardConfig[]) => void;
  visibleChartSlots?: number[];
  onVisibleChartSlotsChange?: (slots: number[]) => void;
  chartSlots?: ChartSlotConfig[];
}

export default function MetricCardsConfigDialog({
  open,
  onOpenChange,
  currentConfig,
  onSave,
  visibleChartSlots = [0, 1, 2],
  onVisibleChartSlotsChange,
  chartSlots = [],
}: MetricCardsConfigDialogProps) {
  // Используем дефолтные метрики если currentConfig пустой
  const effectiveConfig = currentConfig.length > 0 ? currentConfig : DEFAULT_METRIC_CARDS;
  
  const [selectedMetrics, setSelectedMetrics] = useState<MetricCardConfig[]>(
    effectiveConfig.map(c => ({ ...c })).sort((a, b) => a.order - b.order)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [localVisibleChartSlots, setLocalVisibleChartSlots] = useState<number[]>(visibleChartSlots);

  useEffect(() => {
    if (open) {
      setLocalVisibleChartSlots(visibleChartSlots);
    }
  }, [open, visibleChartSlots]);

  useEffect(() => {
    if (open) {
      // Используем дефолтные метрики если currentConfig пустой
      const config = currentConfig.length > 0 ? currentConfig : DEFAULT_METRIC_CARDS;
      setSelectedMetrics(
        config.map(c => ({ ...c })).sort((a, b) => a.order - b.order)
      );
      setSearchQuery("");
    }
  }, [open, currentConfig]);

  const getMetricName = (metricId: string): string => {
    for (const category of metricCategories) {
      if (category.metrics) {
        const metric = category.metrics.find(m => m.id === metricId);
        if (metric) return metric.name;
      }
      if (category.subcategories) {
        for (const subcategory of category.subcategories) {
          const metric = subcategory.metrics.find(m => m.id === metricId);
          if (metric) return metric.name;
        }
      }
    }
    // Для динамических метрик используем formatMetricName
    return formatMetricName(metricId);
  };

  const isMetricSelected = (metricId: string) => {
    return selectedMetrics.some(m => m.metricId === metricId);
  };

  const toggleMetric = (metricId: string) => {
    if (isMetricSelected(metricId)) {
      setSelectedMetrics(prev => prev.filter(m => m.metricId !== metricId));
    } else {
      const newOrder = selectedMetrics.length;
      setSelectedMetrics(prev => [...prev, { metricId, order: newOrder }]);
    }
  };

  const moveMetricUp = (index: number) => {
    if (index === 0) return;
    const newMetrics = [...selectedMetrics];
    [newMetrics[index - 1], newMetrics[index]] = [newMetrics[index], newMetrics[index - 1]];
    // Update order values
    newMetrics.forEach((m, i) => m.order = i);
    setSelectedMetrics(newMetrics);
  };

  const moveMetricDown = (index: number) => {
    if (index === selectedMetrics.length - 1) return;
    const newMetrics = [...selectedMetrics];
    [newMetrics[index], newMetrics[index + 1]] = [newMetrics[index + 1], newMetrics[index]];
    // Update order values
    newMetrics.forEach((m, i) => m.order = i);
    setSelectedMetrics(newMetrics);
  };

  const handleClear = () => {
    setSelectedMetrics([]);
  };

  const handleSave = () => {
    onSave(selectedMetrics);
    if (onVisibleChartSlotsChange) {
      onVisibleChartSlotsChange(localVisibleChartSlots);
    }
    onOpenChange(false);
  };

  const toggleChartSlot = (slotIndex: number) => {
    setLocalVisibleChartSlots(prev => {
      if (prev.includes(slotIndex)) {
        return prev.filter(i => i !== slotIndex);
      } else {
        return [...prev, slotIndex].sort();
      }
    });
  };

  const getChartSlotTitle = (slotIndex: number): string => {
    const slot = chartSlots.find(s => s.slotIndex === slotIndex);
    return slot?.title || `Chart ${slotIndex + 1}`;
  };

  // Получаем доступные метрики из Redux (включая динамические из БД)
  const availableMetricIds = useAppSelector(selectAvailableMetricIds);

  // Собираем все ID базовых метрик
  const predefinedMetricIds = useMemo(() => {
    const ids = new Set<string>();
    metricCategories.forEach(category => {
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          subcategory.metrics.forEach(m => ids.add(m.id));
        });
      }
      if (category.metrics) {
        category.metrics.forEach(m => ids.add(m.id));
      }
    });
    return ids;
  }, []);

  // Категории с динамическими метриками
  const categoriesWithDynamic = useMemo(() => {
    if (availableMetricIds.length === 0) return metricCategories;

    // Группируем динамические метрики по категориям через patterns
    const dynamicByCategory: Record<string, Record<string, Array<{ id: string; name: string }>>> = {};

    availableMetricIds.forEach(metricId => {
      // Пропускаем базовые метрики — они уже есть в категориях
      if (predefinedMetricIds.has(metricId)) return;

      // Ищем подходящую категорию по паттернам
      const match = findMetricCategory(metricId);
      if (match) {
        if (!dynamicByCategory[match.categoryId]) {
          dynamicByCategory[match.categoryId] = {};
        }
        if (!dynamicByCategory[match.categoryId][match.subcategoryName]) {
          dynamicByCategory[match.categoryId][match.subcategoryName] = [];
        }
        dynamicByCategory[match.categoryId][match.subcategoryName].push({
          id: metricId,
          name: formatMetricName(metricId),
        });
      }
    });

    return metricCategories.map(category => {
      if (category.id === 'calculated') return category;

      if (category.subcategories) {
        const updatedSubcategories = category.subcategories.map(subcategory => {
          const dynamicMetrics = dynamicByCategory[category.id]?.[subcategory.name] || [];
          return {
            ...subcategory,
            metrics: [...subcategory.metrics, ...dynamicMetrics],
          };
        });

        return {
          ...category,
          subcategories: updatedSubcategories,
        };
      }
      return category;
    });
  }, [availableMetricIds, predefinedMetricIds]);

  // Filter metrics based on search query
  const filteredCategories = categoriesWithDynamic.map(category => {
    if (!searchQuery) return category;

    const lowerQuery = searchQuery.toLowerCase();
    const categoryNameMatches = category.name.toLowerCase().includes(lowerQuery);
    
    // Filter subcategories and their metrics
    if (category.subcategories) {
      const filteredSubcategories = category.subcategories
        .map(subcategory => {
          const subcategoryNameMatches = subcategory.name.toLowerCase().includes(lowerQuery);
          // Include all metrics if category or subcategory name matches
          if (categoryNameMatches || subcategoryNameMatches) {
            return subcategory;
          }
          // Otherwise filter by metric names
          return {
            ...subcategory,
            metrics: subcategory.metrics.filter(metric =>
              metric.name.toLowerCase().includes(lowerQuery) ||
              metric.id.toLowerCase().includes(lowerQuery)
            )
          };
        })
        .filter(subcategory => subcategory.metrics.length > 0);
      
      return {
        ...category,
        subcategories: filteredSubcategories
      };
    }
    
    // Filter direct metrics
    if (category.metrics) {
      // Include all metrics if category name matches
      if (categoryNameMatches) {
        return category;
      }
      // Otherwise filter by metric names
      const filteredMetrics = category.metrics.filter(metric =>
        metric.name.toLowerCase().includes(lowerQuery) ||
        metric.id.toLowerCase().includes(lowerQuery)
      );
      
      return {
        ...category,
        metrics: filteredMetrics
      };
    }
    
    return category;
  }).filter(category => {
    // Only show categories that have metrics after filtering
    const hasMetrics = category.subcategories 
      ? category.subcategories.some(sub => sub.metrics.length > 0)
      : category.metrics && category.metrics.length > 0;
    return hasMetrics;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col" data-testid="dialog-metric-cards-config">
        <DialogHeader className="mb-6">
          <DialogTitle>Configure Dashboard Metric Cards & Charts</DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto">
          {/* Chart visibility controls */}
          {chartSlots.length > 0 && (
            <div className="border-b pb-4 mb-4">
              <Label className="text-sm font-medium mb-4 block">Visible Charts</Label>
              <div className="flex flex-wrap gap-6">
                {chartSlots.map(slot => (
                  <div key={slot.slotIndex} className="flex items-start gap-2">
                    <Checkbox
                      id={`chart-slot-${slot.slotIndex}`}
                      checked={localVisibleChartSlots.includes(slot.slotIndex)}
                      onCheckedChange={() => toggleChartSlot(slot.slotIndex)}
                      data-testid={`checkbox-chart-slot-${slot.slotIndex}`}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`chart-slot-${slot.slotIndex}`}
                      className="cursor-pointer"
                    >
                      <div className="text-sm font-medium leading-tight">
                        Chart {slot.slotIndex + 1}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Default {slot.title}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left panel: Available metrics */}
            <div className="space-y-2">
              <Label>Available Metrics</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-metrics"
                />
              </div>
              <ScrollArea className="h-[350px] border rounded-md p-4">
                <div className="space-y-4 [&>*:first-child]:-mt-4">
                {filteredCategories.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    No metrics found matching "{searchQuery}"
                  </div>
                )}
                {filteredCategories.map((category) => {
                  const hasMetrics = category.subcategories 
                    ? category.subcategories.some(sub => sub.metrics.length > 0)
                    : category.metrics && category.metrics.length > 0;
                  
                  if (!hasMetrics) return null;
                  
                  return (
                    <div key={category.id}>
                      <h4 className="font-semibold text-sm mb-3 text-foreground">{category.name}</h4>
                      <div className="space-y-3 [&>*:first-child]:-mt-3">
                        {category.subcategories ? (
                          category.subcategories.map((subcategory) => {
                            if (subcategory.metrics.length === 0) return null;
                            return (
                              <div key={subcategory.name} className="ml-3">
                                <h5 className="font-medium text-sm mb-2 text-foreground">{subcategory.name}</h5>
                                <div className="space-y-1.5">
                                  {subcategory.metrics.map((metric) => (
                                    <div key={metric.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`metric-${metric.id}`}
                                        checked={isMetricSelected(metric.id)}
                                        onCheckedChange={() => toggleMetric(metric.id)}
                                        data-testid={`checkbox-metric-${metric.id}`}
                                      />
                                      <Label
                                        htmlFor={`metric-${metric.id}`}
                                        className="text-sm font-normal cursor-pointer"
                                      >
                                        {metric.name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        ) : category.metrics ? (
                          category.metrics.map((metric) => (
                            <div key={metric.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`metric-${metric.id}`}
                                checked={isMetricSelected(metric.id)}
                                onCheckedChange={() => toggleMetric(metric.id)}
                                data-testid={`checkbox-metric-${metric.id}`}
                              />
                              <Label
                                htmlFor={`metric-${metric.id}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {metric.name}
                              </Label>
                            </div>
                          ))
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right panel: Selected metrics with ordering */}
          <div className="space-y-2">
            <Label>Selected Cards ({selectedMetrics.length})</Label>
            <ScrollArea className="h-[350px] border rounded-md p-4">
              {selectedMetrics.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No metrics selected. Select metrics from the left panel.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedMetrics.map((metricCard, index) => (
                    <div
                      key={metricCard.metricId}
                      className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                      data-testid={`selected-metric-${metricCard.metricId}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-6">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-medium">
                          {getMetricName(metricCard.metricId)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveMetricUp(index)}
                          disabled={index === 0}
                          data-testid={`button-move-up-${metricCard.metricId}`}
                          className="h-8 w-8 p-0"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveMetricDown(index)}
                          disabled={index === selectedMetrics.length - 1}
                          data-testid={`button-move-down-${metricCard.metricId}`}
                          className="h-8 w-8 p-0"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClear}
            data-testid="button-clear-metric-cards-config"
          >
            Clear
          </Button>
          <Button
            onClick={handleSave}
            data-testid="button-save-metric-cards-config"
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
