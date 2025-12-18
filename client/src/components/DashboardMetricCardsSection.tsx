import { useState, useCallback, memo } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardMetricCards from "@/components/DashboardMetricCards";
import MetricCardsConfigDialog from "@/components/MetricCardsConfigDialog";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedReportUpdate } from "@/hooks/useDebouncedReportUpdate";
import { updateVisibleChartSlots } from "@/store/slices/reportsSlice";
import type { Report, MetricCardConfig } from "@/store/slices/reportsSlice";
import type { DateRange } from "react-day-picker";
import type { AnalyticsDataView } from "@/hooks/useAnalyticsDataView";
import type { KommoCrmMetrics } from "@/api/kommo";

interface DashboardMetricCardsSectionProps {
  report: Report;
  projectId: string;
  periodA?: DateRange;
  periodB?: DateRange;
  dataView?: AnalyticsDataView;
  currencyCode?: string | null;
  crmMetrics?: KommoCrmMetrics | null;
  crmName?: string;
}

function DashboardMetricCardsSectionInner({ 
  report, 
  projectId, 
  periodA, 
  periodB,
  dataView,
  currencyCode,
  crmMetrics,
  crmName
}: DashboardMetricCardsSectionProps) {
  const { toast } = useToast();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  // Debounced updates для конфигурации карточек метрик
  const { queueUpdate } = useDebouncedReportUpdate({
    projectId,
    reportId: report.id,
  });

  const handleSaveConfig = useCallback((config: MetricCardConfig[]) => {
    queueUpdate({ metricCards: config });
  }, [queueUpdate]);

  const handleVisibleChartSlotsChange = useCallback((slots: number[]) => {
    queueUpdate({ visibleChartSlots: slots });
  }, [queueUpdate]);

  const handleOpenConfig = useCallback(() => setConfigDialogOpen(true), []);
  const handleCloseConfig = useCallback((open: boolean) => setConfigDialogOpen(open), []);

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenConfig}
            className="gap-2"
            data-testid="button-configure-metric-cards"
          >
            <Settings className="h-4 w-4" />
            Configure Cards
          </Button>
        </div>
        
        <DashboardMetricCards 
          report={report} 
          periodA={periodA} 
          periodB={periodB}
          dataView={dataView}
          currencyCode={currencyCode}
          crmMetrics={crmMetrics}
          crmName={crmName}
        />
      </div>

      <MetricCardsConfigDialog
        open={configDialogOpen}
        onOpenChange={handleCloseConfig}
        currentConfig={report.metricCards || []}
        onSave={handleSaveConfig}
        visibleChartSlots={report.visibleChartSlots || [0, 1, 2]}
        onVisibleChartSlotsChange={handleVisibleChartSlotsChange}
        chartSlots={report.chartSlots || []}
      />
    </>
  );
}

const DashboardMetricCardsSection = memo(DashboardMetricCardsSectionInner);
export default DashboardMetricCardsSection;
