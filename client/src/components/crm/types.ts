// Generic CRM (provider-agnostic) types used by the CRM setup wizard.

/** Wizard steps (common across CRM providers for now). */
export type CrmSetupStep = 'connect' | 'inbound' | 'fields' | 'events' | 'distribution' | 'review'

/** Mapping of a CRM/provider field to a Facebook CAPI parameter. */
export interface CrmFieldMapping {
    id: string
    capiField: string
    providerFieldId: number
    providerFieldName: string
    entityType: 'leads' | 'contacts' | 'companies'
    isEnabled: boolean
    transformRule?: string
}

/** Event trigger configuration (CRM status change → CAPI event). */
export interface CrmEventTrigger {
    id: string
    name: string
    description: string
    pipelineId: number
    statusId: number
    capiEventName: string
    isEnabled: boolean
    eventValue?: number
    eventCurrency?: string
}

/** Lead assignment strategies (generic). */
export type CrmAssignmentType =
    | 'default'
    | 'round-robin'
    | 'random'
    | 'weighted'
    | 'workload'
    | 'schedule'
    | 'condition'

/** Lead distribution rule (generic). */
export interface CrmDistributionRule {
    id: string
    name: string
    assignmentType: CrmAssignmentType
    isEnabled: boolean

    /** Create a follow-up task for the assigned responsible user when a new lead is created. */
    createTaskOnAssign?: boolean

    /** Task deadline offset in minutes (default handled server-side). */
    taskDeadlineMinutes?: number

    /** Kommo task type id (e.g. 1 = Follow-up, 2 = Meeting). */
    taskTypeId?: number

    /** Task text template, supports placeholders like {name}, {phone}, {email}, {utm_source}, etc. */
    taskTextTemplate?: string

    defaultUserId?: number
    assignedUserIds?: number[]
    weightedUsers?: CrmWeightedUser[]
    scheduleRules?: CrmScheduleRule[]
    conditions?: CrmDistributionCondition[]
    fallbackUserId?: number

    /** For assignmentType=workload: lookback window (minutes) to measure manager load. */
    workloadWindowMinutes?: number
}

export interface CrmWeightedUser {
    userId: number
    weight: number
}

export interface CrmScheduleRule {
    userId: number
    weekdays: number[]
    timeFrom: string
    timeTo: string
    timezone: string
}

export interface CrmDistributionCondition {
    id: string
    field: CrmConditionField
    operator: CrmConditionOperator
    value: string
    assignUserId: number
}

export type CrmConditionField =
    | 'utm_source'
    | 'utm_medium'
    | 'utm_campaign'
    | 'utm_content'
    | 'utm_term'
    | 'country'
    | 'city'
    | 'lead_source'
    | 'form_name'

export type CrmConditionOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'is_empty'
    | 'is_not_empty'
