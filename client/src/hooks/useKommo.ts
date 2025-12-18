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
  KommoCustomField 
} from '@/components/kommo/types'

// Типы ответа API
interface KommoConfigResponse {
  connected: boolean
  subdomain?: string
  accountName?: string
  accountId?: string
  // Inbound
  inboundPipelineId?: number
  inboundStatusId?: number
  createContactOnInbound?: boolean
  createCompanyOnInbound?: boolean
  // CAPI Feedback
  wonStatusId?: number
  sendPurchaseOnWon?: boolean
  includeValueInPurchase?: boolean
  // Валюта аккаунта (из Kommo API, read-only)
  accountCurrency?: string
  accountCurrencySymbol?: string
  // Distribution
  defaultResponsibleUserId?: number
  defaultTags?: string[]
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
}

/**
 * Преобразование pipelines из Kommo API в наш формат
 * Kommo API возвращает статусы со свойством type: 0=normal, 1=success, 2=fail
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
      type: s.type === 0 ? 'normal' : s.type === 1 ? 'success' : 'fail',
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
   * Загрузка конфигурации Kommo
   */
  const loadConfig = useCallback(async () => {
    if (!workspaceId) return
    
    try {
      const response = await fetch(`/api/v1/kommo/config?workspaceId=${workspaceId}`, {
        credentials: 'include',
        headers: { 'x-request-from': 'internal' }
      })
      const data: KommoConfigResponse = await response.json()
      
      setConfig(data)
      
      if (data.connected && data.subdomain) {
        setConnection({
          accountId: data.accountId || '',
          accountDomain: data.subdomain,
          status: 'connected',
          connectedAt: new Date()
        })
      } else {
        setConnection(null)
      }
    } catch (err: any) {
      console.error('[useKommo] Failed to load config:', err)
      setError(err.message)
    }
  }, [workspaceId])

  /**
   * Загрузка метаданных (pipelines, users, customFields)
   */
  const loadMetadata = useCallback(async () => {
    if (!workspaceId || !connection) return
    
    try {
      const response = await fetch(`/api/v1/kommo/metadata?workspaceId=${workspaceId}`, {
        credentials: 'include',
        headers: { 'x-request-from': 'internal' }
      })
      const data: KommoMetadataResponse = await response.json()
      
      setPipelines(transformPipelines(data.pipelines || []))
      setUsers(transformUsers(data.users || []))
      setCustomFields(data.customFields || [])
    } catch (err: any) {
      console.error('[useKommo] Failed to load metadata:', err)
      // Не фатальная ошибка — не блокируем UI
    }
  }, [workspaceId, connection])

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
   * OAuth подключение через popup
   */
  const connect = useCallback(() => {
    if (!workspaceId) {
      console.error('[useKommo] No workspaceId available')
      return
    }

    setConnection({
      accountId: '',
      accountDomain: '',
      status: 'connecting'
    })

    const oauthUrl = `/api/v1/kommo/oauth/start?workspaceId=${workspaceId}`
    const popup = window.open(oauthUrl, 'Kommo OAuth', 'width=600,height=700,scrollbars=yes')

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'kommo-oauth-success') {
        setConnection({
          accountId: event.data.accountId || '',
          accountDomain: event.data.subdomain || '',
          status: 'connected',
          connectedAt: new Date()
        })
        popup?.close()
        window.removeEventListener('message', handleMessage)
        // Перезагружаем конфиг и метаданные
        loadConfig()
      } else if (event.data?.type === 'kommo-oauth-error') {
        setConnection({
          accountId: '',
          accountDomain: '',
          status: 'error'
        })
        popup?.close()
        window.removeEventListener('message', handleMessage)
      }
    }

    window.addEventListener('message', handleMessage)

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        setConnection(prev => prev?.status === 'connecting' ? null : prev)
      }
    }, 500)
  }, [workspaceId, loadConfig])

  /**
   * Отключение
   */
  const disconnect = useCallback(() => {
    setConnection(null)
    setConfig(null)
    setPipelines([])
    setUsers([])
    setCustomFields([])
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
      await loadConfig()
      setIsLoading(false)
    }
    init()
  }, [loadConfig])

  // Загрузка метаданных после подключения
  useEffect(() => {
    if (connection?.status === 'connected') {
      loadMetadata()
    }
  }, [connection?.status, loadMetadata])

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
