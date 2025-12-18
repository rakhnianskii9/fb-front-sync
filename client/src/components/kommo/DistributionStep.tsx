import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  BadgeCheck,
  BarChart3,
  Clock, 
  GripVertical,
  Info, 
  PieChart, 
  Plus, 
  Shuffle, 
  Tags,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { 
  KommoAssignmentType, 
  KommoDistributionRule, 
  KommoUser,
  KommoWeightedUser,
  KommoDistributionCondition,
  KommoConditionField,
  KommoConditionOperator,
} from "./types";

// Типы распределения с описаниями (по макету Zkommo4)
const ASSIGNMENT_TYPES: { 
  id: KommoAssignmentType; 
  name: string; 
  description: string; 
  icon: typeof Tags;
}[] = [
  { id: 'condition', name: 'By UTM', description: 'Based on tags', icon: Tags },
  { id: 'schedule', name: 'By Time', description: 'Working hours', icon: Clock },
  { id: 'workload', name: 'By Load', description: 'Load balancing', icon: TrendingUp },
  { id: 'weighted', name: 'By % of total flow', description: 'Percentage split', icon: PieChart },
  { id: 'random', name: 'Random Assignment', description: 'Random selection', icon: Shuffle },
  { id: 'default', name: 'By Default', description: 'Default rule', icon: BadgeCheck },
];

interface DistributionStepProps {
  users: KommoUser[];
  rule: KommoDistributionRule;
  onUpdateRule: (updates: Partial<KommoDistributionRule>) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Шаг 5: Настройка распределения лидов между менеджерами
 * Определяет правила автоматического назначения ответственных
 */
export function DistributionStep({
  users,
  rule,
  onUpdateRule,
  onNext,
  onBack,
}: DistributionStepProps) {
  const activeUsers = users.filter(u => u.isActive);
  
  // Round-robin порядок пользователей
  const [roundRobinUsers, setRoundRobinUsers] = useState<number[]>(
    rule.assignedUserIds?.length ? rule.assignedUserIds : activeUsers.slice(0, 2).map(u => u.id)
  );

  // Обновляем порядок round-robin
  const updateRoundRobinOrder = (userIds: number[]) => {
    setRoundRobinUsers(userIds);
    onUpdateRule({ assignedUserIds: userIds });
  };

  // Добавить пользователя в round-robin
  const addUserToRoundRobin = () => {
    const availableUser = activeUsers.find(u => !roundRobinUsers.includes(u.id));
    if (availableUser) {
      updateRoundRobinOrder([...roundRobinUsers, availableUser.id]);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 md:p-10">
      {/* Content */}
      <div className="flex flex-col gap-5">
        
        {/* Default Responsible User */}
        <div className="rounded-xl bg-card border border-card-border p-5 flex flex-col gap-3 shadow-sm">
          <label className="flex flex-col gap-2">
            <span className="text-foreground text-label">Default Responsible User</span>
            <Select
              value={rule.defaultUserId?.toString() || ""}
              onValueChange={(value) => onUpdateRule({ defaultUserId: Number(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Kommo user..." />
              </SelectTrigger>
              <SelectContent>
                {activeUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                    {user.isAdmin && <span className="ml-2 text-body-sm opacity-60">(Admin)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-body-sm flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              This user acts as a fallback for unassigned leads.
            </p>
          </label>
        </div>

        {/* Lead Distribution Logic */}
        <div className="rounded-xl bg-card p-5 flex flex-col gap-5 border border-card-border shadow-sm">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-h2 font-medium text-foreground">Lead Distribution Logic</h3>
            <p className="text-muted-foreground text-body-sm">Choose how new leads are assigned to your sales team.</p>
          </div>

          {/* Distribution Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {ASSIGNMENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = rule.assignmentType === type.id;
              
              return (
                <button
                  key={type.id}
                  onClick={() => onUpdateRule({ assignmentType: type.id })}
                  className={cn(
                    "flex flex-col gap-2.5 p-3.5 rounded-xl border bg-card text-left transition-all group shadow-sm",
                    isSelected 
                      ? "border-primary border-2" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center transition-colors shadow-sm",
                    isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-body-sm font-medium text-foreground">{type.name}</span>
                    <span className="block text-body-sm text-muted-foreground">{type.description}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Round Robin Detail Card */}
          <div className={cn(
            "relative flex flex-col rounded-xl border bg-card shadow-sm",
            rule.assignmentType === 'round-robin' 
              ? "border-primary ring-1 ring-primary/10" 
              : "border-border"
          )}>
            <button
              onClick={() => onUpdateRule({ assignmentType: 'round-robin' })}
              className="flex items-start p-3.5 text-left"
            >
              <div className="flex-1">
                <span className="block text-body-sm font-medium text-foreground">Round Robin</span>
                <span className="block text-body-sm text-muted-foreground">Sequential assignment in a fixed order.</span>
              </div>
              {rule.assignmentType === 'round-robin' && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
            
            {/* Expanded Round Robin Config */}
            {rule.assignmentType === 'round-robin' && (
              <div className="px-3.5 pb-3.5">
                <div className="border-t border-border pt-2.5">
                  <div className="flex justify-between items-center mb-2.5">
                    <label className="text-body-sm font-medium text-muted-foreground uppercase">Cycle Order & Users</label>
                    <button 
                      onClick={addUserToRoundRobin}
                      className="text-primary text-body-sm font-medium hover:underline flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add User
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {roundRobinUsers.map((userId, index) => {
                      const user = activeUsers.find(u => u.id === userId);
                      if (!user) return null;
                      
                      const ordinal = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][index] || `${index + 1}th`;
                      
                      return (
                        <div
                          key={userId}
                          className="flex items-center justify-between bg-muted p-2 rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-2.5">
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab" />
                            <div className="flex flex-col">
                              <span className="text-body-sm font-medium text-foreground">{user.name}</span>
                              <span className="text-body-sm text-muted-foreground">
                                {user.isAdmin ? 'Admin' : 'Sales Rep'}
                              </span>
                            </div>
                          </div>
                          <span className="text-body-sm font-mono bg-card px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">
                            {ordinal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-5 border-t border-border mt-5">
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
    </div>
  );
}
