import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, RefreshCw, Filter, History, Loader2 } from "lucide-react";
import { useKommo } from "@/hooks/useKommo";
import {
  SetupSteps,
  ConnectStep,
  InboundStep,
  FieldsStep,
  EventsStep,
  DistributionStep,
  ReviewStep,
  type KommoSetupStep,
  type KommoFieldMapping,
  type KommoEventTrigger,
  type KommoDistributionRule,
} from "@/components/kommo";

// Конфигурация шагов визарда (по макету Zkommo1)
const SETUP_STEPS = [
  { title: "Connect", description: "Connect your Kommo account securely via OAuth 2.0." },
  { title: "Inbound", description: "Define how incoming leads from Facebook are created in Kommo." },
  { title: "Fields", description: "Map Facebook CAPI parameters to your Kommo CRM fields." },
  { title: "Events", description: "Configure which Kommo status changes trigger CAPI events." },
  { title: "Distribution", description: "Set up rules for automatically distributing new leads to managers." },
  { title: "Review", description: "Review your setup and activate the Kommo integration." },
];

const STEP_ORDER: KommoSetupStep[] = ['connect', 'inbound', 'fields', 'events', 'distribution', 'review'];

/**
 * Страница настройки интеграции Kommo CRM
 * 6-шаговый визард для полной конфигурации интеграции
 * Использует useKommo хук для работы с реальным API
 */
export default function CrmPage() {
  const navigate = useNavigate();
  
  // Хук для работы с Kommo API
  const {
    connection,
    isLoading,
    pipelines,
    users,
    customFields,
    config,
    connect,
    disconnect,
    saveConfig,
    getDefaultWonStatus
  } = useKommo();
  
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
  });

  // Маппинги полей
  const [mappings, setMappings] = useState<KommoFieldMapping[]>([]);

  // Триггеры событий
  const [triggers, setTriggers] = useState<KommoEventTrigger[]>([]);

  // Состояние активации
  const [isActivating, setIsActivating] = useState(false);

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
      });
    }
  }, [config]);

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
    const newMapping: KommoFieldMapping = {
      id: `mapping-${Date.now()}`,
      capiField: "",
      kommoFieldId: 0,
      kommoFieldName: "",
      entityType: "leads",
      isEnabled: true,
    };
    setMappings(prev => [...prev, newMapping]);
  }, []);

  const handleRemoveMapping = useCallback((mappingId: string) => {
    setMappings(prev => prev.filter(m => m.id !== mappingId));
  }, []);

  const handleUpdateMapping = useCallback((mappingId: string, updates: Partial<KommoFieldMapping>) => {
    setMappings(prev => prev.map(m => m.id === mappingId ? { ...m, ...updates } : m));
  }, []);

  const handleToggleMapping = useCallback((mappingId: string, enabled: boolean) => {
    setMappings(prev => prev.map(m => m.id === mappingId ? { ...m, isEnabled: enabled } : m));
  }, []);

  // Триггеры
  const handleAddTrigger = useCallback(() => {
    const newTrigger: KommoEventTrigger = {
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

  const handleUpdateTrigger = useCallback((triggerId: string, updates: Partial<KommoEventTrigger>) => {
    setTriggers(prev => prev.map(t => t.id === triggerId ? { ...t, ...updates } : t));
  }, []);

  const handleToggleTrigger = useCallback((triggerId: string, enabled: boolean) => {
    setTriggers(prev => prev.map(t => t.id === triggerId ? { ...t, isEnabled: enabled } : t));
  }, []);

  // Правило распределения (единое)
  const [distributionRule, setDistributionRule] = useState<KommoDistributionRule>({
    id: 'main-rule',
    name: 'Default Distribution',
    assignmentType: 'default',
    assignedUserIds: [],
    isEnabled: true,
  });

  // Обновление правила распределения
  const handleUpdateDistributionRule = useCallback((updates: Partial<KommoDistributionRule>) => {
    setDistributionRule(prev => ({ ...prev, ...updates }));
  }, []);

  // Активация интеграции
  const handleActivate = useCallback(async () => {
    setIsActivating(true);
    try {
      // TODO: Отправить конфигурацию на backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      navigate('/projects');
    } finally {
      setIsActivating(false);
    }
  }, [navigate]);

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
          />
        );
      case 'inbound':
        return (
          <InboundStep
            pipelines={pipelines}
            selectedPipelineId={inboundConfig.pipelineId}
            selectedStatusId={inboundConfig.statusId}
            wonStatusId={inboundConfig.wonStatusId}
            sendPurchaseOnWon={inboundConfig.sendPurchaseOnWon}
            includeValueInPurchase={inboundConfig.includeValueInPurchase}
            accountCurrency={config?.accountCurrency}
            accountCurrencySymbol={config?.accountCurrencySymbol}
            createContact={inboundConfig.createContact}
            createCompany={inboundConfig.createCompany}
            onPipelineChange={handlePipelineChange}
            onStatusChange={(statusId) => setInboundConfig(prev => ({ ...prev, statusId }))}
            onWonStatusChange={(wonStatusId) => setInboundConfig(prev => ({ ...prev, wonStatusId }))}
            onSendPurchaseOnWonChange={(send) => setInboundConfig(prev => ({ ...prev, sendPurchaseOnWon: send }))}
            onIncludeValueChange={(include) => setInboundConfig(prev => ({ ...prev, includeValueInPurchase: include }))}
            onCreateContactChange={(create) => setInboundConfig(prev => ({ ...prev, createContact: create }))}
            onCreateCompanyChange={(create) => setInboundConfig(prev => ({ ...prev, createCompany: create }))}
            onNext={goToNextStep}
            onBack={goToPrevStep}
          />
        );
      case 'fields':
        return (
          <FieldsStep
            customFields={customFields}
            mappings={mappings}
            onAddMapping={handleAddMapping}
            onRemoveMapping={handleRemoveMapping}
            onUpdateMapping={handleUpdateMapping}
            onToggleMapping={handleToggleMapping}
            onNext={goToNextStep}
            onBack={goToPrevStep}
          />
        );
      case 'events':
        return (
          <EventsStep
            pipelines={pipelines}
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
    if (currentStep === 'distribution') {
      return "Setup Lead Assignment";
    }
    if (currentStep === 'review') {
      return "Review & Activate Integration";
    }
    return "Configure Kommo Integration";
  };

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
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 lg:grid-cols-[1fr_320px] pt-8 pb-12 px-6 lg:px-8 gap-8">
          {/* Left side - main content */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* Step content */}
            {currentStep === 'connect' ? (
              // Connect step
              <div className="relative bg-card rounded-xl border border-border overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:h-1 before:w-28 before:bg-status-online before:rounded-br-full">
                <div className="flex flex-col min-h-[480px]">
                  {renderCurrentStep()}
                </div>
              </div>
            ) : (
              // Остальные шаги - без карточки, контент напрямую
              <div className="flex flex-col">
                {renderCurrentStep()}
              </div>
            )}

            {/* Navigation for Connect step */}
            {currentStep === 'connect' && connection?.status === 'connected' && (
              <div className="flex justify-end">
                <Button onClick={goToNextStep} className="group px-8 py-3 font-bold">
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            )}

          </div>

          {/* Right side - steps sidebar (sticky, aligned with content top) - hidden on review */}
          {currentStep !== 'review' && (
            <div className="hidden lg:block w-[320px] shrink-0">
              <div className="sticky top-8">
                <SetupSteps currentStep={currentStepIndex} steps={SETUP_STEPS} />
              </div>
            </div>
          )}

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
      </main>
    </div>
  );
}
