import { Button } from "@/components/ui/button";
import { 
  ArrowRight,
  Edit,
  Eye,
  Link,
  Loader2,
  RefreshCw,
  Rocket,
  Send,
  ShoppingCart,
  Split,
  UserCheck,
  Users,
} from "lucide-react";
import type { 
  KommoConnection,
  KommoDistributionRule, 
  KommoEventTrigger, 
  KommoFieldMapping, 
  KommoPipeline,
  KommoUser
} from "./types";

interface ReviewStepProps {
  connection: KommoConnection | null;
  pipelines: KommoPipeline[];
  users: KommoUser[];
  inboundConfig: {
    pipelineId: number | null;
    statusId: number | null;
    createContact: boolean;
    createCompany: boolean;
  };
  mappings: KommoFieldMapping[];
  triggers: KommoEventTrigger[];
  distributionRule: KommoDistributionRule;
  isActivating: boolean;
  onActivate: () => void;
  onBack: () => void;
}

/**
 * Шаг 6: Проверка и активация интеграции
 * Показывает сводку всех настроек перед активацией
 */
export function ReviewStep({
  connection,
  pipelines,
  users,
  inboundConfig,
  mappings,
  triggers,
  distributionRule,
  isActivating,
  onActivate,
  onBack,
}: ReviewStepProps) {
  const KOMMO_LOGO_SRC = `${import.meta.env.BASE_URL}images/kommo.png`;

  // Получаем названия по ID
  const getStatusName = (pipelineId: number, statusId: number) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    const status = pipeline?.statuses.find(s => s.id === statusId);
    return status?.name || 'Not selected';
  };

  const getPipelineName = (pipelineId: number) => {
    return pipelines.find(p => p.id === pipelineId)?.name || 'Not selected';
  };

  // Получение названия типа распределения
  const getAssignmentTypeName = (type: string) => {
    const types: Record<string, string> = {
      'default': 'Default Manager',
      'round-robin': 'Round Robin',
      'random': 'Random',
      'weighted': 'Weighted %',
      'workload': 'By Workload',
      'schedule': 'By Schedule',
      'condition': 'By Conditions',
    };
    return types[type] || type;
  };

  // Активные триггеры
  const activeTriggers = triggers.filter(t => t.isEnabled);

  // Менеджеры для round-robin
  const assignedUsers = users.filter(u => 
    (distributionRule.assignedUserIds || []).includes(u.id)
  );

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 md:p-10">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Connection Card */}
        <div className="bg-card rounded-xl border border-card-border p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-h3 flex items-center gap-2">
              <Link className="w-4 h-4 text-primary" />
              Connection
            </h3>
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="bg-muted p-1.5 rounded-lg border border-border shrink-0">
              <img 
                src={KOMMO_LOGO_SRC}
                alt="Kommo" 
                className="size-9 rounded-lg object-contain"
              />
            </div>
            <div className="flex flex-col">
              <p className="text-body-sm font-medium">Kommo CRM</p>
              <p className="text-body-sm text-muted-foreground">{connection?.accountDomain || 'Not connected'}</p>
            </div>
            <div className="ml-auto">
              {connection?.status === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-online/10 text-status-online text-body-sm font-medium uppercase tracking-wider border border-status-online/20">
                  <span className="size-1.5 rounded-full bg-status-online animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-body-sm font-medium uppercase tracking-wider border border-destructive/20">
                  Disconnected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Settings Card */}
        <div className="bg-card rounded-xl border border-card-border p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-h3 flex items-center gap-2">
              <Split className="w-4 h-4 text-primary" />
              Pipeline Settings
            </h3>
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 mt-1">
            <div>
              <p className="text-body-sm uppercase font-medium text-muted-foreground mb-0.5">Target Pipeline</p>
              <p className="text-label">
                {inboundConfig.pipelineId ? getPipelineName(inboundConfig.pipelineId) : 'Not selected'}
              </p>
            </div>
            <div className="w-full h-px bg-border" />
            <div>
              <p className="text-body-sm uppercase font-medium text-muted-foreground mb-0.5">Initial Status</p>
              <div className="flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-body-sm font-medium bg-muted px-1.5 py-0.5 rounded-md">
                  {inboundConfig.pipelineId && inboundConfig.statusId 
                    ? getStatusName(inboundConfig.pipelineId, inboundConfig.statusId)
                    : 'Not selected'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Card */}
        <div className="bg-card rounded-xl border border-card-border p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-h3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Distribution
            </h3>
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div>
              <p className="text-body-sm uppercase font-medium text-muted-foreground mb-0.5">Method</p>
              <p className="text-body-sm font-medium flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" />
                {getAssignmentTypeName(distributionRule.assignmentType)}
              </p>
            </div>
            <div>
              <p className="text-body-sm uppercase font-medium text-muted-foreground mb-0.5">Assigned Team</p>
              <p className="text-body-sm font-medium">
                {assignedUsers.length > 0 ? `${assignedUsers.length} members` : 'Not assigned'}
              </p>
            </div>
            {assignedUsers.length > 0 && (
              <div className="col-span-2 pt-1.5">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {assignedUsers.slice(0, 3).map((user, idx) => (
                    <div 
                      key={user.id}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-card bg-primary/20 text-primary text-body-sm font-medium"
                    >
                      {user.name.charAt(0)}
                    </div>
                  ))}
                  {assignedUsers.length > 3 && (
                    <div className="flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-card bg-muted text-body-sm font-medium text-muted-foreground">
                      +{assignedUsers.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Outbound Events Card */}
        <div className="bg-card rounded-xl border border-card-border p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-h3 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Outbound Events
            </h3>
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            {activeTriggers.length > 0 ? (
              activeTriggers.slice(0, 3).map((trigger) => (
                <div 
                  key={trigger.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center gap-2.5">
                    {trigger.capiEventName === 'Purchase' && <ShoppingCart className="w-4 h-4 text-muted-foreground" />}
                    {trigger.capiEventName === 'ViewContent' && <Eye className="w-4 h-4 text-muted-foreground" />}
                    {trigger.capiEventName === 'CompleteRegistration' && <UserCheck className="w-4 h-4 text-muted-foreground" />}
                    {!['Purchase', 'ViewContent', 'CompleteRegistration'].includes(trigger.capiEventName) && (
                      <Send className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-body-sm font-medium uppercase text-muted-foreground">{trigger.name}</span>
                      <span className="text-body-sm font-medium">{trigger.capiEventName}</span>
                    </div>
                  </div>
                  <div className="px-1.5 py-0.5 rounded-md bg-status-online/10 text-status-online text-body-sm font-medium">Active</div>
                </div>
              ))
            ) : (
              <div className="text-center py-3 text-muted-foreground text-body-sm">
                No events configured
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse md:flex-row gap-3 md:justify-between pt-5 border-t border-border mt-2">
        <Button 
          variant="outline" 
          onClick={onBack} 
          disabled={isActivating}
          className="transition-colors"
        >
          Back
        </Button>
        <Button 
          onClick={onActivate} 
          disabled={isActivating}
          className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          {isActivating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Activating...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Activate Integration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
