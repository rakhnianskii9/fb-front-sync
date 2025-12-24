// Kommo CRM provider UI exports (wizard steps).
// This is a provider module under the generic CRM integration layer.

export { ConnectStep, type KommoCredentials } from '@/components/kommo/ConnectStep'
export { InboundStep } from '@/components/kommo/InboundStep'
export { FieldsStep } from '@/components/kommo/FieldsStep'
export { EventsStep } from '@/components/kommo/EventsStep'
export { DistributionStep } from '@/components/kommo/DistributionStep'
export { ReviewStep } from '@/components/kommo/ReviewStep'
export { FeatureCards } from '@/components/kommo/FeatureCards'

export type {
    KommoConnection,
    KommoPipeline,
    KommoStatus,
    KommoUser,
    KommoCustomField
} from '@/components/kommo/types'
