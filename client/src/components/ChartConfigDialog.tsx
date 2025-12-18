import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import logger from "@/lib/logger";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ArrowUp, ArrowDown, Sparkles, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ChartSlotConfig, ChartType } from "@/store/slices/reportsSlice";
import { metricCategories, formatMetricName, findMetricCategory } from "@/data/metrics";
import { getPresetsByChartType, type MetricPreset } from "@/lib/metricPresets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";
import { selectAvailableMetricIds } from "@/store/selectors";

interface ChartConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotIndex: number;
  currentConfig: ChartSlotConfig | null;
  onSave: (config: ChartSlotConfig) => void;
}

function ChartConfigDialogInner({
  open,
  onOpenChange,
  slotIndex,
  currentConfig,
  onSave,
}: ChartConfigDialogProps) {
  const [title, setTitle] = useState(currentConfig?.title || `Chart ${slotIndex + 1}`);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(currentConfig?.metrics || []);
  const [showLegend, setShowLegend] = useState(currentConfig?.showLegend ?? true);
  const [showGrid, setShowGrid] = useState(currentConfig?.showGrid ?? true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChartType, setSelectedChartType] = useState<ChartType | undefined>(currentConfig?.chartType);
  const [presetsOpen, setPresetsOpen] = useState(false);
  
  const availableMetricIds = useAppSelector(selectAvailableMetricIds);

  // Set для быстрой проверки доступности метрики
  const availableMetricIdsSet = useMemo(
    () => new Set(availableMetricIds),
    [availableMetricIds]
  );

  // Проверка доступности метрики
  const isMetricAvailable = (metricId: string): boolean => {
    return availableMetricIdsSet.has(metricId);
  };

  // Memoize predefined IDs to avoid duplicates
  const predefinedMetricIds = useMemo(() => {
    const ids = new Set<string>();
    metricCategories.forEach(category => {
      if (category.subcategories) {
        category.subcategories.forEach(sub => {
          sub.metrics.forEach(m => ids.add(m.id));
        });
      }
      if (category.metrics) {
        category.metrics.forEach(m => ids.add(m.id));
      }
    });
    return ids;
  }, []);

  // Фильтруем категории — показываем только метрики, которые реально есть в БД
  // + добавляем динамические метрики по паттернам
  const extendedMetricCategories = useMemo(() => {
    // Если данные не загружены — показываем все базовые метрики
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
      if (category.subcategories) {
        const filteredSubcategories = category.subcategories
          .map(subcategory => {
            // Базовые метрики — фильтруем по availableMetricIds
            const baseMetrics = subcategory.metrics.filter(m => isMetricAvailable(m.id));
            // Динамические метрики из БД для этой субкатегории
            const dynamicMetrics = dynamicByCategory[category.id]?.[subcategory.name] || [];
            
            return {
              ...subcategory,
              metrics: [...baseMetrics, ...dynamicMetrics],
            };
          })
          .filter(subcategory => subcategory.metrics.length > 0);
        
        return {
          ...category,
          subcategories: filteredSubcategories,
        };
      } else if (category.metrics) {
        return {
          ...category,
          metrics: category.metrics.filter(m => isMetricAvailable(m.id)),
        };
      }
      return category;
    }).filter(category => {
      if (category.subcategories) return category.subcategories.length > 0;
      if (category.metrics) return category.metrics.length > 0;
      return false;
    });
  }, [availableMetricIds, predefinedMetricIds, availableMetricIdsSet]);
  
  // Отслеживаем предыдущее состояние open для сброса только при открытии диалога
  const prevOpenRef = useRef(open);

  useEffect(() => {
    // Сбрасываем состояние только когда диалог ОТКРЫВАЕТСЯ (переход false -> true)
    if (open && !prevOpenRef.current) {
      setTitle(currentConfig?.title || `Chart ${slotIndex + 1}`);
      setSelectedMetrics(currentConfig?.metrics || []);
      setShowLegend(currentConfig?.showLegend ?? true);
      setShowGrid(currentConfig?.showGrid ?? true);
      setSearchQuery("");
      setSelectedChartType(currentConfig?.chartType);
      setPresetsOpen(false);
    }
    prevOpenRef.current = open;
  }, [open, slotIndex, currentConfig]);

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const getMetricName = (metricId: string): string => {
    for (const category of extendedMetricCategories) {
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
    return metricId;
  };

  const moveMetricUp = (index: number) => {
    if (index === 0) return;
    const newMetrics = [...selectedMetrics];
    [newMetrics[index - 1], newMetrics[index]] = [newMetrics[index], newMetrics[index - 1]];
    setSelectedMetrics(newMetrics);
  };

  const moveMetricDown = (index: number) => {
    if (index === selectedMetrics.length - 1) return;
    const newMetrics = [...selectedMetrics];
    [newMetrics[index], newMetrics[index + 1]] = [newMetrics[index + 1], newMetrics[index]];
    setSelectedMetrics(newMetrics);
  };

  const applyPreset = (preset: MetricPreset) => {
    logger.log('[ChartConfigDialog] applyPreset called', { preset: preset.id, metrics: preset.metrics.length });
    setSelectedMetrics(preset.metrics);
    setTitle(preset.name);
    logger.log('[ChartConfigDialog] applyPreset completed');
  };

  const handleClear = () => {
    setSelectedMetrics([]);
    setTitle(`Chart ${slotIndex + 1}`);
    setSelectedChartType(undefined);
  };

  const handleSave = () => {
    const config: ChartSlotConfig = {
      slotIndex,
      metrics: selectedMetrics,
      title,
      showLegend,
      showGrid,
      chartType: selectedChartType,
    };
    onSave(config);
    onOpenChange(false);
  };

  // Filter metrics based on search query
  const filteredCategories = extendedMetricCategories.map(category => {
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
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col" data-testid="dialog-chart-config">
        <DialogHeader>
          <DialogTitle>Configure Chart</DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="chart-title">Chart Title</Label>
              <Input
                id="chart-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter chart title"
                data-testid="input-chart-title"
              />
            </div>

            {/* Collapsible Presets Section */}
            <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  data-testid="button-toggle-presets"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">Quick chart and preset selection</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${presetsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chart-type">1. Select chart type</Label>
                  <Select value={selectedChartType} onValueChange={(value: ChartType) => setSelectedChartType(value)}>
                    <SelectTrigger id="chart-type" data-testid="select-chart-type">
                      <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">📈 Line Chart</SelectItem>
                      <SelectItem value="bar">📊 Bar Chart</SelectItem>
                      <SelectItem value="area">🌊 Area Chart</SelectItem>
                      <SelectItem value="pie">🥧 Pie Chart</SelectItem>
                      <SelectItem value="mixed">🔀 Mixed Chart</SelectItem>
                      <SelectItem value="scatter">🎯 Scatter Chart</SelectItem>
                      <SelectItem value="radar">🕸️ Radar Chart</SelectItem>
                      <SelectItem value="funnel">🔻 Funnel Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedChartType && (
                  <div className="space-y-2">
                    <Label>2. Select a preset ({getPresetsByChartType(selectedChartType).length} available)</Label>
                    <ScrollArea className="h-[160px] border rounded-md p-3 bg-muted/20">
                      <div className="space-y-2">
                        {getPresetsByChartType(selectedChartType).map((preset) => (
                          <Button
                            key={preset.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => applyPreset(preset)}
                            className="w-full justify-start h-auto py-3 px-3 hover:bg-primary/10"
                            data-testid={`button-preset-${preset.id}`}
                          >
                            <div className="text-left">
                              <div className="font-medium text-sm">{preset.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    data-testid="input-search-chart-metrics"
                  />
                </div>
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  <div className="space-y-4">
                    {filteredCategories.length === 0 && searchQuery && (
                      <div className="text-center py-8 text-muted-foreground">
                        No metrics found matching "{searchQuery}"
                      </div>
                    )}
                    {filteredCategories.map((category) => {
                      // Skip categories without metrics
                      const hasMetrics = category.subcategories 
                        ? category.subcategories.some(sub => sub.metrics.length > 0)
                        : category.metrics && category.metrics.length > 0;
                      
                      if (!hasMetrics) return null;
                      
                      return (
                        <div key={category.id}>
                          <h4 className="font-semibold text-sm mb-3 text-foreground">{category.name}</h4>
                          <div className="space-y-3">
                            {category.subcategories ? (
                              category.subcategories.map((subcategory) => {
                                if (subcategory.metrics.length === 0) return null;
                                return (
                                  <div key={subcategory.name} className="ml-3">
                                    <h5 className="font-medium text-xs mb-2 text-muted-foreground uppercase tracking-wide">{subcategory.name}</h5>
                                    <div className="space-y-1.5">
                                      {subcategory.metrics.map((metric) => (
                                        <div key={metric.id} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`metric-${metric.id}`}
                                            checked={selectedMetrics.includes(metric.id)}
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
                                    checked={selectedMetrics.includes(metric.id)}
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
                <Label>Selected Metrics ({selectedMetrics.length})</Label>
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  {selectedMetrics.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No metrics selected. Select metrics from the left panel.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedMetrics.map((metricId, index) => (
                        <div
                          key={metricId}
                          className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                          data-testid={`selected-metric-${metricId}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground w-6">
                              #{index + 1}
                            </span>
                            <span className="text-sm font-medium">
                              {getMetricName(metricId)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveMetricUp(index)}
                              disabled={index === 0}
                              data-testid={`button-move-up-${metricId}`}
                              className="h-8 w-8 p-0"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveMetricDown(index)}
                              disabled={index === selectedMetrics.length - 1}
                              data-testid={`button-move-down-${metricId}`}
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-legend">Show Legend</Label>
                <Switch
                  id="show-legend"
                  checked={showLegend}
                  onCheckedChange={setShowLegend}
                  data-testid="switch-show-legend"
                />
              </div>
              {/* Show Grid only for chart types that support it (not pie, radar, funnel) */}
              {selectedChartType !== 'pie' && selectedChartType !== 'radar' && selectedChartType !== 'funnel' && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-grid">Show Grid</Label>
                  <Switch
                    id="show-grid"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                    data-testid="switch-show-grid"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClear}
            data-testid="button-clear-chart-config"
          >
            Clear
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedMetrics.length === 0}
            data-testid="button-save-chart-config"
          >
            Save Chart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default memo(ChartConfigDialogInner);
