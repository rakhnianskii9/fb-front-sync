import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, DollarSign, Info, Plus, Search, Send, ShieldCheck, Trash2, Trophy, Zap } from "lucide-react";
import type { KommoEventTrigger, KommoPipeline } from "./types";
import { CAPI_EVENTS } from "./types";

interface EventsStepProps {
  pipelines: KommoPipeline[];
  selectedPipelineId: number | null;
  wonStatusId: number | null;
  sendPurchaseOnWon: boolean;
  includeValueInPurchase: boolean;
  accountCurrency?: string;
  accountCurrencySymbol?: string;
  // B+C+D fallback options
  sendWithoutAttribution?: boolean;
  lookupAttributionByPii?: boolean;
  markOfflineIfNoAttribution?: boolean;
  onWonStatusChange: (statusId: number) => void;
  onSendPurchaseOnWonChange: (send: boolean) => void;
  onIncludeValueChange: (include: boolean) => void;
  // B+C+D callbacks
  onSendWithoutAttributionChange?: (send: boolean) => void;
  onLookupAttributionByPiiChange?: (lookup: boolean) => void;
  onMarkOfflineIfNoAttributionChange?: (mark: boolean) => void;
  triggers: KommoEventTrigger[];
  onAddTrigger: () => void;
  onRemoveTrigger: (triggerId: string) => void;
  onUpdateTrigger: (triggerId: string, updates: Partial<KommoEventTrigger>) => void;
  onToggleTrigger: (triggerId: string, enabled: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Шаг 4: Настройка триггеров событий CAPI
 * Определяет, какие изменения статусов в Kommo отправляют события в Facebook CAPI
 */
export function EventsStep({
  pipelines,
  selectedPipelineId,
  wonStatusId,
  sendPurchaseOnWon,
  includeValueInPurchase,
  accountCurrency,
  accountCurrencySymbol,
  // B+C+D fallback options
  sendWithoutAttribution = true,
  lookupAttributionByPii = true,
  markOfflineIfNoAttribution = true,
  onWonStatusChange,
  onSendPurchaseOnWonChange,
  onIncludeValueChange,
  // B+C+D callbacks
  onSendWithoutAttributionChange,
  onLookupAttributionByPiiChange,
  onMarkOfflineIfNoAttributionChange,
  triggers,
  onAddTrigger,
  onRemoveTrigger,
  onUpdateTrigger,
  onToggleTrigger,
  onNext,
  onBack,
}: EventsStepProps) {
  // Получаем все статусы из всех воронок
  const getStatusesForPipeline = (pipelineId: number) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline?.statuses || [];
  };

  const selectedPipelineStatuses = selectedPipelineId ? getStatusesForPipeline(selectedPipelineId) : [];

  return (
    <div className="flex-1 p-8 md:p-10 flex flex-col overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-h1 text-foreground mb-1">CAPI Events</h2>
          <p className="text-body-sm text-muted-foreground">
            Configure which status changes in Kommo should send events to Facebook Conversions API.
          </p>
        </div>

        {/* Список триггеров */}
        <div className="space-y-4">
          {triggers.map((trigger) => (
            <Card key={trigger.id} className={!trigger.isEnabled ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={trigger.isEnabled}
                      onCheckedChange={(checked) => onToggleTrigger(trigger.id, checked)}
                    />
                    <div>
                      <CardTitle className="text-h3">
                        {trigger.name || "New trigger"}
                      </CardTitle>
                      <CardDescription className="text-body-sm">
                        {trigger.description || "Configure trigger conditions"}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveTrigger(trigger.id)}
                    className="text-muted-foreground hover:text-destructive h-8 w-8 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Название триггера */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`trigger-event-${trigger.id}`}>CAPI event</Label>
                    <Select
                      value={trigger.capiEventName || ""}
                      onValueChange={(value) => onUpdateTrigger(trigger.id, { capiEventName: value })}
                    >
                      <SelectTrigger id={`trigger-event-${trigger.id}`}>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAPI_EVENTS.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`trigger-name-${trigger.id}`}>Name</Label>
                    <Input
                      id={`trigger-name-${trigger.id}`}
                      value={trigger.name}
                      onChange={(e) => onUpdateTrigger(trigger.id, { name: e.target.value })}
                      placeholder="e.g. Won deal"
                    />
                  </div>
                </div>

                {/* Воронка и статус */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`trigger-pipeline-${trigger.id}`}>Pipeline</Label>
                    <Select
                      value={trigger.pipelineId?.toString() || ""}
                      onValueChange={(value) => {
                        onUpdateTrigger(trigger.id, {
                          pipelineId: Number(value),
                          statusId: 0, // Сбрасываем статус при смене воронки
                        });
                      }}
                    >
                      <SelectTrigger id={`trigger-pipeline-${trigger.id}`}>
                        <SelectValue placeholder="Select a pipeline" />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`trigger-status-${trigger.id}`}>When moved to status</Label>
                    <Select
                      value={trigger.statusId?.toString() || ""}
                      onValueChange={(value) => onUpdateTrigger(trigger.id, { statusId: Number(value) })}
                      disabled={!trigger.pipelineId}
                    >
                      <SelectTrigger id={`trigger-status-${trigger.id}`}>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStatusesForPipeline(trigger.pipelineId).map((status) => (
                          <SelectItem key={status.id} value={status.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                              {status.type === 'success' && (
                                <span className="text-body-sm text-status-online">(Success)</span>
                              )}
                              {status.type === 'fail' && (
                                <span className="text-body-sm text-status-busy">(Fail)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Значение события (для Purchase и др.) */}
                {trigger.capiEventName === 'Purchase' && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor={`trigger-value-${trigger.id}`} className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        Deal value
                      </Label>
                      <Input
                        id={`trigger-value-${trigger.id}`}
                        type="number"
                        value={trigger.eventValue || ""}
                        onChange={(e) => onUpdateTrigger(trigger.id, { eventValue: Number(e.target.value) })}
                        placeholder="From deal field"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`trigger-currency-${trigger.id}`}>Currency</Label>
                      <Select
                        value={trigger.eventCurrency || "RUB"}
                        onValueChange={(value) => onUpdateTrigger(trigger.id, { eventCurrency: value })}
                      >
                        <SelectTrigger id={`trigger-currency-${trigger.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RUB">RUB - Russian ruble</SelectItem>
                          <SelectItem value="USD">USD - United States dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="VND">VND - Vietnamese dong</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Кнопка добавления (показываем только после добавления первого триггера) */}
          {triggers.length > 0 && (
            <Button
              variant="outline"
              onClick={onAddTrigger}
              className="w-full h-10 border-dashed transition-all hover:border-primary/50"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add trigger
            </Button>
          )}

          {triggers.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="pt-5">
                <div className="text-center py-6">
                  <Send className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <CardTitle className="text-h3 mb-1.5">No triggers configured</CardTitle>
                  <CardDescription className="text-body-sm">
                    Add triggers to send conversion events to Facebook
                  </CardDescription>
                  <Button onClick={onAddTrigger} className="mt-3 shadow-sm hover:shadow-primary/20 transition-all">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add first trigger
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Facebook feedback (Kommo → CAPI on won) */}
        <Card className="mt-8">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-status-online/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-status-online" />
              </div>
              <div>
                <CardTitle className="text-h3">Feedback to Facebook</CardTitle>
                <CardDescription className="text-body-sm">Kommo → CAPI on won deal</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Won deal status
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </Label>
              <Select
                value={wonStatusId?.toString() || ""}
                onValueChange={(value) => onWonStatusChange(Number(value))}
                disabled={!selectedPipelineId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a won status..." />
                </SelectTrigger>
                <SelectContent>
                    {selectedPipelineStatuses
                      .filter((s) => s.type === 'success')
                      .map((status) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                          {status.name}
                          {status.type === 'success' && (
                            <span className="text-body-sm text-status-online">(Closed – Won)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-body-sm text-muted-foreground">
                When a deal moves to this status, an event will be sent to Facebook.
              </p>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
              <div>
                <p className="text-label text-foreground">Send Purchase to CAPI</p>
                <p className="text-body-sm text-muted-foreground">Send a Purchase event when the deal is won</p>
              </div>
              <Switch
                checked={sendPurchaseOnWon}
                onCheckedChange={onSendPurchaseOnWonChange}
                disabled={!wonStatusId}
              />
            </div>

            {sendPurchaseOnWon && (
              <div className="flex flex-col gap-3 pl-4 border-l-2 border-primary/30">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                  <Checkbox
                    checked={includeValueInPurchase}
                    onCheckedChange={(checked) => onIncludeValueChange(checked === true)}
                  />
                  <div className="leading-tight">
                    <p className="text-body-sm font-medium text-foreground">Include deal amount</p>
                    <p className="text-body-sm text-muted-foreground">Send value from the “Budget” field</p>
                  </div>
                </label>

                {includeValueInPurchase && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Default currency
                      <span title="Currency is synced from Kommo account settings">
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </span>
                    </Label>
                    <div className="w-full h-9 text-body rounded-lg border border-input bg-muted/50 px-3 flex items-center text-muted-foreground">
                      {accountCurrency ? (
                        <span>{accountCurrency} {accountCurrencySymbol && `(${accountCurrencySymbol})`}</span>
                      ) : (
                        <span className="text-muted-foreground/60">Not set</span>
                      )}
                      <span className="ml-auto text-body-sm text-muted-foreground/60">from Kommo</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground">Currency comes from your Kommo account settings.</p>
                  </div>
                )}

                {/* Offline Conversions - главный переключатель + вложенные опции */}
                <div className="space-y-3 pt-3 border-t border-border/50">
                  {/* Главный переключатель */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-label text-foreground">Send offline conversions</p>
                        <p className="text-body-sm text-muted-foreground">
                          Send events to CAPI even without Facebook click attribution
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={sendWithoutAttribution}
                      onCheckedChange={(checked) => onSendWithoutAttributionChange?.(checked)}
                    />
                  </div>

                  {/* Вложенные опции - показываются только если главный переключатель включен */}
                  {sendWithoutAttribution && (
                    <div className="flex flex-col gap-3 pl-4 border-l-2 border-primary/30">
                      <p className="text-body-sm text-muted-foreground">
                        Configure how to handle conversions when fbclid/fbc/fbp is not available:
                      </p>

                      {/* C: Smart attribution lookup */}
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
                        <Checkbox
                          checked={lookupAttributionByPii}
                          onCheckedChange={(checked) => onLookupAttributionByPiiChange?.(checked === true)}
                        />
                        <div className="leading-tight">
                          <div className="flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-primary" />
                            <p className="text-body-sm font-medium text-foreground">Smart attribution lookup</p>
                          </div>
                          <p className="text-body-sm text-muted-foreground">
                            Search for attribution in other leads by email or phone before sending.
                          </p>
                        </div>
                      </label>

                      {/* D: Mark as offline */}
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
                        <Checkbox
                          checked={markOfflineIfNoAttribution}
                          onCheckedChange={(checked) => onMarkOfflineIfNoAttributionChange?.(checked === true)}
                        />
                        <div className="leading-tight">
                          <p className="text-body-sm font-medium text-foreground">Mark as offline conversion</p>
                          <p className="text-body-sm text-muted-foreground">
                            Set action_source to "physical_store" for better event quality score.
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Кнопки навигации */}
        <div className="flex justify-between mt-8 pt-5 border-t border-border">
          <Button variant="outline" onClick={onBack} className="transition-colors">
            Back
          </Button>
          <Button onClick={onNext} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
