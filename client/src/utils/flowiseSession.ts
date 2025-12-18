const FLOWISE_USER_STORAGE_KEY = 'user'

export type FlowiseStoredWorkspace = {
  id?: string
  name?: string
}

export type FlowiseStoredUser = {
  id?: string
  email?: string
  name?: string
  activeWorkspaceId?: string
  assignedWorkspaces?: FlowiseStoredWorkspace[]
}

const isBrowser = typeof window !== 'undefined'

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw || raw === 'undefined') return null
  try {
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn('[flowiseSession] Не удалось распарсить localStorage user', error)
    return null
  }
}

export const readFlowiseUser = (): FlowiseStoredUser | null => {
  if (!isBrowser) return null
  return safeParse<FlowiseStoredUser>(window.localStorage.getItem(FLOWISE_USER_STORAGE_KEY))
}

export const getActiveWorkspaceIdFromStorage = (): string | undefined => {
  const user = readFlowiseUser()
  if (!user) return undefined
  if (user.activeWorkspaceId) return user.activeWorkspaceId
  const candidate = user.assignedWorkspaces?.find((workspace) => !!workspace?.id)
  return candidate?.id
}

export const getUserIdFromStorage = (): string | undefined => {
  const user = readFlowiseUser()
  return user?.id
}

/** Обновляет активный workspace в сторадже пользователя */
export const persistActiveWorkspaceId = (workspaceId: string): void => {
  if (!isBrowser || !workspaceId) return
  const user = readFlowiseUser() ?? {}
  window.localStorage.setItem(
    FLOWISE_USER_STORAGE_KEY,
    JSON.stringify({ ...user, activeWorkspaceId: workspaceId })
  )
}

/** Возвращает воркспейсы пользователя из localStorage */
export const getAssignedWorkspacesFromStorage = (): FlowiseStoredWorkspace[] => {
  const user = readFlowiseUser()
  return user?.assignedWorkspaces ?? []
}
