import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, DollarSign, Plus, Send, Trash2, Zap } from "lucide-react";
import type { KommoEventTrigger, KommoPipeline } from "./types";
import { CAPI_EVENTS } from "./types";

interface EventsStepProps {
  pipelines: KommoPipeline[];
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

  return (
    <div className="flex-1 p-8 md:p-10 flex flex-col overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-h1 text-foreground mb-1">События CAPI</h2>
          <p className="text-body-sm text-muted-foreground">
            Настройте, какие изменения статусов в Kommo будут отправлять события в Facebook Conversions API.
          </p>
        </div>

        {/* Информационный блок */}
        <Card className="mb-5 bg-chart-2/5 border-chart-2/20">
          <CardContent className="pt-5">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-chart-2 mt-0.5" />
              <div>
                <p className="text-h3 font-medium text-foreground">Обратная связь для оптимизации</p>
                <p className="text-body-sm text-muted-foreground">
                  События из CRM помогают Facebook алгоритмам оптимизировать рекламу под качественные конверсии.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                        {trigger.name || "Новый триггер"}
                      </CardTitle>
                      <CardDescription className="text-body-sm">
                        {trigger.description || "Настройте условия срабатывания"}
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
                    <Label htmlFor={`trigger-name-${trigger.id}`}>Название</Label>
                    <Input
                      id={`trigger-name-${trigger.id}`}
                      value={trigger.name}
                      onChange={(e) => onUpdateTrigger(trigger.id, { name: e.target.value })}
                      placeholder="Например: Успешная сделка"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`trigger-event-${trigger.id}`}>Событие CAPI</Label>
                    <Select
                      value={trigger.capiEventName}
                      onValueChange={(value) => onUpdateTrigger(trigger.id, { capiEventName: value })}
                    >
                      <SelectTrigger id={`trigger-event-${trigger.id}`}>
                        <SelectValue placeholder="Выберите событие" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAPI_EVENTS.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex flex-col">
                              <span>{event.name}</span>
                              <span className="text-body-sm text-muted-foreground">
                                {event.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Воронка и статус */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`trigger-pipeline-${trigger.id}`}>Воронка</Label>
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
                        <SelectValue placeholder="Выберите воронку" />
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
                    <Label htmlFor={`trigger-status-${trigger.id}`}>При переходе в статус</Label>
                    <Select
                      value={trigger.statusId?.toString() || ""}
                      onValueChange={(value) => onUpdateTrigger(trigger.id, { statusId: Number(value) })}
                      disabled={!trigger.pipelineId}
                    >
                      <SelectTrigger id={`trigger-status-${trigger.id}`}>
                        <SelectValue placeholder="Выберите статус" />
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
                                <span className="text-body-sm text-status-online">(Успех)</span>
                              )}
                              {status.type === 'fail' && (
                                <span className="text-body-sm text-status-busy">(Отказ)</span>
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
                        Значение сделки
                      </Label>
                      <Input
                        id={`trigger-value-${trigger.id}`}
                        type="number"
                        value={trigger.eventValue || ""}
                        onChange={(e) => onUpdateTrigger(trigger.id, { eventValue: Number(e.target.value) })}
                        placeholder="Из поля сделки"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`trigger-currency-${trigger.id}`}>Валюта</Label>
                      <Select
                        value={trigger.eventCurrency || "RUB"}
                        onValueChange={(value) => onUpdateTrigger(trigger.id, { eventCurrency: value })}
                      >
                        <SelectTrigger id={`trigger-currency-${trigger.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RUB">RUB - Российский рубль</SelectItem>
                          <SelectItem value="USD">USD - Доллар США</SelectItem>
                          <SelectItem value="EUR">EUR - Евро</SelectItem>
                          <SelectItem value="VND">VND - Вьетнамский донг</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Кнопка добавления */}
          <Button
            variant="outline"
            onClick={onAddTrigger}
            className="w-full h-10 border-dashed transition-all hover:border-primary/50"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Добавить триггер
          </Button>

          {triggers.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="pt-5">
                <div className="text-center py-6">
                  <Send className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <CardTitle className="text-h3 mb-1.5">Нет настроенных триггеров</CardTitle>
                  <CardDescription className="text-body-sm">
                    Добавьте триггеры для отправки событий конверсий в Facebook
                  </CardDescription>
                  <Button onClick={onAddTrigger} className="mt-3 shadow-sm hover:shadow-primary/20 transition-all">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Добавить первый триггер
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

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
