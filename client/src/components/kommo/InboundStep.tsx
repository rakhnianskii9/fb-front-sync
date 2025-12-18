import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Info, Lightbulb, Send, Trophy } from "lucide-react";
import type { KommoPipeline } from "./types";

interface InboundStepProps {
  pipelines: KommoPipeline[];
  selectedPipelineId: number | null;
  selectedStatusId: number | null;
  wonStatusId: number | null;
  sendPurchaseOnWon: boolean;
  includeValueInPurchase: boolean;
  // Валюта аккаунта (read-only, из Kommo API)
  accountCurrency?: string;
  accountCurrencySymbol?: string;
  createContact: boolean;
  createCompany: boolean;
  onPipelineChange: (pipelineId: number) => void;
  onStatusChange: (statusId: number) => void;
  onWonStatusChange: (statusId: number) => void;
  onSendPurchaseOnWonChange: (send: boolean) => void;
  onIncludeValueChange: (include: boolean) => void;
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
  wonStatusId,
  sendPurchaseOnWon,
  includeValueInPurchase,
  accountCurrency,
  accountCurrencySymbol,
  onPipelineChange,
  onStatusChange,
  onWonStatusChange,
  onSendPurchaseOnWonChange,
  onIncludeValueChange,
  onNext,
  onBack,
}: InboundStepProps) {
  // Получаем статусы выбранной воронки
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const statuses = selectedPipeline?.statuses || [];

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
              disabled={!selectedPipelineId}
            >
              <SelectTrigger className="w-full h-11 text-body rounded-lg border border-input bg-muted/30 px-3 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50">
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
              <SelectContent>
                {statuses.filter(s => s.type === 'normal').map((status) => (
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
              New leads will be created in this column.
            </p>
          </div>
        </form>

        {/* Pro Tip */}
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 flex gap-3">
          <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-body-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">Pro Tip:</span> Choose the "Incoming Lead" stage to ensure your sales team sees new opportunities immediately.
          </div>
        </div>

        {/* Секция: Обратная связь в Facebook CAPI */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="size-8 rounded-lg bg-status-online/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-status-online" />
            </div>
            <div>
              <h3 className="text-h2 font-medium text-foreground">Обратная связь в Facebook</h3>
              <p className="text-body-sm text-muted-foreground">Kommo → CAPI при выигрыше сделки</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Won Status select */}
            <div className="group">
              <Label className="flex items-center gap-2 mb-2 text-label text-foreground">
                Статус выигрышной сделки
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </Label>
              <Select
                value={wonStatusId?.toString() || ""}
                onValueChange={(value) => onWonStatusChange(Number(value))}
                disabled={!selectedPipelineId}
              >
                <SelectTrigger className="w-full h-11 text-body rounded-lg border border-input bg-muted/30 px-3 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50">
                  <SelectValue placeholder="Выберите статус победы..." />
                </SelectTrigger>
                <SelectContent>
                  {statuses.filter(s => s.type === 'success' || s.type === 'normal').map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                        {status.type === 'success' && (
                          <span className="text-body-sm text-status-online">(Won)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-body-sm text-muted-foreground">
                При переходе сделки в этот статус будет отправлено событие в Facebook.
              </p>
            </div>

            {/* Toggle: Send Purchase to CAPI */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <Send className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-label text-foreground">Отправлять Purchase в CAPI</p>
                  <p className="text-body-sm text-muted-foreground">
                    Событие Purchase при выигрыше сделки
                  </p>
                </div>
              </div>
              <Switch
                checked={sendPurchaseOnWon}
                onCheckedChange={onSendPurchaseOnWonChange}
                disabled={!wonStatusId}
              />
            </div>

            {/* Conditional: Value settings */}
            {sendPurchaseOnWon && (
              <div className="flex flex-col gap-3 pl-4 border-l-2 border-primary/30">
                {/* Include Value toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div>
                    <p className="text-body-sm font-medium text-foreground">Включать сумму сделки</p>
                    <p className="text-body-sm text-muted-foreground">
                      Передавать value из поля "Бюджет"
                    </p>
                  </div>
                  <Switch
                    checked={includeValueInPurchase}
                    onCheckedChange={onIncludeValueChange}
                  />
                </div>

                {/* Currency display (read-only from Kommo account) */}
                {includeValueInPurchase && (
                  <div className="group">
                    <Label className="flex items-center gap-2 mb-2 text-body-sm font-medium text-foreground">
                      Валюта по умолчанию
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" title="Валюта синхронизирована из настроек Kommo аккаунта" />
                    </Label>
                    <div className="w-full h-9 text-body rounded-lg border border-input bg-muted/50 px-3 flex items-center text-muted-foreground">
                      {accountCurrency ? (
                        <span>{accountCurrency} {accountCurrencySymbol && `(${accountCurrencySymbol})`}</span>
                      ) : (
                        <span className="text-muted-foreground/60">Не определена</span>
                      )}
                      <span className="ml-auto text-body-sm text-muted-foreground/60">из Kommo</span>
                    </div>
                    <p className="mt-1.5 text-body-sm text-muted-foreground">
                      Валюта берётся из настроек вашего Kommo аккаунта.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
