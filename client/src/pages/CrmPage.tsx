import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, RefreshCw, Filter, History, Loader2, ChevronDown, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DistributionStep as KommoDistributionStep } from "@/components/kommo/DistributionStep";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrm } from "@/hooks/useCrm";
import { useWorkspace } from "@/hooks/useWorkspace";
import { SetupSteps, type CrmSetupStep, type CrmFieldMapping, type CrmEventTrigger, type CrmDistributionRule } from "@/components/crm";
import { ConnectStep, InboundStep, FieldsStep, EventsStep, DistributionStep, ReviewStep } from "@/components/crm/providers/kommo";

// Конфигурация шагов визарда (по макету Zkommo1)
const SETUP_STEPS = [
  { title: "Connect", description: "Connect your Kommo account securely via OAuth 2.0." },
  { title: "Inbound", description: "Define how incoming leads from Facebook are created in Kommo." },
  { title: "Fields", description: "Map Facebook CAPI parameters to your Kommo CRM fields." },
  { title: "Events", description: "Configure which Kommo status changes trigger CAPI events." },
  { title: "Distribution", description: "Set up rules for automatically distributing new leads to managers." },
  { title: "Review", description: "Review your setup and activate the Kommo integration." },
];

const STEP_ORDER: CrmSetupStep[] = ['connect', 'inbound', 'fields', 'events', 'distribution', 'review'];

/**
 * Страница настройки интеграции Kommo CRM
 * 6-шаговый визард для полной конфигурации интеграции
 * Использует useKommo хук для работы с реальным API
 */
export default function CrmPage() {
  const KOMMO_LOGO_SRC = `${import.meta.env.BASE_URL}images/kommo.png`;
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  
  // CRM provider hook (Kommo is one of the providers)
  const {
    connection,
    isLoading,
    error,
    pipelines,
    users,
    customFields,
    config,
    connect,
    disconnect,
    saveConfig,
    loadMetadata,
    getDefaultWonStatus
  } = useCrm('kommo');
  
  // Выбранная CRM — инициализируем сразу как 'kommo' если isLoading,
  // чтобы избежать мигания "Select CRM" экрана при переходах между страницами
  const [selectedCrm, setSelectedCrm] = useState<string | null>(() => {
    // При первом рендере пока isLoading=true, предполагаем что Kommo подключён
    // (чтобы не показывать экран выбора CRM)
    return 'kommo';
  });

  const isWizardCompleted = !!config?.wizardCompleted;
  const isConnected = connection?.status === 'connected' && !!config?.connected;

  // После загрузки конфига: если НЕ подключён — сбрасываем selectedCrm на null
  useEffect(() => {
    // Ждём окончания загрузки
    if (isLoading) return;
    
    // Если подключён — оставляем 'kommo'
    if (config?.connected || connection?.status === 'connected') {
      setSelectedCrm('kommo');
      return;
    }
    
    // Если не подключён — показываем экран выбора CRM
    setSelectedCrm(null);
  }, [isLoading, config?.connected, connection?.status]);

  // Текущий шаг визарда
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEP_ORDER[currentStepIndex];

  // Состояние входящих лидов (локальное, синхронизируется с config)
  const [inboundConfig, setInboundConfig] = useState({
    pipelineId: null as number | null,
    statusId: null as number | null,
    createContact: true,
    createCompany: false,
    // Настройки обратного роутинга Kommo → CAPI
    wonStatusId: null as number | null,
    sendPurchaseOnWon: true,
    includeValueInPurchase: true,
    // B+C+D Attribution Fallback Strategy
    sendWithoutAttribution: true,
    lookupAttributionByPii: true,
    markOfflineIfNoAttribution: true,
  });

  // Маппинги полей
  const [mappings, setMappings] = useState<CrmFieldMapping[]>([]);

  // Триггеры событий
  const [triggers, setTriggers] = useState<CrmEventTrigger[]>([]);

  // Состояние активации
  const [isActivating, setIsActivating] = useState(false);

  // Сохранение настроек (settings screen)
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);

  // Leads table (settings screen)
  const [kommoLeads, setKommoLeads] = useState<any[]>([]);
  const [isLoadingKommoLeads, setIsLoadingKommoLeads] = useState(false);
  const [kommoLeadsError, setKommoLeadsError] = useState<string | null>(null);

  // Инициализация локального состояния из конфига
  useEffect(() => {
    if (config) {
      setInboundConfig({
        pipelineId: config.inboundPipelineId || null,
        statusId: config.inboundStatusId || null,
        createContact: config.createContactOnInbound ?? true,
        createCompany: config.createCompanyOnInbound ?? false,
        wonStatusId: config.wonStatusId || null,
        sendPurchaseOnWon: config.sendPurchaseOnWon ?? true,
        includeValueInPurchase: config.includeValueInPurchase ?? true,
        // B+C+D Attribution Fallback
        sendWithoutAttribution: config.sendWithoutAttribution ?? true,
        lookupAttributionByPii: config.lookupAttributionByPii ?? true,
        markOfflineIfNoAttribution: config.markOfflineIfNoAttribution ?? true,
      });
    }
  }, [config]);

  // Инициализация default responsible user из конфига
  useEffect(() => {
    if (!config) return

    // Prefer the persisted distribution rule when present
    if (config.distributionRule) {
      setDistributionRule(prev => ({
        ...prev,
        ...config.distributionRule,
        id: prev.id,
        name: prev.name,
        isEnabled: prev.isEnabled,
      }))
      return
    }

    // Backward-compat fallback
    if (config.defaultResponsibleUserId) {
      setDistributionRule(prev => ({
        ...prev,
        defaultUserId: config.defaultResponsibleUserId
      }))
    }
  }, [config]);

  // Инициализация field mappings из persisted config.fieldMapping
  useEffect(() => {
    const fieldMapping = config?.fieldMapping
    if (!fieldMapping) return

    const keyToCapiField: Record<string, string> = {
      email: 'email',
      phone: 'phone',
      utmSource: 'utm_source',
      utmCampaign: 'utm_campaign',
      utmMedium: 'utm_medium',
      utmContent: 'utm_content',
      utmTerm: 'utm_term',
      ipGeoCountry: 'ip_geo_country',
      ipGeoCity: 'ip_geo_city'
    }

    const next: CrmFieldMapping[] = Object.entries(fieldMapping)
      .filter(([key, value]) => typeof value === 'number' && value > 0 && !!keyToCapiField[key])
      .map(([key, value]) => {
        const capiField = keyToCapiField[key]
        return {
          id: `mapping-${key}`,
          capiField,
          providerFieldId: value as number,
          providerFieldName: '',
          entityType: (key === 'email' || key === 'phone') ? 'contacts' : 'leads',
          isEnabled: true
        }
      })

    setMappings(next)
  }, [config?.fieldMapping]);

  // Ensure required fields are always visible in the UI.
  useEffect(() => {
    const required: Array<{ capiField: string; entityType: CrmFieldMapping['entityType'] }> = [
      { capiField: 'firstName', entityType: 'contacts' },
      { capiField: 'lastName', entityType: 'contacts' },
      { capiField: 'phone', entityType: 'contacts' },
      { capiField: 'email', entityType: 'contacts' },
      { capiField: 'utm_source', entityType: 'leads' },
      { capiField: 'utm_medium', entityType: 'leads' },
      { capiField: 'utm_campaign', entityType: 'leads' },
      { capiField: 'utm_content', entityType: 'leads' },
      { capiField: 'utm_term', entityType: 'leads' },
      { capiField: 'ip_geo_country', entityType: 'leads' },
      { capiField: 'ip_geo_city', entityType: 'leads' },
    ]

    setMappings((prev) => {
      const next = [...prev]
      const byCapi = new Map(next.map((m) => [m.capiField, m]))

      for (const r of required) {
        if (byCapi.has(r.capiField)) continue
        next.push({
          id: `mapping-required-${r.capiField}`,
          capiField: r.capiField,
          providerFieldId: 0,
          providerFieldName: '',
          entityType: r.entityType,
          isEnabled: true
        })
      }

      const order = new Map(required.map((r, idx) => [r.capiField, idx]))
      return next
        .map((m, idx) => ({ m, idx }))
        .sort((a, b) => {
          const ao = order.has(a.m.capiField) ? (order.get(a.m.capiField) as number) : 999
          const bo = order.has(b.m.capiField) ? (order.get(b.m.capiField) as number) : 999
          if (ao !== bo) return ao - bo
          return a.idx - b.idx
        })
        .map((x) => x.m)
    })
  }, [])

  const formatUnixSeconds = (value?: number | null) => {
    if (!value) return '—';
    const date = new Date(value * 1000);
    return date.toLocaleString();
  };

  const getLeadCustomFieldValue = (lead: any, fieldId?: number) => {
    if (!lead || !fieldId) return undefined;
    const items = lead?.custom_fields_values;
    if (!Array.isArray(items)) return undefined;

    const field = items.find((f: any) => Number(f?.field_id) === Number(fieldId));
    const values = field?.values;
    if (!Array.isArray(values) || values.length === 0) return undefined;
    return values[0]?.value;
  };

  const getLeadUtmLabel = (lead: any) => {
    const mapping = config?.fieldMapping;
    const utmSource = getLeadCustomFieldValue(lead, mapping?.utmSource);
    const utmMedium = getLeadCustomFieldValue(lead, mapping?.utmMedium);
    const utmCampaign = getLeadCustomFieldValue(lead, mapping?.utmCampaign);

    const parts = [utmSource, utmMedium, utmCampaign]
      .map((v) => (v == null ? '' : String(v).trim()))
      .filter(Boolean);

    return parts.length ? parts.join(' / ') : '—';
  };

  const statusNameById = useCallback(
    (statusId?: number | null) => {
      if (!statusId) return '—';
      for (const pipeline of pipelines) {
        const status = pipeline.statuses?.find((s: any) => s.id === statusId);
        if (status) return status.name;
      }
      return String(statusId);
    },
    [pipelines]
  );

  const userNameById = useCallback(
    (userId?: number | null) => {
      if (!userId) return '—';
      const user = users.find((u) => u.id === userId);
      return user?.name || String(userId);
    },
    [users]
  );

  // Определяем ID статуса "В работе" (первый не-начальный статус в pipeline)
  const inWorkStatusId = useMemo(() => {
    if (!inboundConfig.pipelineId) return undefined;
    const pipeline = pipelines.find((p) => p.id === inboundConfig.pipelineId);
    if (!pipeline?.statuses?.length) return undefined;
    // Берём второй статус (первый обычно "Новый"/"Первичный контакт")
    const sorted = [...pipeline.statuses].sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
    return sorted[1]?.id;
  }, [pipelines, inboundConfig.pipelineId]);

  useEffect(() => {
    const run = async () => {
      if (!workspaceId) return;
      if (!isWizardCompleted) return;
      if (!isConnected) return;

      setIsLoadingKommoLeads(true);
      setKommoLeadsError(null);

      try {
        // Запрашиваем лиды с историей статусов для "Taken into work"
        const params = new URLSearchParams({
          workspaceId,
          limit: '50',
          page: '1',
          includeStatusHistory: 'true',
          ...(inWorkStatusId ? { inWorkStatusId: String(inWorkStatusId) } : {})
        });
        const response = await fetch(`/api/v1/kommo/leads?${params}`, {
          credentials: 'include',
          headers: { 'x-request-from': 'internal' }
        });
        const raw = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(raw?.error || `Failed to load leads (HTTP ${response.status})`);
        }
        setKommoLeads(Array.isArray(raw?.leads) ? raw.leads : []);
      } catch (e: any) {
        setKommoLeadsError(e?.message || 'Failed to load leads');
        setKommoLeads([]);
      } finally {
        setIsLoadingKommoLeads(false);
      }
    };

    run();
  }, [workspaceId, isWizardCompleted, isConnected, inWorkStatusId]);

  const handleAutoMapFields = useCallback(() => {
    const effectiveCustomFields = (customFields.length
      ? customFields
      : ((config?.availableFields || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          code: f.code || '',
          type: f.type,
          entityType: (f.entity_type || 'leads'),
          isRequired: !!f.is_required,
          isEditable: true,
          enums: f.enums?.map((e: any) => ({ id: e.id, value: e.value, sort: 0 }))
        })))) as any[]

    const normalize = (value: unknown) =>
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, ' ')
        .trim()

    const scoreField = (
      field: any,
      opts: {
        codes?: string[]
        tokensAny?: string[]
        tokensAll?: string[]
        preferEntityTypes?: Array<'leads' | 'contacts' | 'companies'>
      }
    ) => {
      const nameNorm = normalize(field?.name)
      const codeNorm = normalize(field?.code)

      let score = 0

      if (Array.isArray(opts.preferEntityTypes) && opts.preferEntityTypes.length) {
        const idx = opts.preferEntityTypes.indexOf(field?.entityType)
        if (idx === 0) score += 10
        if (idx === 1) score += 5
      }

      if (Array.isArray(opts.codes) && opts.codes.length) {
        for (const c of opts.codes) {
          const cNorm = normalize(c)
          if (!cNorm) continue
          if (codeNorm === cNorm) score += 80
          else if (codeNorm.includes(cNorm)) score += 40
        }
      }

      if (Array.isArray(opts.tokensAll) && opts.tokensAll.length) {
        const all = opts.tokensAll.every(t => nameNorm.includes(normalize(t)))
        if (all) score += 60
      }

      if (Array.isArray(opts.tokensAny) && opts.tokensAny.length) {
        const any = opts.tokensAny.some(t => nameNorm.includes(normalize(t)))
        if (any) score += 20
      }

      return score
    }

    const pickBest = (opts: Parameters<typeof scoreField>[1]) => {
      let best: any | null = null
      let bestScore = 0

      for (const f of effectiveCustomFields) {
        const s = scoreField(f, opts)
        if (s > bestScore) {
          best = f
          bestScore = s
        }
      }

      return bestScore >= 20 ? best : null
    }

    const desired: Array<{ capiField: string; pick: Parameters<typeof pickBest>[0] }> = [
      {
        capiField: 'email',
        pick: { codes: ['EMAIL'], tokensAny: ['email', 'e-mail', 'почта'], preferEntityTypes: ['contacts', 'leads'] }
      },
      {
        capiField: 'phone',
        pick: { codes: ['PHONE'], tokensAny: ['phone', 'телефон', 'mobile', 'номер'], preferEntityTypes: ['contacts', 'leads'] }
      },
      {
        capiField: 'utm_source',
        pick: { tokensAll: ['utm', 'source'], tokensAny: ['utm_source'], preferEntityTypes: ['leads'] }
      },
      {
        capiField: 'utm_medium',
        pick: { tokensAll: ['utm', 'medium'], tokensAny: ['utm_medium'], preferEntityTypes: ['leads'] }
      },
      {
        capiField: 'utm_campaign',
        pick: { tokensAll: ['utm', 'campaign'], tokensAny: ['utm_campaign'], preferEntityTypes: ['leads'] }
      },
      {
        capiField: 'utm_content',
        pick: { tokensAll: ['utm', 'content'], tokensAny: ['utm_content'], preferEntityTypes: ['leads'] }
      },
      {
        capiField: 'utm_term',
        pick: { tokensAll: ['utm', 'term'], tokensAny: ['utm_term'], preferEntityTypes: ['leads'] }
      },
      {
        capiField: 'ip_geo_country',
        pick: { tokensAny: ['geo country', 'country', 'страна', 'гео'], preferEntityTypes: ['leads'] }
      },
      {
        capiField: 'ip_geo_city',
        pick: { tokensAny: ['geo city', 'city', 'город', 'гео'], preferEntityTypes: ['leads'] }
      }
    ]

    setMappings(prev => {
      const next = [...prev]
      const indexByCapi = new Map(next.map((m, idx) => [m.capiField, idx]))

      for (const item of desired) {
        const idx = indexByCapi.get(item.capiField)
        if (typeof idx === 'number') {
          const existing = next[idx]
          if (existing?.providerFieldId && existing.providerFieldId > 0) continue
        }

        const match = pickBest(item.pick)
        if (!match?.id) continue

        if (typeof idx === 'number') {
          next[idx] = {
            ...next[idx],
            capiField: item.capiField,
            providerFieldId: match.id,
            providerFieldName: match.name || '',
            entityType: match.entityType || next[idx].entityType,
            isEnabled: true
          }
        } else {
          indexByCapi.set(item.capiField, next.length)
          next.push({
            id: `mapping-auto-${item.capiField}`,
            capiField: item.capiField,
            providerFieldId: match.id,
            providerFieldName: match.name || '',
            entityType: match.entityType || 'leads',
            isEnabled: true
          })
        }
      }

      return next
    })
  }, [customFields, config?.availableFields]);

  // Подтягиваем триггеры из backend, если подключено
  useEffect(() => {
    const load = async () => {
      if (!workspaceId) return
      if (connection?.status !== 'connected') return

      try {
        const resp = await fetch(`/api/v1/kommo/triggers?workspaceId=${workspaceId}`, {
          credentials: 'include',
          headers: { 'x-request-from': 'internal' }
        })
        if (!resp.ok) return
        const data = await resp.json()
        const raw = Array.isArray(data?.triggers) ? data.triggers : []

        const next: CrmEventTrigger[] = raw.map((t: any) => ({
          id: t.id,
          name: t.name || '',
          description: '',
          pipelineId: t.conditions?.pipelineId || 0,
          statusId: t.conditions?.statusId || 0,
          capiEventName: t.actions?.sendCapiEvent?.eventName || '',
          isEnabled: !!t.enabled,
          eventValue: undefined,
          eventCurrency: config?.accountCurrency || undefined
        }))

        setTriggers(next)
      } catch {
        // best-effort
      }
    }

    load()
  }, [workspaceId, connection?.status, config?.accountCurrency]);

  // Автовыбор системного статуса "success" при смене pipeline
  const handlePipelineChange = useCallback((pipelineId: number | null) => {
    const defaultWon = pipelineId ? getDefaultWonStatus(pipelineId) : null;
    setInboundConfig(prev => ({ 
      ...prev, 
      pipelineId, 
      statusId: null, 
      wonStatusId: defaultWon 
    }));
  }, [getDefaultWonStatus]);

  // Навигация по шагам
  const goToNextStep = useCallback(() => {
    if (currentStepIndex < STEP_ORDER.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex]);

  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Маппинги
  const handleAddMapping = useCallback(() => {
    const newMapping: CrmFieldMapping = {
      id: `mapping-${Date.now()}`,
      capiField: "",
      providerFieldId: 0,
      providerFieldName: "",
      entityType: "leads",
      isEnabled: true,
    };
    setMappings(prev => [...prev, newMapping]);
  }, []);

  const handleRemoveMapping = useCallback((mappingId: string) => {
    setMappings(prev => prev.filter(m => m.id !== mappingId));
  }, []);

  const handleUpdateMapping = useCallback((mappingId: string, updates: Partial<CrmFieldMapping>) => {
    setMappings(prev => prev.map(m => m.id === mappingId ? { ...m, ...updates } : m));
  }, []);

  const handleToggleMapping = useCallback((mappingId: string, enabled: boolean) => {
    setMappings(prev => prev.map(m => m.id === mappingId ? { ...m, isEnabled: enabled } : m));
  }, []);

  // Триггеры
  const handleAddTrigger = useCallback(() => {
    const newTrigger: CrmEventTrigger = {
      id: `trigger-${Date.now()}`,
      name: "",
      description: "",
      pipelineId: 0,
      statusId: 0,
      capiEventName: "",
      isEnabled: true,
    };
    setTriggers(prev => [...prev, newTrigger]);
  }, []);

  const handleRemoveTrigger = useCallback((triggerId: string) => {
    setTriggers(prev => prev.filter(t => t.id !== triggerId));
  }, []);

  const handleUpdateTrigger = useCallback((triggerId: string, updates: Partial<CrmEventTrigger>) => {
    setTriggers(prev => prev.map(t => t.id === triggerId ? { ...t, ...updates } : t));
  }, []);

  const handleToggleTrigger = useCallback((triggerId: string, enabled: boolean) => {
    setTriggers(prev => prev.map(t => t.id === triggerId ? { ...t, isEnabled: enabled } : t));
  }, []);

  // Правило распределения (единое)
  const [distributionRule, setDistributionRule] = useState<CrmDistributionRule>({
    id: 'main-rule',
    name: 'Default Distribution',
    assignmentType: 'default',
    assignedUserIds: [],
    isEnabled: true,
  });

  // Обновление правила распределения
  const handleUpdateDistributionRule = useCallback((updates: Partial<CrmDistributionRule>) => {
    setDistributionRule(prev => ({ ...prev, ...updates }));
  }, []);

  // Активация интеграции
  const handleActivate = useCallback(async () => {
    setIsActivating(true);
    try {
      // 1) Inbound config + CAPI feedback settings (uses routing-config under the hood)
      if (workspaceId) {
        const inboundResp = await fetch('/api/v1/kommo/inbound-config', {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-request-from': 'internal'
          },
          body: JSON.stringify({
            workspaceId,
            pipelineId: inboundConfig.pipelineId,
            statusId: inboundConfig.statusId,
            createContact: inboundConfig.createContact,
            createCompany: inboundConfig.createCompany,
            wonStatusId: inboundConfig.wonStatusId,
            sendPurchaseOnWon: inboundConfig.sendPurchaseOnWon,
            includeValueInPurchase: inboundConfig.includeValueInPurchase,
            // B+C+D Attribution Fallback
            sendWithoutAttribution: inboundConfig.sendWithoutAttribution,
            lookupAttributionByPii: inboundConfig.lookupAttributionByPii,
            markOfflineIfNoAttribution: inboundConfig.markOfflineIfNoAttribution
          })
        })
        if (!inboundResp.ok) {
          const raw = await inboundResp.json().catch(() => null)
          throw new Error(raw?.error || 'Failed to save inbound config')
        }
      }

      // 2) Field mapping (persisted in KommoConfig.fieldMapping)
      if (workspaceId) {
        const fieldMapping: any = {}
        const capiToKey: Record<string, string> = {
          email: 'email',
          phone: 'phone',
          utm_source: 'utmSource',
          utm_campaign: 'utmCampaign',
          utm_medium: 'utmMedium',
          utm_content: 'utmContent',
          utm_term: 'utmTerm',
          ip_geo_country: 'ipGeoCountry',
          ip_geo_city: 'ipGeoCity'
        }

        for (const m of mappings) {
          if (!m.isEnabled) continue
          if (!m.capiField || !m.providerFieldId) continue
          const key = capiToKey[m.capiField]
          if (!key) continue
          fieldMapping[key] = m.providerFieldId
        }

        const mappingResp = await fetch('/api/v1/kommo/config/field-mapping', {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-request-from': 'internal'
          },
          body: JSON.stringify({ workspaceId, fieldMapping })
        })

        if (!mappingResp.ok) {
          const raw = await mappingResp.json().catch(() => null)
          throw new Error(raw?.error || 'Failed to save field mapping')
        }
      }

      // 3) Triggers (Kommo trigger automation with sendCapiEvent)
      if (workspaceId) {
        const updatedTriggers: CrmEventTrigger[] = []

        for (const t of triggers) {
          const name = (t.name || '').trim() || 'Kommo → CAPI trigger'
          const payload = {
            name,
            enabled: !!t.isEnabled,
            conditions: {
              eventType: 'status_lead',
              pipelineId: t.pipelineId || undefined,
              statusId: t.statusId || undefined
            },
            actions: {
              sendCapiEvent: {
                eventName: t.capiEventName,
                includeValue: t.capiEventName === 'Purchase',
                includeCurrency: true,
                useStoredAttribution: true
              }
            }
          }

          // Existing trigger (uuid) -> PATCH; new local trigger -> POST
          const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id)

          if (looksLikeUuid) {
            const resp = await fetch(`/api/v1/kommo/triggers/${t.id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'x-request-from': 'internal'
              },
              body: JSON.stringify(payload)
            })
            if (!resp.ok) {
              const raw = await resp.json().catch(() => null)
              throw new Error(raw?.error || `Failed to update trigger ${t.id}`)
            }
            updatedTriggers.push(t)
          } else {
            const resp = await fetch('/api/v1/kommo/triggers', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'x-request-from': 'internal'
              },
              body: JSON.stringify({ workspaceId, ...payload })
            })
            if (!resp.ok) {
              const raw = await resp.json().catch(() => null)
              throw new Error(raw?.error || 'Failed to create trigger')
            }
            const data = await resp.json().catch(() => null)
            const id = data?.trigger?.id
            updatedTriggers.push(id ? { ...t, id } : t)
          }
        }

        setTriggers(updatedTriggers)
      }

      // 4) Save wizard state + default responsible user
      await saveConfig({
        wizardCompleted: true,
        defaultResponsibleUserId: distributionRule.defaultUserId,
        distributionRule
      })

      // После завершения визарда показываем CRM settings (аналог FB settings), а не возвращаемся на Connect.
      navigate('/crm', { replace: true });
    } finally {
      setIsActivating(false);
    }
  }, [workspaceId, inboundConfig, mappings, triggers, distributionRule, saveConfig, navigate]);

  const handleSaveSettings = useCallback(async () => {
    if (!workspaceId) return;

    setIsSavingSettings(true);
    setSettingsSaveError(null);
    try {
      const inboundResp = await fetch('/api/v1/kommo/inbound-config', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-request-from': 'internal'
        },
        body: JSON.stringify({
          workspaceId,
          pipelineId: inboundConfig.pipelineId,
          statusId: inboundConfig.statusId,
          createContact: inboundConfig.createContact,
          createCompany: inboundConfig.createCompany,
          wonStatusId: inboundConfig.wonStatusId,
          sendPurchaseOnWon: inboundConfig.sendPurchaseOnWon,
          includeValueInPurchase: inboundConfig.includeValueInPurchase,
          // B+C+D Attribution Fallback
          sendWithoutAttribution: inboundConfig.sendWithoutAttribution,
          lookupAttributionByPii: inboundConfig.lookupAttributionByPii,
          markOfflineIfNoAttribution: inboundConfig.markOfflineIfNoAttribution
        })
      });

      if (!inboundResp.ok) {
        const raw = await inboundResp.json().catch(() => null);
        throw new Error(raw?.error || 'Failed to save inbound settings');
      }

      const ok = await saveConfig({
        wizardCompleted: true,
        defaultResponsibleUserId: distributionRule.defaultUserId,
        distributionRule
      });

      if (!ok) {
        throw new Error('Failed to save distribution settings');
      }
    } catch (e: any) {
      setSettingsSaveError(e?.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  }, [workspaceId, inboundConfig, distributionRule, saveConfig]);

  // Рендер текущего шага
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'connect':
        return (
          <ConnectStep
            status={connection?.status || 'disconnected'}
            accountDomain={connection?.accountDomain}
            onConnect={connect}
            onDisconnect={disconnect}
            isLoading={isLoading}
            errorMessage={error}
          />
        );
      case 'inbound':
        return (
          <InboundStep
            pipelines={pipelines}
            selectedPipelineId={inboundConfig.pipelineId}
            selectedStatusId={inboundConfig.statusId}
            createContact={inboundConfig.createContact}
            createCompany={inboundConfig.createCompany}
            onPipelineChange={handlePipelineChange}
            onStatusChange={(statusId) => setInboundConfig(prev => ({ ...prev, statusId }))}
            onCreateContactChange={(create) => setInboundConfig(prev => ({ ...prev, createContact: create }))}
            onCreateCompanyChange={(create) => setInboundConfig(prev => ({ ...prev, createCompany: create }))}
            onNext={goToNextStep}
            onBack={goToPrevStep}
          />
        );
      case 'fields':
        return (
          <FieldsStep
            workspaceId={workspaceId || undefined}
            customFields={customFields.length ? customFields : ((config?.availableFields || []).map((f: any) => ({
              id: f.id,
              name: f.name,
              code: f.code || '',
              type: f.type,
              entityType: (f.entity_type || 'leads'),
              isRequired: !!f.is_required,
              isEditable: true,
              enums: f.enums?.map((e: any) => ({ id: e.id, value: e.value, sort: 0 }))
            })))}
            mappings={mappings}
            onAddMapping={handleAddMapping}
            onRemoveMapping={handleRemoveMapping}
            onUpdateMapping={handleUpdateMapping}
            onToggleMapping={handleToggleMapping}
            onAutoMap={handleAutoMapFields}
            onRefreshMetadata={loadMetadata}
            onNext={goToNextStep}
            onBack={goToPrevStep}
          />
        );
      case 'events':
        return (
          <EventsStep
            pipelines={pipelines}
            selectedPipelineId={inboundConfig.pipelineId}
            wonStatusId={inboundConfig.wonStatusId}
            sendPurchaseOnWon={inboundConfig.sendPurchaseOnWon}
            includeValueInPurchase={inboundConfig.includeValueInPurchase}
            accountCurrency={config?.accountCurrency}
            accountCurrencySymbol={config?.accountCurrencySymbol}
            // B+C+D Attribution Fallback
            sendWithoutAttribution={inboundConfig.sendWithoutAttribution}
            lookupAttributionByPii={inboundConfig.lookupAttributionByPii}
            markOfflineIfNoAttribution={inboundConfig.markOfflineIfNoAttribution}
            onWonStatusChange={(wonStatusId) => setInboundConfig(prev => ({ ...prev, wonStatusId }))}
            onSendPurchaseOnWonChange={(send) => setInboundConfig(prev => ({ ...prev, sendPurchaseOnWon: send }))}
            onIncludeValueChange={(include) => setInboundConfig(prev => ({ ...prev, includeValueInPurchase: include }))}
            // B+C+D callbacks
            onSendWithoutAttributionChange={(send) => setInboundConfig(prev => ({ ...prev, sendWithoutAttribution: send }))}
            onLookupAttributionByPiiChange={(lookup) => setInboundConfig(prev => ({ ...prev, lookupAttributionByPii: lookup }))}
            onMarkOfflineIfNoAttributionChange={(mark) => setInboundConfig(prev => ({ ...prev, markOfflineIfNoAttribution: mark }))}
            triggers={triggers}
            onAddTrigger={handleAddTrigger}
            onRemoveTrigger={handleRemoveTrigger}
            onUpdateTrigger={handleUpdateTrigger}
            onToggleTrigger={handleToggleTrigger}
            onNext={goToNextStep}
            onBack={goToPrevStep}
          />
        );
      case 'distribution':
        return (
          <DistributionStep
            users={users}
            rule={distributionRule}
            onUpdateRule={handleUpdateDistributionRule}
            onNext={goToNextStep}
            onBack={goToPrevStep}
          />
        );
      case 'review':
        return (
          <ReviewStep
            connection={connection}
            pipelines={pipelines}
            users={users}
            inboundConfig={inboundConfig}
            mappings={mappings}
            triggers={triggers}
            distributionRule={distributionRule}
            isActivating={isActivating}
            onActivate={handleActivate}
            onBack={goToPrevStep}
          />
        );
    }
  };

  // Динамический подзаголовок в зависимости от шага
  const getSubtitle = () => {
    if (isWizardCompleted) {
      return "Kommo CRM is connected. Review your configuration below.";
    }
    switch (currentStep) {
      case 'connect':
        return "Establish a secure OAuth 2.0 connection to sync your leads and events.";
      case 'inbound':
        return "Choose where new incoming leads should be created within your sales pipeline.";
      case 'fields':
        return "Define how CRM actions translate into Facebook events. Choose event templates and map data fields.";
      case 'events':
        return "Configure which Kommo status changes trigger CAPI events for conversion tracking.";
      case 'distribution':
        return "Configure who receives leads from Kommo by default and how they are distributed among your team.";
      case 'review':
        return "Please review your configuration settings below before enabling the Kommo CRM integration. Ensure all mappings and permissions are correct.";
      default:
        return "Configure your Kommo CRM integration settings.";
    }
  };

  // Динамический заголовок
  const getTitle = () => {
    if (isWizardCompleted) {
      return "CRM Settings";
    }
    if (currentStep === 'distribution') {
      return "Setup Lead Assignment";
    }
    if (currentStep === 'review') {
      return "Review & Activate Integration";
    }
    return "CRM";
  };

  const inboundPipelineId = inboundConfig.pipelineId ?? null;
  const inboundStatusId = inboundConfig.statusId ?? null;
  const wonStatusId = inboundConfig.wonStatusId ?? null;

  const inboundPipeline = inboundPipelineId ? pipelines.find(p => p.id === inboundPipelineId) : undefined;
  const availableStatuses = inboundPipeline?.statuses || [];

  const assignmentType = distributionRule.assignmentType as string | undefined;
  const defaultManagerId = distributionRule.defaultUserId ?? config?.defaultResponsibleUserId;

  const assignmentTypeLabel: Record<string, string> = {
    'default': 'Default manager',
    'round-robin': 'Round-robin',
    'random': 'Random',
    'weighted': 'Weighted',
    'workload': 'Workload',
    'schedule': 'Schedule',
    'condition': 'Conditions'
  };

  const createTaskOnAssign = !!distributionRule.createTaskOnAssign;
  const taskTextTemplate = distributionRule.taskTextTemplate;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/projects')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-display-lg text-foreground">
              {getTitle()}
            </h1>
            <p className="text-body-sm text-muted-foreground">
              {getSubtitle()}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full">
        {isWizardCompleted ? (
          <div className="mx-auto w-full max-w-[1200px] pt-8 pb-12 px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-foreground font-semibold">
                      {(config?.accountName || config?.subdomain || 'K').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground" data-testid="text-crm-account-name">
                        {config?.accountName || config?.subdomain || 'Kommo'}
                      </h4>
                      <p className="text-xs text-muted-foreground" data-testid="text-crm-account-id">
                        Account ID: {config?.accountId || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-crm-subdomain">
                        Subdomain: {config?.subdomain || '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {isConnected ? (
                      <div className="mt-1 size-5 rounded-full bg-status-online/10 border border-status-online/20 flex items-center justify-center">
                        <div className="size-2 rounded-full bg-status-online" />
                      </div>
                    ) : (
                      <div className="mt-1 size-5 rounded-full bg-status-away/10 border border-status-away/20 flex items-center justify-center">
                        <div className="size-2 rounded-full bg-status-away" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-foreground" data-testid="text-crm-connection-status">
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </h4>
                      <p className="text-xs text-muted-foreground" data-testid="text-crm-connection-label">
                        Kommo CRM connection
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-crm-connection-date">
                        {config?.lastSyncAt ? new Date(config.lastSyncAt).toLocaleDateString() : (connection?.connectedAt ? connection.connectedAt.toLocaleDateString() : new Date().toLocaleDateString())}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground" data-testid="text-crm-config-title">CRM configuration</h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-crm-config-subtitle">
                        Values selected during integration setup.
                      </p>
                    </div>

                    <div className="border-t border-border" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Default pipeline</div>
                        <Select
                          value={inboundConfig.pipelineId ? inboundConfig.pipelineId.toString() : ''}
                          onValueChange={(v) => handlePipelineChange(v ? Number(v) : null)}
                        >
                          <SelectTrigger className="w-full" data-testid="select-crm-default-pipeline">
                            <SelectValue placeholder="Select pipeline..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border max-h-[300px]">
                            {pipelines.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">New lead status</div>
                        <Select
                          value={inboundConfig.statusId ? inboundConfig.statusId.toString() : ''}
                          onValueChange={(v) => setInboundConfig(prev => ({ ...prev, statusId: v ? Number(v) : null }))}
                          disabled={!inboundPipelineId}
                        >
                          <SelectTrigger className="w-full" data-testid="select-crm-new-lead-status">
                            <SelectValue placeholder={inboundPipelineId ? "Select status..." : "Select pipeline first"} />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border max-h-[300px]">
                            {availableStatuses.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Won lead status</div>
                        <Select
                          value={inboundConfig.wonStatusId ? inboundConfig.wonStatusId.toString() : ''}
                          onValueChange={(v) => setInboundConfig(prev => ({ ...prev, wonStatusId: v ? Number(v) : null }))}
                          disabled={!inboundPipelineId}
                        >
                          <SelectTrigger className="w-full" data-testid="select-crm-won-status">
                            <SelectValue placeholder={inboundPipelineId ? "Select status..." : "Select pipeline first"} />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border max-h-[300px]">
                            {availableStatuses.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.name}{s.type === 'success' ? ' (Success)' : s.type === 'fail' ? ' (Fail)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="pt-2" data-testid="section-crm-distribution">
                      <KommoDistributionStep
                        users={users}
                        rule={distributionRule as any}
                        onUpdateRule={handleUpdateDistributionRule as any}
                        onNext={() => {}}
                        onBack={() => {}}
                        showNavigation={false}
                        className="p-0 md:p-0"
                      />
                    </div>

                    <div className="pt-6" data-testid="section-crm-leads-table">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-foreground">Lead tracking</h3>
                          <p className="text-sm text-muted-foreground">
                            Recent leads from Kommo.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 overflow-auto rounded-md border border-border">
                        <table className="w-full">
                          <thead className="bg-muted sticky top-0 z-20">
                            <tr>
                              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left">Lead ID</th>
                              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left">Created</th>
                              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left">UTM</th>
                              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left">Manager</th>
                              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left">Taken into work</th>
                              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left">Processed</th>
                              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left">Current status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoadingKommoLeads ? (
                              <tr className="border-b border-border last:border-b-0">
                                <td className="py-4 px-4 text-sm text-muted-foreground" colSpan={7}>
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading leads...
                                  </span>
                                </td>
                              </tr>
                            ) : kommoLeadsError ? (
                              <tr className="border-b border-border last:border-b-0">
                                <td className="py-4 px-4 text-sm text-destructive" colSpan={7}>
                                  {kommoLeadsError}
                                </td>
                              </tr>
                            ) : kommoLeads.length === 0 ? (
                              <tr className="border-b border-border last:border-b-0">
                                <td className="py-4 px-4 text-sm text-muted-foreground" colSpan={7}>
                                  No leads found.
                                </td>
                              </tr>
                            ) : (
                              kommoLeads.map((lead, index) => (
                                <tr key={lead?.id ?? index} className="group border-b border-border last:border-b-0 hover:bg-muted/50">
                                  <td className="py-3 px-4 text-sm text-foreground font-mono">{lead?.id ?? '—'}</td>
                                  <td className="py-3 px-4 text-sm text-foreground">{formatUnixSeconds(lead?.created_at)}</td>
                                  <td className="py-3 px-4 text-sm text-foreground">{getLeadUtmLabel(lead)}</td>
                                  <td className="py-3 px-4 text-sm text-foreground">{userNameById(lead?.responsible_user_id)}</td>
                                  <td className="py-3 px-4 text-sm text-foreground">{formatUnixSeconds(lead?._takenIntoWorkAt)}</td>
                                  <td className="py-3 px-4 text-sm text-muted-foreground">—</td>
                                  <td className="py-3 px-4 text-sm text-foreground">{statusNameById(lead?.status_id)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {settingsSaveError && (
                      <div className="text-sm text-destructive" data-testid="text-crm-save-error">
                        {settingsSaveError}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        className="px-6"
                        data-testid="button-crm-save-settings"
                      >
                        {isSavingSettings ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          'Save changes'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 lg:grid-cols-[1fr_320px] pt-8 pb-12 px-6 lg:px-8 gap-8 items-stretch">
            {/* Left side - main content */}
            <div className="flex min-w-0 flex-col gap-6 h-full">
              {/* Step content */}
              {currentStep === 'connect' ? (
                // Connect step with CRM selector
                <div className="relative bg-card rounded-xl border border-border overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:h-1 before:w-28 before:bg-status-online before:rounded-br-full flex flex-col flex-1">
                  <div className="flex flex-col flex-1 min-h-[600px]">
                    {/* CRM Selector */}
                    <div className="p-6 border-b border-border">
                      <label className="block text-body-sm font-medium text-foreground mb-2">
                        Select CRM Platform
                      </label>
                      <Select value={selectedCrm || undefined} onValueChange={setSelectedCrm}>
                        <SelectTrigger className="w-full h-12">
                          <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-muted-foreground" />
                            <SelectValue placeholder="Choose your CRM..." />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kommo">
                            <div className="flex items-center gap-3">
                              <img src={KOMMO_LOGO_SRC} alt="Kommo" className="w-5 h-5 object-contain" />
                              <span>Kommo (formerly AmoCRM)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="hubspot" disabled>
                            <div className="flex items-center gap-3 opacity-50">
                              <span className="w-5 h-5 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">H</span>
                              <span>HubSpot</span>
                              <span className="text-xs text-muted-foreground">(Coming soon)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="pipedrive" disabled>
                            <div className="flex items-center gap-3 opacity-50">
                              <span className="w-5 h-5 bg-green-600 rounded text-white text-xs flex items-center justify-center font-bold">P</span>
                              <span>Pipedrive</span>
                              <span className="text-xs text-muted-foreground">(Coming soon)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="zoho" disabled>
                            <div className="flex items-center gap-3 opacity-50">
                              <span className="w-5 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">Z</span>
                              <span>Zoho CRM</span>
                              <span className="text-xs text-muted-foreground">(Coming soon)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ConnectStep показывается только после выбора Kommo */}
                    {selectedCrm === 'kommo' ? (
                      renderCurrentStep()
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                        <div className="size-16 bg-muted rounded-full flex items-center justify-center mb-4">
                          <Database className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-h2 text-foreground mb-2">Select a CRM Platform</h3>
                        <p className="text-body text-muted-foreground max-w-sm">
                          Choose your CRM from the dropdown above to begin the integration setup.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Остальные шаги - без карточки, контент напрямую
                <div className="flex flex-col">
                  {renderCurrentStep()}
                </div>
              )}

              {/* Navigation for Connect step */}
              {currentStep === 'connect' && selectedCrm === 'kommo' && connection?.status === 'connected' && (
                <div className="flex justify-end">
                  <Button onClick={goToNextStep} className="group px-8 py-3 font-bold">
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              )}

            </div>

            {/* Right side - steps sidebar (sticky, aligned with content top) */}
            <div className="hidden lg:block w-[320px] shrink-0">
              <div className="sticky top-8">
                <SetupSteps
                  currentStep={currentStepIndex}
                  steps={SETUP_STEPS}
                  onStepClick={(stepIndex) => setCurrentStepIndex(stepIndex)}
                />
              </div>
            </div>

            {/* Feature cards - только на шаге Connect (на всю ширину контейнера) */}
            {currentStep === 'connect' && (
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl border border-border bg-card flex flex-col gap-4 hover:border-primary/50 transition-colors group cursor-default shadow-sm">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <RefreshCw className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-h3 text-foreground mb-2">Pipelines and statuses</h3>
                    <p className="text-body text-muted-foreground">Events are updated instantly across both platforms.</p>
                  </div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card flex flex-col gap-4 hover:border-primary/50 transition-colors group cursor-default shadow-sm">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Filter className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-h3 text-foreground mb-2">Users (managers)</h3>
                    <p className="text-body text-muted-foreground">Control which leads are imported based on pipeline stages.</p>
                  </div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card flex flex-col gap-4 hover:border-primary/50 transition-colors group cursor-default shadow-sm">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <History className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-h3 text-foreground mb-2">Custom fields</h3>
                    <p className="text-body text-muted-foreground">Track all synchronization activities and errors easily.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
