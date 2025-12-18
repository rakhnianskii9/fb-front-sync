import { useState, useEffect, useCallback } from 'react'
import logger from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Loader2, ChevronDown, ChevronUp, Info, Sparkles } from 'lucide-react'

// Интерфейс шаблона события
interface EventTemplate {
  id: string
  eventName: string
  displayName: string
  description?: string
  category: string
  requiredFields: string[]
  recommendedFields: string[]
  idealStructure: {
    user_data?: Record<string, any>
    custom_data?: Record<string, any>
  }
  expectedQualityScore: number
}

// Интерфейс параметров события
interface EventParams {
  userData: {
    em?: string           // email
    ph?: string           // phone
    external_id?: string  // external ID
    fn?: string           // first name
    ln?: string           // last name
    ct?: string           // city
    st?: string           // state
    zp?: string           // zip
    country?: string      // country
    client_ip_address?: string
    fbc?: string          // facebook click id
    fbp?: string          // facebook browser id
  }
  customData: {
    value?: number
    currency?: string
    content_ids?: string
    content_type?: string
    content_name?: string
    content_category?: string
    num_items?: number
  }
}

interface TestEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventType: string
  onSend: (userData: Record<string, any>, customData: Record<string, any>) => Promise<void>
  isLoading?: boolean
}

// Event type labels
const EVENT_LABELS: Record<string, string> = {
  Purchase: 'Purchase',
  AddToCart: 'Add to Cart',
  ViewContent: 'View Content',
  Lead: 'Lead',
  CompleteRegistration: 'Complete Registration',
  InitiateCheckout: 'Initiate Checkout',
  AddPaymentInfo: 'Add Payment Info',
  Search: 'Search',
}

// Field hints
const FIELD_HINTS: Record<string, string> = {
  em: 'User email (will be hashed)',
  ph: 'Phone number with country code',
  external_id: 'Unique user ID in your system',
  fn: 'First name (will be hashed)',
  ln: 'Last name (will be hashed)',
  value: 'Purchase amount',
  currency: 'Currency (USD, EUR, etc.)',
  content_ids: 'Product IDs (comma-separated)',
  content_type: 'product or product_group',
  content_name: 'Product/service name',
  fbc: 'Facebook Click ID (from fbclid URL parameter)',
  fbp: 'Facebook Browser ID (from _fbp cookie)',
}

export function TestEventModal({
  open,
  onOpenChange,
  eventType,
  onSend,
  isLoading = false,
}: TestEventModalProps) {
  // Состояние формы
  const [params, setParams] = useState<EventParams>({
    userData: {},
    customData: {},
  })
  
  // Загрузка шаблона
  const [template, setTemplate] = useState<EventTemplate | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  
  // Секции
  const [userDataOpen, setUserDataOpen] = useState(true)
  const [customDataOpen, setCustomDataOpen] = useState(true)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Загрузка шаблона события при открытии
  useEffect(() => {
    if (open && eventType) {
      loadTemplate(eventType)
    }
  }, [open, eventType])

  // Загрузка шаблона из API
  const loadTemplate = useCallback(async (eventName: string) => {
    setTemplateLoading(true)
    try {
      const response = await fetch(`/api/v1/facebook-event-templates/event/${eventName}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.template) {
          setTemplate(data.template)
          // Предзаполняем поля из idealStructure если пусто
          if (data.template.idealStructure?.custom_data?.currency && !params.customData.currency) {
            setParams(prev => ({
              ...prev,
              customData: {
                ...prev.customData,
                currency: 'USD',
              }
            }))
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load event template:', error)
    } finally {
      setTemplateLoading(false)
    }
  }, [params.customData.currency])

  // Обновление userData поля
  const updateUserData = (field: string, value: string) => {
    setParams(prev => ({
      ...prev,
      userData: {
        ...prev.userData,
        [field]: value || undefined,
      }
    }))
  }

  // Обновление customData поля
  const updateCustomData = (field: string, value: string | number) => {
    setParams(prev => ({
      ...prev,
      customData: {
        ...prev.customData,
        [field]: value || undefined,
      }
    }))
  }

  // Отправка события
  const handleSend = async () => {
    // Преобразуем content_ids в массив
    const customData: Record<string, any> = { ...params.customData }
    if (customData.content_ids && typeof customData.content_ids === 'string') {
      customData.content_ids = customData.content_ids.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    if (customData.value) {
      customData.value = parseFloat(String(customData.value))
    }
    if (customData.num_items) {
      customData.num_items = parseInt(String(customData.num_items), 10)
    }

    // Убираем пустые поля
    const userData: Record<string, any> = {}
    Object.entries(params.userData).forEach(([key, val]) => {
      if (val && String(val).trim()) {
        userData[key] = val
      }
    })

    const cleanCustomData: Record<string, any> = {}
    Object.entries(customData).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        cleanCustomData[key] = val
      }
    })

    await onSend(userData, cleanCustomData)
  }

  // Проверка является ли поле рекомендуемым
  const isRecommended = (field: string) => {
    return template?.recommendedFields?.includes(field)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Configure Test Event</span>
            <Badge variant="secondary">{EVENT_LABELS[eventType] || eventType}</Badge>
          </DialogTitle>
          <DialogDescription>
            Fill in event parameters for better Event Match Quality (EMQ) score.
            {template && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                Expected score: {template.expectedQualityScore}/10
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {templateLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading template...</span>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* User Data Section */}
            <Collapsible open={userDataOpen} onOpenChange={setUserDataOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-3 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="font-medium">User Data (PII)</span>
                  <Badge variant="outline" className="text-xs">+58% conversions</Badge>
                </div>
                {userDataOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="em">Email</Label>
                      {isRecommended('em') && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Input
                      id="em"
                      type="email"
                      placeholder="user@example.com"
                      value={params.userData.em || ''}
                      onChange={(e) => updateUserData('em', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{FIELD_HINTS.em}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="ph">Phone</Label>
                      {isRecommended('ph') && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Input
                      id="ph"
                      type="tel"
                      placeholder="+79001234567"
                      value={params.userData.ph || ''}
                      onChange={(e) => updateUserData('ph', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{FIELD_HINTS.ph}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="external_id">External ID</Label>
                      {isRecommended('external_id') && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Input
                      id="external_id"
                      placeholder="user_12345"
                      value={params.userData.external_id || ''}
                      onChange={(e) => updateUserData('external_id', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{FIELD_HINTS.external_id}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fn">First Name</Label>
                    <Input
                      id="fn"
                      placeholder="John"
                      value={params.userData.fn || ''}
                      onChange={(e) => updateUserData('fn', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ln">Last Name</Label>
                    <Input
                      id="ln"
                      placeholder="Doe"
                      value={params.userData.ln || ''}
                      onChange={(e) => updateUserData('ln', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ct">City</Label>
                    <Input
                      id="ct"
                      placeholder="Moscow"
                      value={params.userData.ct || ''}
                      onChange={(e) => updateUserData('ct', e.target.value)}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Custom Data Section */}
            <Collapsible open={customDataOpen} onOpenChange={setCustomDataOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-3 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Custom Data (Event Details)</span>
                  <Badge variant="outline" className="text-xs">Value-based optimization</Badge>
                </div>
                {customDataOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="value">Value</Label>
                      {isRecommended('value') && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      placeholder="99.99"
                      value={params.customData.value || ''}
                      onChange={(e) => updateCustomData('value', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{FIELD_HINTS.value}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="currency">Currency</Label>
                      {isRecommended('currency') && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Select
                      value={params.customData.currency || ''}
                      onValueChange={(val) => updateCustomData('currency', val)}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="RUB">RUB</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="VND">VND</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="content_ids">Content IDs</Label>
                      {isRecommended('content_ids') && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Input
                      id="content_ids"
                      placeholder="sku_123, sku_456"
                      value={params.customData.content_ids || ''}
                      onChange={(e) => updateCustomData('content_ids', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{FIELD_HINTS.content_ids}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="content_type">Content Type</Label>
                    <Select
                      value={params.customData.content_type || ''}
                      onValueChange={(val) => updateCustomData('content_type', val)}
                    >
                      <SelectTrigger id="content_type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">product</SelectItem>
                        <SelectItem value="product_group">product_group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="content_name">Content Name</Label>
                    <Input
                      id="content_name"
                      placeholder="Premium Subscription"
                      value={params.customData.content_name || ''}
                      onChange={(e) => updateCustomData('content_name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="num_items">Number of Items</Label>
                    <Input
                      id="num_items"
                      type="number"
                      placeholder="1"
                      value={params.customData.num_items || ''}
                      onChange={(e) => updateCustomData('num_items', e.target.value)}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Advanced Section */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-3 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Advanced (FB Click/Browser IDs)</span>
                </div>
                {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="fbc">Facebook Click ID (fbc)</Label>
                      {isRecommended('fbc') && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Input
                      id="fbc"
                      placeholder="fb.1.1596403881668.IwAR1..."
                      value={params.userData.fbc || ''}
                      onChange={(e) => updateUserData('fbc', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{FIELD_HINTS.fbc}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="fbp">Facebook Browser ID (fbp)</Label>
                      {isRecommended('fbp') && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Input
                      id="fbp"
                      placeholder="fb.1.1596403881668.1234567890"
                      value={params.userData.fbp || ''}
                      onChange={(e) => updateUserData('fbp', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{FIELD_HINTS.fbp}</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Info Block */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Recommended for maximum EMQ Score:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Email (+58.96% conversions) or Phone (+30-40%)</li>
                    <li>External ID for cross-device attribution</li>
                    <li>Value + Currency for value-based optimization</li>
                    <li>Content IDs for Dynamic Ads retargeting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isLoading || templateLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Send Test Event'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
