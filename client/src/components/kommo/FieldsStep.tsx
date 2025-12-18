import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, CirclePlus, Mail, Phone, DollarSign, Plus, ShoppingCart, UserPlus, Calendar, CreditCard, Trash2 } from "lucide-react";
import { useState } from "react";
import type { KommoCustomField, KommoFieldMapping } from "./types";

// Шаблоны событий
const EVENT_TEMPLATES = [
  { id: 'purchase', name: 'Purchase', icon: ShoppingCart, isStandard: true },
  { id: 'lead', name: 'Lead', icon: UserPlus, isStandard: true },
  { id: 'schedule', name: 'Schedule', icon: Calendar, isStandard: true },
  { id: 'add_payment_info', name: 'Add Payment Info', icon: CreditCard, isStandard: true },
];

// Примеры маппингов для демонстрации
const DEFAULT_MAPPINGS = [
  { id: '1', sourceField: 'Customer Email', sourceIcon: Mail, fbParam: 'em (email)', paramColor: 'blue' },
  { id: '2', sourceField: 'Phone Number', sourceIcon: Phone, fbParam: 'ph (phone)', paramColor: 'blue' },
  { id: '3', sourceField: 'Deal Value', sourceIcon: DollarSign, fbParam: 'value', paramColor: 'purple' },
];

interface FieldsStepProps {
  customFields: KommoCustomField[];
  mappings: KommoFieldMapping[];
  onAddMapping: () => void;
  onRemoveMapping: (mappingId: string) => void;
  onUpdateMapping: (mappingId: string, updates: Partial<KommoFieldMapping>) => void;
  onToggleMapping: (mappingId: string, enabled: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Шаг 3: Event Configuration & Mapping
 * Настройка событий и маппинг полей CRM на Facebook параметры
 */
export function FieldsStep({
  customFields,
  mappings,
  onAddMapping,
  onRemoveMapping,
  onUpdateMapping,
  onToggleMapping,
  onNext,
  onBack,
}: FieldsStepProps) {
  const [selectedEvent, setSelectedEvent] = useState('purchase');
  const [triggerType, setTriggerType] = useState<'url' | 'pipeline'>('url');
  const [urlValue, setUrlValue] = useState('/thank-you/order-confirmed');

  const selectedTemplate = EVENT_TEMPLATES.find(e => e.id === selectedEvent);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-8 md:px-10 pt-8 md:pt-10 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-h1 text-foreground">Event Configuration & Mapping</h2>
        </div>
        <p className="text-body text-muted-foreground max-w-2xl">
          Define how CRM actions translate into Facebook events. Choose event templates and map data fields to ensure high Match Quality scores.
        </p>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden border-t border-border">
        {/* Left sidebar - Event Templates */}
        <div className="w-52 shrink-0 border-r border-border bg-muted/30 p-4 flex flex-col">
          <h4 className="text-body-sm font-medium uppercase tracking-wider text-muted-foreground px-2 pt-1 mb-3">
            Event Templates
          </h4>
          
          <div className="space-y-1">
            {EVENT_TEMPLATES.map((event) => {
              const Icon = event.icon;
              const isSelected = selectedEvent === event.id;
              
              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all",
                    isSelected 
                      ? "bg-primary/10 text-foreground border border-primary/30" 
                      : "hover:bg-background text-muted-foreground border border-transparent group"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "group-hover:text-foreground")} />
                    <span className="text-label">{event.name}</span>
                  </div>
                  {isSelected && (
                    <div className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Add Custom Event */}
          <div className="mt-auto pt-3">
            <button className="w-full py-2.5 border border-dashed border-border rounded-lg text-body-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-1.5 bg-background">
              <Plus className="w-3.5 h-3.5" />
              Add Custom Event
            </button>
          </div>
        </div>

        {/* Center - Event Settings */}
        <div className="flex-1 p-5 md:p-6 overflow-y-auto bg-background">
          {/* Event header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-h2">{selectedTemplate?.name} Event Settings</h2>
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-body-sm px-2 py-0.5 rounded-md uppercase tracking-wide">
                  Standard
                </span>
              </div>
              <p className="text-muted-foreground text-body-sm max-w-lg">
                This event triggers when a customer completes a transaction. Ensure transaction value and currency are mapped correctly.
              </p>
            </div>
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-6">
            {/* Section 1: Trigger Logic */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center size-5 rounded-md bg-primary/10 text-primary text-body-sm font-medium">1</span>
                <h3 className="text-h3">Trigger Logic</h3>
              </div>
              
              <div className="p-4 rounded-xl border border-card-border bg-muted/30">
                <div className="flex flex-col gap-4">
                  {/* Radio buttons */}
                  <div className="flex items-center gap-4 text-body font-medium">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trigger_type"
                        checked={triggerType === 'url'}
                        onChange={() => setTriggerType('url')}
                        className="text-primary focus:ring-primary"
                      />
                      <span>URL Rules</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trigger_type"
                        checked={triggerType === 'pipeline'}
                        onChange={() => setTriggerType('pipeline')}
                        className="text-primary focus:ring-primary"
                      />
                      <span>CRM Pipeline Stage</span>
                    </label>
                  </div>

                  {/* URL input */}
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <select className="h-9 rounded-md border border-input bg-background text-body min-w-32 px-3 focus:border-primary focus:ring-1 focus:ring-primary">
                      <option>Contains</option>
                      <option>Equals</option>
                      <option>Does not contain</option>
                    </select>
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder="e.g. /thank-you"
                        className="w-full h-9 rounded-md border border-input bg-background text-body px-3 placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Add rule condition */}
                  <div className="flex justify-end">
                    <button className="text-body-sm font-medium text-primary hover:underline transition-colors">
                      + Add Rule Condition
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Parameter Mapping */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-md bg-primary/10 text-primary text-body-sm font-medium">2</span>
                  <h3 className="text-h3">Parameter Mapping</h3>
                </div>
                <button className="text-body-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Auto-map fields
                </button>
              </div>

              <div className="border border-card-border rounded-xl overflow-hidden">
                {/* Table header */}
                <table className="w-full text-body text-left">
                  <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="p-2.5 pl-3">Source Field (CRM)</th>
                      <th className="p-2.5 w-8 text-center">
                        <ArrowRight className="w-3.5 h-3.5 inline" />
                      </th>
                      <th className="p-2.5">Facebook Parameter</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {DEFAULT_MAPPINGS.map((mapping) => {
                      const Icon = mapping.sourceIcon;
                      return (
                        <tr key={mapping.id} className="group hover:bg-muted/50 transition-colors">
                          <td className="p-2.5 pl-3">
                            <div className="flex items-center gap-2 text-foreground">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                              {mapping.sourceField}
                            </div>
                          </td>
                          <td className="text-center text-muted-foreground">
                            <ArrowRight className="w-3.5 h-3.5 inline" />
                          </td>
                          <td className="p-2.5">
                            <span className={cn(
                              "font-mono text-body-sm border rounded-md px-1.5 py-0.5",
                              mapping.paramColor === 'blue' 
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800"
                                : "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800"
                            )}>
                              {mapping.fbParam}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <button className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Add mapping button */}
                <div className="p-2.5 bg-muted/30 border-t border-border">
                  <button className="flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-primary transition-colors">
                    <CirclePlus className="w-3.5 h-3.5" />
                    Map Field
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 md:px-10 py-5 border-t border-border flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="transition-colors"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
