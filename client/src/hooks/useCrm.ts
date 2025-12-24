import { useKommo } from './useKommo'

export type CrmProviderKey = 'kommo'

/**
 * CRM provider hook.
 * For now the product supports only one CRM provider (Kommo), but the CRM page
 * should depend on this generic hook rather than a provider-specific one.
 */
export function useCrm(provider: CrmProviderKey) {
    // Keep hooks order stable: always call the Kommo hook.
    const kommo = useKommo()

    if (provider !== 'kommo') {
        throw new Error(`Unsupported CRM provider: ${provider}`)
    }

    return kommo
}
