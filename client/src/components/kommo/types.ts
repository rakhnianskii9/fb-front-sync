// Types for Kommo provider domain + shared (CRM-level) wizard shapes.

import type {
  CrmSetupStep,
  CrmFieldMapping,
  CrmEventTrigger,
  CrmAssignmentType,
  CrmDistributionRule,
  CrmWeightedUser,
  CrmScheduleRule,
  CrmDistributionCondition,
  CrmConditionField,
  CrmConditionOperator,
} from '../crm/types'

/** Wizard steps (CRM-level, provider-agnostic). Kept as alias for backwards compatibility. */
export type KommoSetupStep = CrmSetupStep

/** Статус подключения к Kommo */
export type KommoConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Конфигурация подключения Kommo */
export interface KommoConnection {
  accountId: string;
  accountDomain: string;
  status: KommoConnectionStatus;
  connectedAt?: Date;
  expiresAt?: Date;
}

/** Воронка (pipeline) Kommo */
export interface KommoPipeline {
  id: number;
  name: string;
  sort: number;
  isMain: boolean;
  isActive: boolean;
  statuses: KommoStatus[];
}

/** Статус сделки в воронке */
export interface KommoStatus {
  id: number;
  name: string;
  sort: number;
  color: string;
  type: 'normal' | 'success' | 'fail';
  pipelineId: number;
}

/** Пользователь (менеджер) Kommo */
export interface KommoUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  rights: KommoUserRights;
}

/** Права пользователя */
export interface KommoUserRights {
  canViewLeads: boolean;
  canEditLeads: boolean;
  canDeleteLeads: boolean;
  canExportLeads: boolean;
}

/** Кастомное поле Kommo */
export interface KommoCustomField {
  id: number;
  name: string;
  code: string;
  type: KommoFieldType;
  entityType: 'leads' | 'contacts' | 'companies';
  isRequired: boolean;
  isEditable: boolean;
  enums?: KommoFieldEnum[];
}

/** Типы полей Kommo */
export type KommoFieldType = 
  | 'text'
  | 'numeric'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'url'
  | 'textarea'
  | 'radiobutton'
  | 'streetaddress'
  | 'birthday'
  | 'legal_entity';

/** Вариант для select/multiselect полей */
export interface KommoFieldEnum {
  id: number;
  value: string;
  sort: number;
}

/** CRM-level wizard shapes (aliases). */
export type KommoFieldMapping = CrmFieldMapping
export type KommoEventTrigger = CrmEventTrigger

export type KommoAssignmentType = CrmAssignmentType
export type KommoDistributionRule = CrmDistributionRule
export type KommoWeightedUser = CrmWeightedUser
export type KommoScheduleRule = CrmScheduleRule
export type KommoDistributionCondition = CrmDistributionCondition
export type KommoConditionField = CrmConditionField
export type KommoConditionOperator = CrmConditionOperator

/** Состояние визарда настройки */
export interface KommoSetupState {
  currentStep: KommoSetupStep;
  connection: KommoConnection | null;
  pipelines: KommoPipeline[];
  users: KommoUser[];
  customFields: KommoCustomField[];
  fieldMappings: KommoFieldMapping[];
  eventTriggers: KommoEventTrigger[];
  distributionRules: KommoDistributionRule[];
  isLoading: boolean;
  error: string | null;
}

/** CAPI параметры доступные для маппинга */
export const CAPI_MAPPABLE_FIELDS = [
  { id: 'email', name: 'Email', description: 'User email (SHA256)' },
  { id: 'phone', name: 'Phone', description: 'User phone (SHA256)' },
  { id: 'firstName', name: 'First Name', description: 'First name' },
  { id: 'lastName', name: 'Last Name', description: 'Last name' },
  { id: 'city', name: 'City', description: 'City' },
  { id: 'country', name: 'Country', description: 'Country' },
  { id: 'zipCode', name: 'Zip Code', description: 'ZIP / postal code' },
  { id: 'utm_source', name: 'UTM Source', description: 'UTM source' },
  { id: 'utm_medium', name: 'UTM Medium', description: 'UTM medium' },
  { id: 'utm_campaign', name: 'UTM Campaign', description: 'UTM campaign' },
  { id: 'utm_content', name: 'UTM Content', description: 'UTM content' },
  { id: 'utm_term', name: 'UTM Term', description: 'UTM term' },
  { id: 'ip_geo_country', name: 'IP Geo Country', description: 'Country (from IP / headers)' },
  { id: 'ip_geo_city', name: 'IP Geo City', description: 'City (from IP / headers)' },
] as const;

/** Стандартные события CAPI для триггеров */
export const CAPI_EVENTS = [
  { id: 'Lead', name: 'Lead', description: 'New lead' },
  { id: 'Contact', name: 'Contact', description: 'Contact' },
  { id: 'Schedule', name: 'Schedule', description: 'Meeting scheduled' },
  { id: 'Purchase', name: 'Purchase', description: 'Purchase (closed deal)' },
  { id: 'CompleteRegistration', name: 'Complete Registration', description: 'Registration completed' },
  { id: 'SubmitApplication', name: 'Submit Application', description: 'Application submitted' },
  { id: 'StartTrial', name: 'Start Trial', description: 'Trial started' },
  { id: 'Subscribe', name: 'Subscribe', description: 'Subscription started' },
] as const;
