import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  BadgeCheck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock, 
  Trash2,
  GripVertical,
  Info, 
  PieChart, 
  Plus, 
  Shuffle, 
  Tags,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  description2: string;
  icon: typeof Tags;
}[] = [
  { id: 'condition', name: 'By UTM', description: 'Based on UTM tags', description2: 'Assign to a matching manager', icon: Tags },
  { id: 'schedule', name: 'By Time', description: 'Working hours', description2: 'Route by active shift', icon: Clock },
  { id: 'workload', name: 'By Load', description: 'Load balancing', description2: 'Prefer the least busy', icon: TrendingUp },
  { id: 'weighted', name: 'By % of total flow', description: 'Percentage split', description2: 'Control traffic share', icon: PieChart },
  { id: 'random', name: 'Random Assignment', description: 'Random selection', description2: 'Even distribution over time', icon: Shuffle },
  { id: 'round-robin', name: 'Round Robin', description: 'Sequential assignment', description2: 'In a fixed order', icon: BarChart3 },
  { id: 'default', name: 'By Default', description: 'Single owner', description2: 'Fallback when no rule matches', icon: BadgeCheck },
];

interface DistributionStepProps {
  users: KommoUser[];
  rule: KommoDistributionRule;
  onUpdateRule: (updates: Partial<KommoDistributionRule>) => void;
  onNext: () => void;
  onBack: () => void;
  showNavigation?: boolean;
  className?: string;
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
  showNavigation = true,
  className,
}: DistributionStepProps) {
  const activeUsers = users.filter(u => u.isActive);

  const defaultTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      return 'UTC'
    }
  }, [])

  const timezoneOptions = useMemo(() => {
    try {
      const supportedValuesOf = (Intl as any)?.supportedValuesOf
      if (typeof supportedValuesOf === 'function') {
        const values: string[] = supportedValuesOf('timeZone')
        return values.slice().sort((a, b) => a.localeCompare(b))
      }
    } catch {
      // ignore
    }

    // Fallback list (kept minimal in case Intl.supportedValuesOf is unavailable)
    return [
      'UTC',
      'Europe/London',
      'Europe/Berlin',
      'Europe/Moscow',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Ho_Chi_Minh',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Australia/Sydney',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
    ]
  }, [])

  const defaultTaskDeadlineMinutes = 10
  const defaultTaskTypeId = 1
  const defaultTaskTextTemplate =
    `Call {name}\n` +
    `Phone: {phone}\n` +
    `Email: {email}\n` +
    `Source: {utm_source}/{utm_medium}\n` +
    `Campaign: {utm_campaign}\n` +
    `Landing: {landing_url}`

  const firstActiveUserId = useMemo(() => activeUsers[0]?.id, [activeUsers]);

  useEffect(() => {
    if (!rule.defaultUserId && firstActiveUserId) {
      onUpdateRule({ defaultUserId: firstActiveUserId });
    }
  }, [rule.defaultUserId, firstActiveUserId, onUpdateRule]);
  
  // Round-robin порядок пользователей
  const [roundRobinUsers, setRoundRobinUsers] = useState<number[]>(
    rule.assignedUserIds?.length ? rule.assignedUserIds : activeUsers.slice(0, 2).map(u => u.id)
  );

  useEffect(() => {
    if (rule.assignmentType !== 'round-robin') return
    const ids = Array.isArray(rule.assignedUserIds) ? rule.assignedUserIds : []
    if (ids.length) return
    if (!roundRobinUsers.length) return
    onUpdateRule({ assignedUserIds: roundRobinUsers })
  }, [rule.assignmentType, rule.assignedUserIds, roundRobinUsers, onUpdateRule])

  const eligibleUserIds = useMemo(() => {
    const ids = Array.isArray(rule.assignedUserIds) ? rule.assignedUserIds : []
    return ids.filter((id) => typeof id === 'number' && Number.isFinite(id))
  }, [rule.assignedUserIds])

  const ensureEligibleUsers = (minCount: number) => {
    if (eligibleUserIds.length >= minCount) return
    const next = activeUsers.slice(0, Math.max(minCount, 1)).map(u => u.id)
    if (next.length) onUpdateRule({ assignedUserIds: next })
  }

  const toggleEligibleUser = (userId: number) => {
    const next = eligibleUserIds.includes(userId)
      ? eligibleUserIds.filter((id) => id !== userId)
      : [...eligibleUserIds, userId]
    onUpdateRule({ assignedUserIds: next })
  }

  const weightedUsers = useMemo(() => {
    const items = Array.isArray(rule.weightedUsers) ? rule.weightedUsers : []
    return items
      .map((u) => ({ userId: Number((u as any).userId), weight: Number((u as any).weight) }))
      .filter((u) => Number.isFinite(u.userId) && Number.isFinite(u.weight))
  }, [rule.weightedUsers])

  const weightedTotal = useMemo(() => {
    return weightedUsers.reduce((acc, u) => acc + (Number.isFinite(u.weight) ? u.weight : 0), 0)
  }, [weightedUsers])

  const normalizeWeightedUsers = (next: { userId: number; weight: number }[], changedUserId?: number) => {
    const cleanedRaw = next
      .map((u) => ({ userId: u.userId, weight: Math.max(0, Math.min(100, Math.round(Number(u.weight) || 0))) }))
      .filter((u) => Number.isFinite(u.userId))

    // Ensure uniqueness: merge duplicates by summing weights.
    const merged = new Map<number, number>()
    for (const u of cleanedRaw) {
      merged.set(u.userId, (merged.get(u.userId) ?? 0) + u.weight)
    }
    const cleaned = Array.from(merged.entries()).map(([userId, weight]) => ({ userId, weight }))

    if (!cleaned.length) return []

    // If only one user, force 100%.
    if (cleaned.length === 1) {
      return [{ ...cleaned[0], weight: 100 }]
    }

    // Keep sum exactly 100% by redistributing among others.
    const changed = changedUserId != null ? cleaned.find((u) => u.userId === changedUserId) : undefined
    const changedWeight = changed ? changed.weight : undefined

    if (changed && changedWeight != null) {
      const others = cleaned.filter((u) => u.userId !== changedUserId)
      const remaining = 100 - changedWeight

      const othersSum = others.reduce((acc, u) => acc + u.weight, 0)
      const base = othersSum > 0
        ? others.map((u) => ({ ...u, weight: Math.floor((u.weight / othersSum) * remaining) }))
        : others.map((u) => ({ ...u, weight: Math.floor(remaining / others.length) }))

      // Distribute rounding leftovers.
      let allocated = base.reduce((acc, u) => acc + u.weight, 0)
      let leftover = remaining - allocated
      let i = 0
      while (leftover > 0 && base.length) {
        base[i % base.length].weight += 1
        leftover -= 1
        i += 1
      }

      return [{ ...changed, weight: changedWeight }, ...base]
    }

    // Fallback: scale everything to 100.
    const sum = cleaned.reduce((acc, u) => acc + u.weight, 0)
    if (sum <= 0) {
      const even = Math.floor(100 / cleaned.length)
      const out = cleaned.map((u) => ({ ...u, weight: even }))
      out[0].weight += 100 - even * cleaned.length
      return out
    }

    const scaled = cleaned.map((u) => ({ ...u, weight: Math.floor((u.weight / sum) * 100) }))
    let scaledSum = scaled.reduce((acc, u) => acc + u.weight, 0)
    let diff = 100 - scaledSum
    let j = 0
    while (diff > 0 && scaled.length) {
      scaled[j % scaled.length].weight += 1
      diff -= 1
      j += 1
    }
    return scaled
  }

  const addWeightedUser = () => {
    const used = new Set(weightedUsers.map((u) => u.userId))
    const candidate = activeUsers.find((u) => !used.has(u.id))
    if (!candidate) return
    const next = [...weightedUsers, { userId: candidate.id, weight: 10 }]
    const normalized = normalizeWeightedUsers(next, candidate.id)
    onUpdateRule({ weightedUsers: normalized as any })
  }

  const updateWeightedUserPercent = (userId: number, percent: number) => {
    const next = weightedUsers.map((u) => (u.userId === userId ? { ...u, weight: percent } : u))
    const normalized = normalizeWeightedUsers(next, userId)
    onUpdateRule({ weightedUsers: normalized as any })
  }

  const updateWeightedUserId = (userId: number, nextUserId: number) => {
    const next = weightedUsers.map((u) => (u.userId === userId ? { ...u, userId: nextUserId } : u))
    const normalized = normalizeWeightedUsers(next)
    onUpdateRule({ weightedUsers: normalized as any })
  }

  const removeWeightedUser = (userId: number) => {
    const next = weightedUsers.filter((u) => u.userId !== userId)
    const normalized = normalizeWeightedUsers(next)
    onUpdateRule({ weightedUsers: normalized as any })
  }

  const scheduleRules = useMemo(() => {
    const items = Array.isArray(rule.scheduleRules) ? rule.scheduleRules : []
    return items as any[]
  }, [rule.scheduleRules])

  const addScheduleRule = () => {
    const userId = rule.defaultUserId || firstActiveUserId
    if (!userId) return
    const nextRule = {
      userId,
      weekdays: [1, 2, 3, 4, 5],
      timeFrom: '09:00',
      timeTo: '18:00',
      timezone: defaultTimezone,
    }
    onUpdateRule({ scheduleRules: [...scheduleRules, nextRule] as any })
  }

  const updateScheduleRule = (index: number, updates: any) => {
    const next = scheduleRules.map((r, i) => (i === index ? { ...r, ...updates } : r))
    onUpdateRule({ scheduleRules: next as any })
  }

  const removeScheduleRule = (index: number) => {
    onUpdateRule({ scheduleRules: scheduleRules.filter((_, i) => i !== index) as any })
  }

  const workloadWindowMinutes = Number.isFinite(Number((rule as any).workloadWindowMinutes))
    ? Number((rule as any).workloadWindowMinutes)
    : 60

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

  const removeUserFromRoundRobin = (userId: number) => {
    updateRoundRobinOrder(roundRobinUsers.filter((id) => id !== userId))
  }

  const moveRoundRobinUser = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= roundRobinUsers.length) return
    const next = [...roundRobinUsers]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    updateRoundRobinOrder(next)
  }

  const CONDITION_FIELDS: { id: KommoConditionField; label: string }[] = [
    { id: 'utm_source', label: 'UTM Source' },
    { id: 'utm_medium', label: 'UTM Medium' },
    { id: 'utm_campaign', label: 'UTM Campaign' },
    { id: 'utm_content', label: 'UTM Content' },
    { id: 'utm_term', label: 'UTM Term' },
    { id: 'country', label: 'Country' },
    { id: 'city', label: 'City' },
    { id: 'lead_source', label: 'Lead Source' },
    { id: 'form_name', label: 'Form Name' },
  ]

  const CONDITION_OPERATORS: { id: KommoConditionOperator; label: string; needsValue: boolean }[] = [
    { id: 'equals', label: 'Equals', needsValue: true },
    { id: 'not_equals', label: 'Not equals', needsValue: true },
    { id: 'contains', label: 'Contains', needsValue: true },
    { id: 'not_contains', label: 'Not contains', needsValue: true },
    { id: 'starts_with', label: 'Starts with', needsValue: true },
    { id: 'ends_with', label: 'Ends with', needsValue: true },
    { id: 'is_empty', label: 'Is empty', needsValue: false },
    { id: 'is_not_empty', label: 'Is not empty', needsValue: false },
  ]

  const conditions = rule.conditions || []

  const addCondition = () => {
    const assignUserId = rule.defaultUserId || firstActiveUserId
    if (!assignUserId) return

    const newCondition: KommoDistributionCondition = {
      id: `cond-${Date.now()}`,
      field: 'utm_source',
      operator: 'equals',
      value: '',
      assignUserId,
    }

    onUpdateRule({ conditions: [...conditions, newCondition] })
  }

  const updateCondition = (conditionId: string, updates: Partial<KommoDistributionCondition>) => {
    onUpdateRule({
      conditions: conditions.map(c => c.id === conditionId ? { ...c, ...updates } : c)
    })
  }

  const removeCondition = (conditionId: string) => {
    onUpdateRule({ conditions: conditions.filter(c => c.id !== conditionId) })
  }

  const moveCondition = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= conditions.length) return
    const next = [...conditions]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    onUpdateRule({ conditions: next })
  }

  return (
    <div className={cn("flex-1 flex flex-col gap-6 p-8 md:p-10", className)}>
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

          {/* Task creation option */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-4">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="kommo-create-task-on-assign"
                checked={!!rule.createTaskOnAssign}
                onCheckedChange={(checked) => onUpdateRule({ createTaskOnAssign: !!checked })}
                className="bg-background border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="kommo-create-task-on-assign" className="cursor-pointer text-body-sm font-medium text-foreground">
                  Create a task for the responsible manager
                </Label>
                <p className="text-body-sm text-muted-foreground">
                  When a new lead is created, a Kommo task is created and assigned to the selected responsible user.
                </p>
              </div>
            </div>

            {rule.createTaskOnAssign && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-body-sm">Deadline (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={(rule.taskDeadlineMinutes ?? defaultTaskDeadlineMinutes).toString()}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      onUpdateRule({ taskDeadlineMinutes: Number.isFinite(n) && n > 0 ? n : defaultTaskDeadlineMinutes })
                    }}
                    placeholder={defaultTaskDeadlineMinutes.toString()}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-body-sm">Task type</Label>
                  <Select
                    value={(rule.taskTypeId ?? defaultTaskTypeId).toString()}
                    onValueChange={(value) => onUpdateRule({ taskTypeId: Number(value) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Follow-up</SelectItem>
                      <SelectItem value="2">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-3">
                  <Label className="text-body-sm">Task text template</Label>
                  <Textarea
                    value={rule.taskTextTemplate ?? defaultTaskTextTemplate}
                    onChange={(e) => onUpdateRule({ taskTextTemplate: e.target.value })}
                    className="min-h-[120px]"
                  />
                  <p className="text-body-sm text-muted-foreground">
                    Placeholders: {'{name}'} {'{phone}'} {'{email}'} {'{utm_source}'} {'{utm_medium}'} {'{utm_campaign}'} {'{utm_content}'} {'{utm_term}'} {'{country}'} {'{city}'} {'{landing_url}'}
                  </p>
                </div>
              </div>
            )}
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
                    <span className="block text-body-sm text-muted-foreground">{type.description2}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Default (explicit) info */}
          {rule.assignmentType === 'default' && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <h4 className="text-h3 text-foreground">Default assignment</h4>
              <p className="text-body-sm text-muted-foreground">
                New leads will be assigned to the Default Responsible User.
              </p>
            </div>
          )}

          {/* Random assignment config */}
          {rule.assignmentType === 'random' && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-h3 text-foreground">Random assignment</h4>
                  <p className="text-body-sm text-muted-foreground">Pick a pool of eligible users. Each lead is assigned randomly.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => ensureEligibleUsers(2)} className="shrink-0">
                  Use first 2 users
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeUsers.map((u) => (
                  <label key={u.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
                    <Checkbox
                      checked={eligibleUserIds.includes(u.id)}
                      onCheckedChange={() => toggleEligibleUser(u.id)}
                      className="bg-background border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex flex-col">
                      <span className="text-body-sm font-medium text-foreground">{u.name}</span>
                      <span className="text-body-sm text-muted-foreground">{u.email}</span>
                    </div>
                  </label>
                ))}
              </div>

              {eligibleUserIds.length === 0 && (
                <p className="mt-3 text-body-sm text-muted-foreground">
                  Select at least one user, otherwise fallback is used.
                </p>
              )}
            </div>
          )}

          {/* Weighted assignment config */}
          {rule.assignmentType === 'weighted' && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-h3 text-foreground">Weighted assignment</h4>
                  <p className="text-body-sm text-muted-foreground">Distribute leads by percentage (total must be 100%).</p>
                </div>
                <Button type="button" variant="outline" onClick={addWeightedUser} className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add user
                </Button>
              </div>

              <div className="mb-4 text-body-sm text-muted-foreground">
                Total: <span className={cn("font-medium", weightedTotal === 100 ? "text-foreground" : "text-destructive")}>{weightedTotal}%</span>
              </div>

              {weightedUsers.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-border text-muted-foreground text-body-sm">
                  No weighted users yet. Click “Add user” to start.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {weightedUsers.map((wu) => (
                    <div key={wu.userId} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-4">
                      <div className="space-y-1">
                        <Label className="text-body-sm">User</Label>
                        <Select
                          value={wu.userId.toString()}
                          onValueChange={(value) => updateWeightedUserId(wu.userId, Number(value))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-body-sm">Percent</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={Number.isFinite(wu.weight) ? Math.round(wu.weight).toString() : '0'}
                              onChange={(e) => {
                                const n = Number(e.target.value)
                                updateWeightedUserPercent(wu.userId, Number.isFinite(n) ? n : 0)
                              }}
                              className="w-[110px]"
                            />
                            <span className="text-body-sm text-muted-foreground">%</span>
                          </div>
                        </div>

                        <Slider
                          value={[Number.isFinite(wu.weight) ? Math.round(wu.weight) : 0]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(value) => {
                            const v = Array.isArray(value) ? value[0] : 0
                            updateWeightedUserPercent(wu.userId, Number.isFinite(v) ? v : 0)
                          }}
                        />
                      </div>

                      <div className="flex items-end justify-end">
                        <Button type="button" variant="ghost" onClick={() => removeWeightedUser(wu.userId)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Schedule assignment config */}
          {rule.assignmentType === 'schedule' && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-h3 text-foreground">Schedule assignment</h4>
                  <p className="text-body-sm text-muted-foreground">Assign leads to users when they are on shift (by timezone).</p>
                </div>
                <Button type="button" variant="outline" onClick={addScheduleRule} className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add shift
                </Button>
              </div>

              {scheduleRules.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-border text-muted-foreground text-body-sm">
                  No shifts yet. Click “Add shift” to start.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {scheduleRules.map((sr, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="text-body-sm font-medium text-foreground">Shift {idx + 1}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeScheduleRule(idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-body-sm">User</Label>
                          <Select
                            value={String(sr.userId || '')}
                            onValueChange={(value) => updateScheduleRule(idx, { userId: Number(value) })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-body-sm">From</Label>
                          <Input
                            type="time"
                            value={sr.timeFrom || '09:00'}
                            onChange={(e) => updateScheduleRule(idx, { timeFrom: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-body-sm">To</Label>
                          <Input
                            type="time"
                            value={sr.timeTo || '18:00'}
                            onChange={(e) => updateScheduleRule(idx, { timeTo: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-body-sm">Timezone</Label>
                          <Select
                            value={String(sr.timezone || defaultTimezone)}
                            onValueChange={(value) => updateScheduleRule(idx, { timezone: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={defaultTimezone} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {timezoneOptions.map((tz) => (
                                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-4">
                          <Label className="text-body-sm">Weekdays</Label>
                          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                            {[
                              { id: 1, label: 'Mon' },
                              { id: 2, label: 'Tue' },
                              { id: 3, label: 'Wed' },
                              { id: 4, label: 'Thu' },
                              { id: 5, label: 'Fri' },
                              { id: 6, label: 'Sat' },
                              { id: 0, label: 'Sun' },
                            ].map((d) => {
                              const weekdays: number[] = Array.isArray(sr.weekdays) ? sr.weekdays : []
                              const checked = weekdays.includes(d.id)
                              return (
                                <label key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => {
                                      const next = checked ? weekdays.filter((w) => w !== d.id) : [...weekdays, d.id]
                                      updateScheduleRule(idx, { weekdays: next })
                                    }}
                                    className="bg-background border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <span className="text-body-sm text-muted-foreground">{d.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Workload assignment config */}
          {rule.assignmentType === 'workload' && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-h3 text-foreground">Workload assignment</h4>
                  <p className="text-body-sm text-muted-foreground">
                    Assign to the least busy user, based on how many leads they received recently (measured from our local sync).
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => ensureEligibleUsers(2)} className="shrink-0">
                  Use first 2 users
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="space-y-1">
                  <Label className="text-body-sm">Lookback window (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={workloadWindowMinutes.toString()}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      onUpdateRule({ workloadWindowMinutes: Number.isFinite(n) && n > 0 ? n : 60 } as any)
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeUsers.map((u) => (
                  <label key={u.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
                    <Checkbox
                      checked={eligibleUserIds.includes(u.id)}
                      onCheckedChange={() => toggleEligibleUser(u.id)}
                      className="bg-background border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex flex-col">
                      <span className="text-body-sm font-medium text-foreground">{u.name}</span>
                      <span className="text-body-sm text-muted-foreground">{u.email}</span>
                    </div>
                  </label>
                ))}
              </div>

              {eligibleUserIds.length === 0 && (
                <p className="mt-3 text-body-sm text-muted-foreground">
                  Select at least one user, otherwise fallback is used.
                </p>
              )}
            </div>
          )}

          {/* Round Robin config */}
          {rule.assignmentType === 'round-robin' && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-h3 text-foreground">Round Robin</h4>
                  <p className="text-body-sm text-muted-foreground">Sequential assignment in a fixed order.</p>
                </div>
                <Button type="button" variant="outline" onClick={addUserToRoundRobin} className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add user
                </Button>
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
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-mono bg-card px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">
                          {ordinal}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveRoundRobinUser(index, index - 1)}
                            disabled={index === 0}
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground",
                              index === 0 ? "opacity-40 cursor-not-allowed" : "hover:text-foreground"
                            )}
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRoundRobinUser(index, index + 1)}
                            disabled={index === roundRobinUsers.length - 1}
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground",
                              index === roundRobinUsers.length - 1 ? "opacity-40 cursor-not-allowed" : "hover:text-foreground"
                            )}
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeUserFromRoundRobin(userId)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-destructive"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conditions (By UTM) Config */}
          {rule.assignmentType === 'condition' && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-h3 text-foreground">Assignment Conditions</h4>
                  <p className="text-body-sm text-muted-foreground">
                    The first matching rule wins. If nothing matches, the Default Responsible User is used.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addCondition} className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add rule
                </Button>
              </div>

              {conditions.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-border text-muted-foreground text-body-sm">
                  No rules yet. Click “Add rule” to start.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {conditions.map((c, idx) => {
                    const op = CONDITION_OPERATORS.find(o => o.id === c.operator)
                    const needsValue = op?.needsValue ?? true

                    return (
                      <div key={c.id} className="rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="text-body-sm font-medium text-foreground">Rule {idx + 1}</div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveCondition(idx, idx - 1)}
                              disabled={idx === 0}
                              className={cn(
                                "text-muted-foreground",
                                idx === 0 ? "opacity-40 cursor-not-allowed" : "hover:text-foreground"
                              )}
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveCondition(idx, idx + 1)}
                              disabled={idx === conditions.length - 1}
                              className={cn(
                                "text-muted-foreground",
                                idx === conditions.length - 1 ? "opacity-40 cursor-not-allowed" : "hover:text-foreground"
                              )}
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCondition(c.id)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-body-sm">Field</Label>
                            <Select
                              value={c.field}
                              onValueChange={(value) => updateCondition(c.id, { field: value as KommoConditionField })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITION_FIELDS.map(f => (
                                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-body-sm">Operator</Label>
                            <Select
                              value={c.operator}
                              onValueChange={(value) => {
                                const operator = value as KommoConditionOperator
                                const nextNeedsValue = CONDITION_OPERATORS.find(o => o.id === operator)?.needsValue ?? true
                                updateCondition(c.id, { operator, value: nextNeedsValue ? c.value : '' })
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select operator" />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITION_OPERATORS.map(o => (
                                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-body-sm">Value</Label>
                            <Input
                              value={c.value || ''}
                              onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                              placeholder={needsValue ? 'Enter value…' : 'Not required'}
                              disabled={!needsValue}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-body-sm">Assign to</Label>
                            <Select
                              value={c.assignUserId?.toString() || ''}
                              onValueChange={(value) => updateCondition(c.id, { assignUserId: Number(value) })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeUsers.map(u => (
                                  <SelectItem key={u.id} value={u.id.toString()}>
                                    {u.name}
                                    {u.isAdmin && <span className="ml-2 text-body-sm opacity-60">(Admin)</span>}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          {showNavigation && (
            <div className="flex items-center justify-between pt-5 border-t border-border mt-5">
              <Button variant="outline" onClick={onBack} className="transition-colors">
                Back
              </Button>
              <Button onClick={onNext} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
