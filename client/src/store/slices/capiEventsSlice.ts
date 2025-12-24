import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import fbAdsApi, {
    type ApiCapiEventDetail,
    type ApiCapiEventListItem,
    type ApiCapiEventsResponse,
    type CapiDatePreset,
    type CapiEventStatus
} from '../../api/fbAds'
import { getActiveWorkspaceIdFromStorage } from '../../utils/flowiseSession'

export type CapiEventsDatePreset = CapiDatePreset

export interface CapiEventsFilters {
    status: CapiEventStatus[]
    pixelIds: string[]
    datasetIds: string[]
    actionSources: string[]
    isTestEvent?: boolean
    search: string
    dateFrom?: string
    dateTo?: string
    datePreset: CapiEventsDatePreset
    limit: number
    offset: number
    sortDirection: 'asc' | 'desc'
}

interface CapiEventsDetailState {
    data: ApiCapiEventDetail | null
    loading: boolean
    error: string | null
}

export interface CapiEventsState {
    items: ApiCapiEventListItem[]
    total: number
    limit: number
    offset: number
    timeRange: { from: string; to: string } | null
    loading: boolean
    error: string | null
    filters: CapiEventsFilters
    selectedEventId: string | null
    detail: CapiEventsDetailState
}

interface CapiEventsThunkState {
    user: {
        currentUser: {
            activeWorkspaceId?: string
        } | null
    }
    capiEvents: CapiEventsState
}

const DEFAULT_LIMIT = 25

/** Возвращает ISO-интервал для преднастроенного диапазона. */
export const calculatePresetRange = (preset: CapiEventsDatePreset): { from: string; to: string } => {
    const to = new Date()
    const from = new Date(to)

    switch (preset) {
        case '24h':
            from.setHours(from.getHours() - 24)
            break
        case '7d':
            from.setDate(from.getDate() - 7)
            break
        case '30d':
            from.setDate(from.getDate() - 30)
            break
        case '90d':
            from.setDate(from.getDate() - 90)
            break
        default:
            from.setDate(from.getDate() - 7)
    }

    return {
        from: from.toISOString(),
        to: to.toISOString()
    }
}

const initialRange = calculatePresetRange('7d')

const initialState: CapiEventsState = {
    items: [],
    total: 0,
    limit: DEFAULT_LIMIT,
    offset: 0,
    timeRange: null,
    loading: false,
    error: null,
    filters: {
        status: [],
        pixelIds: [],
        datasetIds: [],
        actionSources: [],
        isTestEvent: undefined,
        search: '',
        dateFrom: initialRange.from,
        dateTo: initialRange.to,
        datePreset: '7d',
        limit: DEFAULT_LIMIT,
        offset: 0,
        sortDirection: 'desc'
    },
    selectedEventId: null,
    detail: {
        data: null,
        loading: false,
        error: null
    }
}

export const fetchCapiEvents = createAsyncThunk<
    ApiCapiEventsResponse,
    void,
    { state: CapiEventsThunkState; rejectValue: string }
>('capiEvents/fetchList', async (_, { getState, rejectWithValue }) => {
    try {
        const state = getState()
        const workspaceId =
            state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage()

        if (!workspaceId) {
            throw new Error('Workspace is not selected')
        }

        const filters = state.capiEvents.filters

        return await fbAdsApi.capiEvents.list({
            workspaceId,
            status: filters.status.length ? filters.status : undefined,
            pixelIds: filters.pixelIds.length ? filters.pixelIds : undefined,
            datasetIds: filters.datasetIds.length ? filters.datasetIds : undefined,
            actionSources: filters.actionSources.length ? filters.actionSources : undefined,
            isTestEvent: typeof filters.isTestEvent === 'boolean' ? filters.isTestEvent : undefined,
            search: filters.search?.trim() ? filters.search.trim() : undefined,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            limit: filters.limit,
            offset: filters.offset,
            sortDirection: filters.sortDirection
        })
    } catch (error: any) {
        const message = error?.response?.data?.message || error.message || 'Failed to load CAPI events'
        return rejectWithValue(message)
    }
})

export const fetchCapiEventDetail = createAsyncThunk<
    ApiCapiEventDetail,
    string,
    { state: CapiEventsThunkState; rejectValue: string }
>('capiEvents/fetchDetail', async (eventId, { getState, rejectWithValue }) => {
    try {
        if (!eventId) {
            throw new Error('Event id is required')
        }

        const state = getState()
        const workspaceId =
            state.user.currentUser?.activeWorkspaceId || getActiveWorkspaceIdFromStorage()

        if (!workspaceId) {
            throw new Error('Workspace is not selected')
        }

        return await fbAdsApi.capiEvents.detail({ workspaceId, eventId })
    } catch (error: any) {
        const message = error?.response?.data?.message || error.message || 'Failed to load CAPI event'
        return rejectWithValue(message)
    }
})

const capiEventsSlice = createSlice({
    name: 'capiEvents',
    initialState,
    reducers: {
        updateFilters(
            state,
            action: PayloadAction<{ changes: Partial<CapiEventsFilters>; preserveOffset?: boolean }>
        ) {
            const { preserveOffset, changes } = action.payload
            const effectiveChanges = { ...changes }

            if (effectiveChanges.datePreset && !effectiveChanges.dateFrom && !effectiveChanges.dateTo) {
                const nextRange = calculatePresetRange(effectiveChanges.datePreset)
                effectiveChanges.dateFrom = nextRange.from
                effectiveChanges.dateTo = nextRange.to
            }

            state.filters = {
                ...state.filters,
                ...effectiveChanges
            }

            if (!preserveOffset) {
                state.filters.offset = 0
            }
        },
        setPagination(state, action: PayloadAction<{ offset: number }>) {
            state.filters.offset = Math.max(0, action.payload.offset)
        },
        setSelectedEventId(state, action: PayloadAction<string | null>) {
            state.selectedEventId = action.payload
        },
        resetEventDetail(state) {
            state.selectedEventId = null
            state.detail = {
                data: null,
                loading: false,
                error: null
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCapiEvents.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchCapiEvents.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload.items
                state.total = action.payload.total
                state.limit = action.payload.limit
                state.offset = action.payload.offset
                state.timeRange = action.payload.timeRange
            })
            .addCase(fetchCapiEvents.rejected, (state, action) => {
                state.loading = false
                state.items = []
                state.total = 0
                state.timeRange = null
                state.error =
                    action.payload || action.error.message || 'Failed to load CAPI events'
            })
            .addCase(fetchCapiEventDetail.pending, (state) => {
                state.detail.loading = true
                state.detail.error = null
                state.detail.data = null
            })
            .addCase(fetchCapiEventDetail.fulfilled, (state, action) => {
                state.detail.loading = false
                state.detail.data = action.payload
            })
            .addCase(fetchCapiEventDetail.rejected, (state, action) => {
                state.detail.loading = false
                state.detail.error =
                    action.payload || action.error.message || 'Failed to get event details'
            })
    }
})

export const { updateFilters, setPagination, setSelectedEventId, resetEventDetail } = capiEventsSlice.actions

export default capiEventsSlice.reducer
