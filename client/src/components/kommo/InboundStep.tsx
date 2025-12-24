import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Info } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { KommoPipeline } from "./types";

interface InboundStepProps {
  pipelines: KommoPipeline[];
  selectedPipelineId: number | null;
  selectedStatusId: number | null;
  createContact: boolean;
  createCompany: boolean;
  onPipelineChange: (pipelineId: number) => void;
  onStatusChange: (statusId: number) => void;
  onCreateContactChange: (create: boolean) => void;
  onCreateCompanyChange: (create: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Шаг 2: Настройка входящих лидов из Facebook
 * Определяет, как создаются сделки из Facebook Lead Ads
 * + настройка обратного роутинга Kommo → CAPI
 */
export function InboundStep({
  pipelines,
  selectedPipelineId,
  selectedStatusId,
  onPipelineChange,
  onStatusChange,
  onNext,
  onBack,
}: InboundStepProps) {
  // Получаем статусы выбранной воронки
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const statuses = selectedPipeline?.statuses || [];

  // Per product requirement: initial status should be "Contacted".
  // We match by name to support different label variants (e.g. localized).
  const contactedStatuses = useMemo(() => {
    const re = /(contacted|contact|контакт)/i;
    return statuses.filter((s) => s.type === 'normal' && re.test(s.name || ''));
  }, [statuses]);

  const selectableInitialStatuses = contactedStatuses;

  useEffect(() => {
    if (!selectedPipelineId) return;
    if (!selectableInitialStatuses.length) return;
    if (selectedStatusId && selectableInitialStatuses.some((s) => s.id === selectedStatusId)) return;

    // Default to Contacted (or closest match) when pipeline changes / selection invalid.
    onStatusChange(selectableInitialStatuses[0].id);
  }, [selectedPipelineId, selectedStatusId, selectableInitialStatuses, onStatusChange]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Основной контент */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Kommo CRM status badge */}
        <div className="flex items-center gap-3 pb-5 border-b border-border">
          <div className="size-10 rounded-lg bg-[#5b5fc7] flex items-center justify-center text-white font-bold text-body">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-h3 font-medium text-foreground">Kommo CRM</span>
            <span className="text-body-sm text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-status-online" /> Connected
            </span>
          </div>
        </div>

        {/* Форма */}
        <form className="flex flex-col gap-5">
          {/* Pipeline select */}
          <div className="group">
            <Label className="flex items-center gap-2 mb-2 text-label text-foreground">
              Pipeline
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </Label>
            <Select
              value={selectedPipelineId?.toString() || ""}
              onValueChange={(value) => onPipelineChange(Number(value))}
            >
              <SelectTrigger className="w-full h-11 text-body rounded-lg border border-input bg-muted/30 px-3 focus:border-primary focus:ring-1 focus:ring-primary">
                <SelectValue placeholder="Select a pipeline..." />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                    {pipeline.name}
                    {pipeline.isMain && (
                      <span className="ml-2 text-body-sm text-muted-foreground">(Main)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-body-sm text-muted-foreground">
              The collection of stages your leads move through.
            </p>
          </div>

          {/* Initial Status select */}
          <div className="group">
            <Label className="flex items-center gap-2 mb-2 text-label text-foreground">
              Initial Status
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </Label>
            <Select
              value={selectedStatusId?.toString() || ""}
              onValueChange={(value) => onStatusChange(Number(value))}
              disabled={!selectedPipelineId || selectableInitialStatuses.length === 0}
            >
              <SelectTrigger className="w-full h-11 text-body rounded-lg border border-input bg-muted/30 px-3 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50">
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
              <SelectContent>
                  {selectableInitialStatuses.map((status) => (
                  <SelectItem key={status.id} value={status.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-body-sm text-muted-foreground">
              {selectableInitialStatuses.length
                ? 'New leads will be created in this column.'
                : 'This step requires a "Contacted" stage in the selected pipeline.'}
            </p>
          </div>
        </form>

      </div>

      {/* Footer с кнопками */}
      <div className="pt-6 mt-auto flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="transition-colors"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedPipelineId || !selectedStatusId}
          className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
