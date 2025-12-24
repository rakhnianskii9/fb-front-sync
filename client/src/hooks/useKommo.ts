/**
 * Хук для работы с Kommo API
 * Загрузка конфига, pipelines, users, сохранение настроек
 */
import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from './useWorkspace'
import type { 
  KommoConnection, 
  KommoPipeline, 
  KommoUser, 
  KommoCustomField,
  KommoDistributionRule,
} from '@/components/kommo/types'

// Типы ответа API
interface KommoConfigResponse {
  connected: boolean
  subdomain?: string
  accountName?: string
  accountId?: string
  lastSyncAt?: string
  // Fields available in Kommo (from OAuth bootstrap)
  availableFields?: Array<{
    id: number
    name: string
    code?: string
    type: string
    enums?: Array<{ id: number; value: string }>
    is_required?: boolean
    entity_type?: string
  }>
  // Selected mapping (server-side persisted)
  fieldMapping?: {
    paymentLink?: number
    paymentId?: number
    phone?: number
    email?: number
    utmSource?: number
    utmCampaign?: number
    utmMedium?: number
    utmContent?: number
    utmTerm?: number
    ipGeoCountry?: number
    ipGeoCity?: number
    whatsappPhone?: number
    facebookClid?: number
    fbp?: number
    fbc?: number
  }
  // Inbound
  inboundPipelineId?: number
  inboundStatusId?: number
  createContactOnInbound?: boolean
  createCompanyOnInbound?: boolean
  // CAPI Feedback
  wonStatusId?: number
  sendPurchaseOnWon?: boolean
  includeValueInPurchase?: boolean
  // B+C+D Attribution Fallback Strategy
  sendWithoutAttribution?: boolean
  lookupAttributionByPii?: boolean
  markOfflineIfNoAttribution?: boolean
  // Валюта аккаунта (из Kommo API, read-only)
  accountCurrency?: string
  accountCurrencySymbol?: string
  // Distribution
  defaultResponsibleUserId?: number
  defaultTags?: string[]
  distributionRule?: KommoDistributionRule
  // Wizard
  wizardCompleted?: boolean
}

interface KommoMetadataResponse {
  pipelines: KommoPipeline[]
  users: KommoUser[]
  customFields: KommoCustomField[]
  // Валюта аккаунта (из Kommo API)
  accountCurrency?: string
  accountCurrencySymbol?: string
  warnings?: string[]
}

/**
 * Преобразование pipelines из Kommo API в наш формат
 * В Kommo системные статусы закрытия сделок имеют фиксированные IDs:
 * - 142: Closed - Won
 * - 143: Closed - Lost
 *
 * В некоторых аккаунтах поле `type` в ответе Kommo может быть неоднозначным.
 * Чтобы не помечать обычные стадии как Won/Lost (например, "Incoming leads"),
 * классифицируем успех/провал по системным ID.
 */
function transformPipelines(apiPipelines: any[]): KommoPipeline[] {
  return apiPipelines.map(p => ({
    id: p.id,
    name: p.name,
    sort: p.sort || 0,
    isMain: p.is_main || false,
    isActive: !p.is_archive,
    statuses: (p._embedded?.statuses || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      sort: s.sort || 0,
      color: s.color || '#ccc',
      type: s.id === 142 ? 'success' : s.id === 143 ? 'fail' : 'normal',
      pipelineId: p.id
    }))
  }))
}

/**
 * Преобразование users из Kommo API в наш формат
 */
function transformUsers(apiUsers: any[]): KommoUser[] {
  return apiUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email || '',
    isActive: !u.is_free,
    isAdmin: u.is_admin || false,
    rights: {
      canViewLeads: true,
      canEditLeads: true,
      canDeleteLeads: u.is_admin || false,
      canExportLeads: u.is_admin || false
    }
  }))
}

export function useKommo() {
  const { workspaceId } = useWorkspace()
  
  // Состояние подключения
  const [connection, setConnection] = useState<KommoConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Метаданные из Kommo
  const [pipelines, setPipelines] = useState<KommoPipeline[]>([])
  const [users, setUsers] = useState<KommoUser[]>([])
  const [customFields, setCustomFields] = useState<KommoCustomField[]>([])
  
  // Конфигурация из БД
  const [config, setConfig] = useState<KommoConfigResponse | null>(null)

  /**
   * Безопасный парсер JSON для ответов API.
   * Возвращает null, если тело не JSON (или пустое).
   */
  const safeJson = useCallback(async (response: Response) => {
    try {
      return await response.json()
    } catch {
      return null
    }
  }, [])

  /**
   * Загрузка конфигурации Kommo
   */
  const loadConfig = useCallback(async (): Promise<boolean> => {
    if (!workspaceId) return false
    
    try {
      const response = await fetch(`/api/v1/kommo/config?workspaceId=${workspaceId}`, {
        credentials: 'include',
        headers: { 'x-request-from': 'internal' }
      })
      const raw = await safeJson(response)

      if (!response.ok) {
        const errorMessage = raw?.error || `Failed to load config (HTTP ${response.status})`
        throw new Error(errorMessage)
      }

      const data: KommoConfigResponse = raw
      
      setConfig(data)
      
      if (data.connected && data.subdomain) {
        console.log('[useKommo] Config loaded, Kommo connected to', data.subdomain)
        setConnection({
          accountId: data.accountId || '',
          accountDomain: data.subdomain,
          status: 'connected',
          connectedAt: new Date()
        })
        return true
      } else {
        setConnection(null)
        setPipelines([])
        setUsers([])
        setCustomFields([])
        return false
      }
    } catch (err: any) {
      console.error('[useKommo] Failed to load config:', err)
      setError(err.message)
      return false
    }
  }, [workspaceId, safeJson])

  /**
   * Загрузка метаданных (pipelines, users, customFields)
   */
  const loadMetadata = useCallback(async () => {
    if (!workspaceId) return
    
    try {
      const response = await fetch(`/api/v1/kommo/metadata?workspaceId=${workspaceId}`, {
        credentials: 'include',
        headers: { 'x-request-from': 'internal' }
      })
      
      if (!response.ok) {
        const raw = await safeJson(response)
        const errorMessage = raw?.error || `Failed to load metadata (HTTP ${response.status})`
        console.error('[useKommo] Metadata request failed:', response.status, errorMessage)
        setError(errorMessage)
        setPipelines([])
        setUsers([])
        setCustomFields([])
        return
      }
      
      const data: KommoMetadataResponse = await response.json()
      
      console.log('[useKommo] Metadata loaded:', { 
        pipelines: data.pipelines?.length || 0, 
        users: data.users?.length || 0 
      })

      if (Array.isArray(data.warnings) && data.warnings.length) {
        // Показываем предупреждение пользователю, но не считаем это фаталом.
        setError(data.warnings.join(' '))
      }
      
      setPipelines(transformPipelines(data.pipelines || []))
      setUsers(transformUsers(data.users || []))
      setCustomFields(data.customFields || [])
    } catch (err: any) {
      console.error('[useKommo] Failed to load metadata:', err)
      setError(err.message)
      setPipelines([])
      setUsers([])
      setCustomFields([])
    }
  }, [workspaceId, safeJson])

  /**
   * Сохранение конфигурации
   */
  const saveConfig = useCallback(async (updates: Partial<KommoConfigResponse>) => {
    if (!workspaceId) return false
    
    try {
      const response = await fetch('/api/v1/kommo/config', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'x-request-from': 'internal'
        },
        body: JSON.stringify({ workspaceId, ...updates })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save config')
      }
      
      const data = await response.json()
      setConfig(prev => prev ? { ...prev, ...data } : data)
      return true
    } catch (err: any) {
      console.error('[useKommo] Failed to save config:', err)
      setError(err.message)
      return false
    }
  }, [workspaceId])

  /**
   * Подключение через Authorization Code (Private Integration)
   * Прямой обмен кода на токены без popup
   */
  const connect = useCallback(async (credentials: { 
    subdomain: string; 
    clientId: string; 
    clientSecret: string;
    authorizationCode: string;
  }) => {
    if (!workspaceId) {
      console.error('[useKommo] No workspaceId available')
      return
    }

    setConnection({
      accountId: '',
      accountDomain: '',
      status: 'connecting'
    })
    setError(null)

    try {
      // Kommo validates redirect_uri against integration settings.
      // Provide a deterministic default that matches our server callback endpoint.
      const redirectUri = (typeof window !== 'undefined' && window.location?.origin)
        ? `${window.location.origin}/api/v1/kommo/oauth/callback`
        : undefined

      const response = await fetch('/api/v1/kommo/connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'x-request-from': 'internal'
        },
        body: JSON.stringify({
          workspaceId,
          subdomain: credentials.subdomain,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          authorizationCode: credentials.authorizationCode,
          redirectUri
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect')
      }

      setConnection({
        accountId: data.accountId || '',
        accountDomain: data.subdomain || credentials.subdomain,
        status: 'connected',
        connectedAt: new Date()
      })

      // Перезагружаем конфиг
      await loadConfig()
      
      // Принудительно загружаем metadata (могут быть задержки после connect)
      console.log('[useKommo] Waiting for config to propagate...')
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadMetadata()

    } catch (err: any) {
      console.error('[useKommo] Connect error:', err)
      setError(err.message)
      setConnection({
        accountId: '',
        accountDomain: '',
        status: 'error'
      })
    }
  }, [workspaceId, loadConfig, loadMetadata])

  /**
   * Отключение — только сброс локального состояния
   * Данные в БД сохраняются для возможности переподключения
   */
  const disconnect = useCallback(() => {
    // Сбрасываем локальный state
    setConnection(null)
    setConfig(null)
    setPipelines([])
    setUsers([])
    setCustomFields([])
    setError(null)
    
    console.log('[useKommo] Disconnected (local state cleared)')
  }, [])

  /**
   * Найти системный статус выигрыша (type: 'success') для pipeline
   */
  const getDefaultWonStatus = useCallback((pipelineId: number): number | null => {
    const pipeline = pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return null

    const successStatus = pipeline.statuses.find(s => s.type === 'success')
    return successStatus?.id || null
  }, [pipelines])

  // Загрузка при монтировании
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const isConnected = await loadConfig()
      if (isConnected) {
        await loadMetadata()
      }
      setIsLoading(false)
    }
    init()
  }, [loadConfig, loadMetadata])

  return {
    // Состояние
    connection,
    isLoading,
    error,
    config,
    
    // Данные из Kommo
    pipelines,
    users,
    customFields,
    
    // Методы
    connect,
    disconnect,
    saveConfig,
    loadConfig,
    loadMetadata,
    getDefaultWonStatus
  }
}
