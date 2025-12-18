// Типы для интеграции Kommo CRM

/** Шаги визарда настройки Kommo */
export type KommoSetupStep = 'connect' | 'inbound' | 'fields' | 'events' | 'distribution' | 'review';

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

/** Маппинг Facebook CAPI параметра на Kommo поле */
export interface KommoFieldMapping {
  id: string;
  capiField: string;
  kommoFieldId: number;
  kommoFieldName: string;
  entityType: 'leads' | 'contacts' | 'companies';
  isEnabled: boolean;
  transformRule?: string;
}

/** Триггер события для отправки в CAPI */
export interface KommoEventTrigger {
  id: string;
  name: string;
  description: string;
  pipelineId: number;
  statusId: number;
  capiEventName: string;
  isEnabled: boolean;
  eventValue?: number;
  eventCurrency?: string;
}

/** Типы распределения лидов */
export type KommoAssignmentType = 
  | 'default'        // По умолчанию — один менеджер
  | 'round-robin'    // Равномерное — по очереди
  | 'random'         // Рандомное назначение
  | 'weighted'       // По % от потока
  | 'workload'       // По загрузке (меньше открытых сделок)
  | 'schedule'       // По расписанию (рабочие часы)
  | 'condition';     // По условиям (UTM и др.)

/** Правило распределения лидов */
export interface KommoDistributionRule {
  id: string;
  name: string;
  assignmentType: KommoAssignmentType;
  isEnabled: boolean;
  
  // Для default — один менеджер
  defaultUserId?: number;
  
  // Для round-robin, random, workload — список менеджеров
  assignedUserIds?: number[];
  
  // Для weighted — менеджеры с весами
  weightedUsers?: KommoWeightedUser[];
  
  // Для schedule — расписание по менеджерам
  scheduleRules?: KommoScheduleRule[];
  
  // Для condition — условия по UTM и др.
  conditions?: KommoDistributionCondition[];
  fallbackUserId?: number; // Если условия не сработали
}

/** Менеджер с весом для weighted распределения */
export interface KommoWeightedUser {
  userId: number;
  weight: number; // % от потока (0-100)
}

/** Расписание для schedule распределения */
export interface KommoScheduleRule {
  userId: number;
  weekdays: number[];     // 0-6 (Вс-Сб)
  timeFrom: string;       // "09:00"
  timeTo: string;         // "18:00"
  timezone: string;       // "Europe/Moscow"
}

/** Условие для condition распределения */
export interface KommoDistributionCondition {
  id: string;
  field: KommoConditionField;
  operator: KommoConditionOperator;
  value: string;
  assignUserId: number;   // Кому назначать при совпадении
}

/** Поля для условий */
export type KommoConditionField = 
  | 'utm_source'
  | 'utm_medium' 
  | 'utm_campaign'
  | 'utm_content'
  | 'utm_term'
  | 'country'
  | 'city'
  | 'lead_source'
  | 'form_name';

/** Операторы сравнения */
export type KommoConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

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
  { id: 'email', name: 'Email', description: 'Email пользователя (SHA256)' },
  { id: 'phone', name: 'Phone', description: 'Телефон пользователя (SHA256)' },
  { id: 'firstName', name: 'First Name', description: 'Имя' },
  { id: 'lastName', name: 'Last Name', description: 'Фамилия' },
  { id: 'city', name: 'City', description: 'Город' },
  { id: 'country', name: 'Country', description: 'Страна' },
  { id: 'zipCode', name: 'Zip Code', description: 'Почтовый индекс' },
  { id: 'externalId', name: 'External ID', description: 'Внешний идентификатор' },
  { id: 'fbclid', name: 'Facebook Click ID', description: 'ID клика Facebook' },
  { id: 'fbp', name: 'Facebook Browser ID', description: 'ID браузера Facebook' },
  { id: 'fbc', name: 'Facebook Cookie', description: 'Cookie Facebook' },
  { id: 'utm_source', name: 'UTM Source', description: 'Источник UTM' },
  { id: 'utm_medium', name: 'UTM Medium', description: 'Канал UTM' },
  { id: 'utm_campaign', name: 'UTM Campaign', description: 'Кампания UTM' },
  { id: 'utm_content', name: 'UTM Content', description: 'Контент UTM' },
  { id: 'utm_term', name: 'UTM Term', description: 'Ключевое слово UTM' },
] as const;

/** Стандартные события CAPI для триггеров */
export const CAPI_EVENTS = [
  { id: 'Lead', name: 'Lead', description: 'Новый лид' },
  { id: 'Contact', name: 'Contact', description: 'Контакт' },
  { id: 'Schedule', name: 'Schedule', description: 'Назначена встреча' },
  { id: 'Purchase', name: 'Purchase', description: 'Покупка (закрытая сделка)' },
  { id: 'CompleteRegistration', name: 'Complete Registration', description: 'Регистрация завершена' },
  { id: 'SubmitApplication', name: 'Submit Application', description: 'Заявка подана' },
  { id: 'StartTrial', name: 'Start Trial', description: 'Начат пробный период' },
  { id: 'Subscribe', name: 'Subscribe', description: 'Подписка оформлена' },
] as const;
