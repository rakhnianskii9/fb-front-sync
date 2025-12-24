import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, CirclePlus, Plus, ShoppingCart, UserPlus, Calendar, CreditCard, Trash2 } from "lucide-react";
import { useState } from "react";
import type { KommoCustomField, KommoFieldMapping } from "./types";
import { CAPI_MAPPABLE_FIELDS } from "./types";

// Built-in templates shown in the left rail.
const DEFAULT_EVENT_TEMPLATES = [
  { id: 'purchase', name: 'Purchase', icon: ShoppingCart, isStandard: true },
  { id: 'lead', name: 'Lead', icon: UserPlus, isStandard: true },
  { id: 'schedule', name: 'Schedule', icon: Calendar, isStandard: true },
  { id: 'add_payment_info', name: 'Add Payment Info', icon: CreditCard, isStandard: true },
];


interface FieldsStepProps {
  workspaceId?: string;
  customFields: KommoCustomField[];
  mappings: KommoFieldMapping[];
  onAddMapping: () => void;
  onRemoveMapping: (mappingId: string) => void;
  onUpdateMapping: (mappingId: string, updates: Partial<KommoFieldMapping>) => void;
  onToggleMapping: (mappingId: string, enabled: boolean) => void;
  onAutoMap?: () => void;
  onRefreshMetadata?: () => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Шаг 3: Event Configuration & Mapping
 * Настройка событий и маппинг полей CRM на Facebook параметры
 */
export function FieldsStep({
  workspaceId,
  customFields,
  mappings,
  onAddMapping,
  onRemoveMapping,
  onUpdateMapping,
  onToggleMapping,
  onAutoMap,
  onRefreshMetadata,
  onNext,
  onBack,
}: FieldsStepProps) {
  const [selectedEvent, setSelectedEvent] = useState('purchase');
  const [eventTemplates, setEventTemplates] = useState(DEFAULT_EVENT_TEMPLATES);

  const selectedTemplate = eventTemplates.find(e => e.id === selectedEvent);

  const availableFields = Array.isArray(customFields) ? customFields : [];

  const canCreateKommoCustomField = Boolean(workspaceId);
  const getCreateSpec = (capiField: string) => {
    // Only fields that are actually persisted to KommoConfig.fieldMapping.
    // (email/phone are handled via Kommo system field_code fallback, so we don't create those here.)
    const leadFields: Record<string, { name: string }> = {
      utm_source: { name: 'utm_source' },
      utm_medium: { name: 'utm_medium' },
      utm_campaign: { name: 'utm_campaign' },
      utm_content: { name: 'utm_content' },
      utm_term: { name: 'utm_term' },
      ip_geo_country: { name: 'ip_geo_country' },
      ip_geo_city: { name: 'ip_geo_city' },
    };

    if (leadFields[capiField]) {
      return { entityType: 'leads' as const, name: leadFields[capiField].name };
    }
    return null;
  };

  const getStandardTargetLabel = (capiField: string) => {
    if (capiField === 'firstName') return 'Contact → First name (standard)';
    if (capiField === 'lastName') return 'Contact → Last name (standard)';
    return null;
  };

  const handleCreateField = async (mappingId: string, capiField: string) => {
    const spec = getCreateSpec(capiField);
    if (!spec || !workspaceId) return;

    const resp = await fetch('/api/v1/kommo/custom-fields', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-request-from': 'internal',
      },
      body: JSON.stringify({
        workspaceId,
        entityType: spec.entityType,
        name: spec.name,
        type: 'text',
      }),
    });

    if (!resp.ok) {
      const raw = await resp.json().catch(() => null);
      throw new Error(raw?.error || 'Failed to create Kommo field');
    }

    const data = await resp.json().catch(() => null);
    const created = data?.field;
    if (created?.id) {
      onUpdateMapping(mappingId, {
        providerFieldId: Number(created.id),
        providerFieldName: created.name || spec.name,
        entityType: spec.entityType,
      });
      await onRefreshMetadata?.();
    }
  };

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
            {eventTemplates.map((event) => {
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
            <button
              type="button"
              onClick={() => {
                const id = `custom_${Date.now()}`;
                setEventTemplates((prev) => [
                  ...prev,
                  { id, name: 'Custom Event', icon: CirclePlus, isStandard: false },
                ]);
                setSelectedEvent(id);
              }}
              className="w-full py-2.5 border border-dashed border-border rounded-lg text-body-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-1.5 bg-background"
            >
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
            {/* Section 1: Parameter Mapping */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-md bg-primary/10 text-primary text-body-sm font-medium">1</span>
                  <h3 className="text-h3">Parameter Mapping</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onAutoMap?.()}
                  className="text-body-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Auto-map fields
                </button>
              </div>

              <div className="border border-card-border rounded-xl overflow-hidden">
                {/* Table header */}
                <table className="w-full text-body text-left">
                  <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="p-2.5 pl-3">Facebook Parameter</th>
                      <th className="p-2.5 w-8 text-center">
                        <ArrowRight className="w-3.5 h-3.5 inline" />
                      </th>
                      <th className="p-2.5">Kommo Field (CRM)</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {mappings.length > 0 ? (
                      mappings.map((mapping) => {
                        const selectedCapi = CAPI_MAPPABLE_FIELDS.find(f => f.id === mapping.capiField);
                        const capiLabel = selectedCapi ? `${selectedCapi.name}` : (mapping.capiField || 'Not selected');
                        const hasCoreMatchQualityParam = ['email', 'phone'].includes(mapping.capiField);

                        return (
                          <tr key={mapping.id} className="group hover:bg-muted/50 transition-colors">
                            <td className="p-2.5 pl-3">
                              <select
                                value={mapping.capiField || ""}
                                onChange={(e) => onUpdateMapping(mapping.id, { capiField: e.target.value })}
                                className="h-9 w-full rounded-md border border-input bg-background text-body px-3 focus:border-primary focus:ring-1 focus:ring-primary"
                              >
                                <option value="">Select Facebook parameter...</option>
                                {CAPI_MAPPABLE_FIELDS.map((field) => (
                                  <option key={field.id} value={field.id}>
                                    {field.name}
                                  </option>
                                ))
                                }
                              </select>
                            </td>
                            <td className="text-center text-muted-foreground">
                              <ArrowRight className="w-3.5 h-3.5 inline" />
                            </td>
                            <td className="p-2.5">
                              {getStandardTargetLabel(mapping.capiField) ? (
                                <div className="h-9 w-full rounded-md border border-input bg-muted/30 text-body px-3 flex items-center text-muted-foreground">
                                  {getStandardTargetLabel(mapping.capiField)}
                                </div>
                              ) : (
                                <select
                                  value={mapping.providerFieldId ? String(mapping.providerFieldId) : ""}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    const field = availableFields.find(f => f.id === value);
                                    onUpdateMapping(mapping.id, {
                                      providerFieldId: value,
                                      providerFieldName: field?.name || "",
                                      entityType: (field?.entityType || mapping.entityType) as any,
                                    });
                                  }}
                                  className="h-9 w-full rounded-md border border-input bg-background text-body px-3 focus:border-primary focus:ring-1 focus:ring-primary"
                                >
                                  <option value="">Select Kommo field...</option>
                                  {availableFields.map((field) => (
                                    <option key={field.id} value={String(field.id)}>
                                      {field.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {!!mapping.capiField && (
                                <div className="mt-1">
                                  <span
                                    className={cn(
                                      "inline-flex font-mono text-body-sm border rounded-md px-1.5 py-0.5",
                                      hasCoreMatchQualityParam
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800"
                                        : "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800"
                                    )}
                                  >
                                    {capiLabel}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {!!getCreateSpec(mapping.capiField) && !mapping.providerFieldId && canCreateKommoCustomField && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleCreateField(mapping.id, mapping.capiField);
                                    }}
                                    className="text-body-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                  >
                                    Create
                                  </button>
                                )}
                                <button
                                  onClick={() => onRemoveMapping(mapping.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  aria-label="Remove mapping"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground text-body-sm" colSpan={4}>
                          No mappings yet. Click "Map Field" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Add mapping button */}
                <div className="p-2.5 bg-muted/30 border-t border-border">
                  <button
                    onClick={onAddMapping}
                    className="flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-primary transition-colors"
                  >
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
