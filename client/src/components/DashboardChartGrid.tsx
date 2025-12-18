import { useState, useEffect, useCallback } from "react";
import ChartSlot from "@/components/ChartSlot";
import ChartConfigDialog from "@/components/ChartConfigDialog";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedReportUpdate } from "@/hooks/useDebouncedReportUpdate";
import { updateVisibleChartSlots } from "@/store/slices/reportsSlice";
import type { Report, ChartSlotConfig, ChartType } from "@/store/slices/reportsSlice";
import type { DateRange } from "react-day-picker";
import type { AnalyticsDataView } from "@/hooks/useAnalyticsDataView";
import type { KommoCrmMetrics } from "@/api/kommo";

interface DashboardChartGridProps {
  report: Report;
  projectId: string;
  periodA?: DateRange;
  periodB?: DateRange;
  alignment?: string;
  dataView?: AnalyticsDataView;
  crmMetrics?: KommoCrmMetrics | null;
  crmName?: string;
}

export default function DashboardChartGrid({ report, projectId, periodA, periodB, alignment = "previous", dataView, crmMetrics, crmName }: DashboardChartGridProps) {
  const { toast } = useToast();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  
  // Debounced updates для конфигурации графиков
  const { queueUpdate } = useDebouncedReportUpdate({
    projectId,
    reportId: report.id,
  });

  // Show all 3 charts by default
  const visibleSlots = report.visibleChartSlots ?? [0, 1, 2];
  
  const slots = Array.from({ length: 3 }, (_, index) => {
    const slotConfig = report.chartSlots?.find(slot => slot.slotIndex === index) || null;
    return { index, config: slotConfig };
  }).filter(slot => visibleSlots.includes(slot.index));

  const handleConfigure = (slotIndex: number) => {
    setEditingSlotIndex(slotIndex);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = (config: ChartSlotConfig) => {
    const existingSlots = report.chartSlots ?? [];
    const updatedSlots = [...existingSlots];
    const slotIndex = updatedSlots.findIndex(slot => slot.slotIndex === config.slotIndex);

    if (slotIndex >= 0) {
      updatedSlots[slotIndex] = config;
    } else {
      updatedSlots.push(config);
    }

    updatedSlots.sort((a, b) => a.slotIndex - b.slotIndex);

    queueUpdate({ chartSlots: updatedSlots });
    setEditingSlotIndex(null);
  };

  const handleRemove = (slotIndex: number) => {
    const currentSlots = report.chartSlots ?? [];
    const updatedSlots = currentSlots.filter(slot => slot.slotIndex !== slotIndex);
    const currentVisibleSlots = report.visibleChartSlots ?? [0, 1, 2];
    const newVisibleSlots = currentVisibleSlots.filter(index => index !== slotIndex);

    // Обновляем всё сразу одним запросом
    queueUpdate({ 
      chartSlots: updatedSlots,
      ...(newVisibleSlots.length !== currentVisibleSlots.length && { visibleChartSlots: newVisibleSlots })
    });

    if (editingSlotIndex === slotIndex) {
      setEditingSlotIndex(null);
    }
  };

  const handleChartTypeChange = (slotIndex: number, chartType: ChartType | undefined) => {
    const existingSlots = report.chartSlots ?? [];
    const index = existingSlots.findIndex(slot => slot.slotIndex === slotIndex);

    if (index === -1) {
      return;
    }

    const updatedSlots = [...existingSlots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      chartType,
    };

    queueUpdate({ chartSlots: updatedSlots });
  };

  const currentConfig = editingSlotIndex !== null
    ? report.chartSlots?.find(slot => slot.slotIndex === editingSlotIndex) || null
    : null;

  useEffect(() => {
    const defaultConfigs: ChartSlotConfig[] = [
      {
        slotIndex: 0,
        metrics: ['impressions', 'clicks'],
        title: 'Impressions and Clicks',
        showLegend: true,
        showGrid: true,
      },
      {
        slotIndex: 1,
        metrics: ['spend', 'conversions'],
        title: 'Spend and Conversions',
        showLegend: true,
        showGrid: true,
      },
      {
        slotIndex: 2,
        metrics: ['conversions', 'cost_per_conversion'],
        title: 'Conversions & Cost',
        showLegend: true,
        showGrid: true,
      },
    ];

    const existingSlots = report.chartSlots ?? [];
    const missingSlots = defaultConfigs.filter(config =>
      !existingSlots.some(slot => slot.slotIndex === config.slotIndex)
    );
    const needsVisibleSlots = !report.visibleChartSlots;

    // Объединяем все дефолтные обновления в один вызов
    const updates: Record<string, unknown> = {};
    
    if (missingSlots.length > 0) {
      const mergedSlots = [...existingSlots, ...missingSlots].sort((a, b) => a.slotIndex - b.slotIndex);
      updates.chartSlots = mergedSlots;
    }

    if (needsVisibleSlots) {
      updates.visibleChartSlots = [0, 1, 2];
    }
    
    if (Object.keys(updates).length > 0) {
      queueUpdate(updates);
    }
  }, [
    report.chartSlots,
    report.visibleChartSlots,
    queueUpdate,
    report.id,
  ]);

  return (
    <>
      {visibleSlots.length === 0 ? (
        <div 
          className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center mb-6"
          data-testid="dashboard-chart-grid-empty"
        >
          <p className="text-muted-foreground text-sm mb-2">All charts are hidden</p>
          <p className="text-xs text-muted-foreground">
            Click "Configure Cards" to enable chart visibility
          </p>
        </div>
      ) : (
        <div
          className="flex flex-wrap gap-4 mb-6"
          data-testid="dashboard-chart-grid"
        >
          {slots.map(({ index, config }) => (
            <ChartSlot
              key={`chart-slot-${index}`}
              slotIndex={index}
              slotConfig={config}
              report={report}
              periodA={periodA}
              periodB={periodB}
              alignment={alignment}
              dataView={dataView}
              crmMetrics={crmMetrics}
              crmName={crmName}
              onConfigure={() => handleConfigure(index)}
              onRemove={() => handleRemove(index)}
              onChartTypeChange={(chartType) => handleChartTypeChange(index, chartType)}
            />
          ))}
        </div>
      )}

      {editingSlotIndex !== null && (
        <ChartConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          slotIndex={editingSlotIndex}
          currentConfig={currentConfig}
          onSave={handleSaveConfig}
        />
      )}
    </>
  );
}
