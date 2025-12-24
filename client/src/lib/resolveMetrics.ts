/**
 * Утилита для автоматического подбора релевантных метрик из availableMetricIds.
 * 
 * Когда пользователь выбирает "conversions" или "cost_per_conversion", 
 * но в данных есть только конкретные типы (conversions_purchase, cost_per_conversion_lead),
 * эта утилита автоматически подставляет вариант с наибольшим количеством выполнений.
 * 
 * Если прямых паттернов нет — ищет любую метрику из логической группы.
 * 
 * ВАЖНО: "results" и "conversions" — это результаты оптимизации кампании.
 * Для messaging кампаний results_messaging_* — это РЕАЛЬНЫЕ конверсии.
 * Для purchase кампаний results_purchase — это конверсии.
 * Мы НЕ фильтруем по типу, а показываем ВСЕ results/conversions.
 */

/**
 * Маппинг generic метрик на их динамические паттерны (прямой резолв).
 * Используем wildcard паттерны — подходит ЛЮБОЙ results_* или conversions_*.
 */
const GENERIC_TO_DYNAMIC_PATTERNS: Record<string, string[]> = {
  // Conversions - wildcard паттерн (любой тип конверсии)
  'conversions': ['conversions_'],
  'cost_per_conversion': ['cost_per_conversion_'],
  
  // Results - wildcard паттерн (любой тип результата)
  'results': ['results_'],
  'result_rate': ['result_rate_'],
  'cost_per_result': ['cost_per_result_'],
  
  // Actions
  'actions': ['actions_'],
  'unique_actions': ['unique_actions_'],
  'cost_per_action_type': ['cost_per_action_type_'],
  'cost_per_unique_action_type': ['cost_per_unique_action_type_'],
};

/**
 * Все паттерны группы "Conversions & Results" для фоллбэка.
 * Используем wildcard — берём ВСЕ results_* и conversions_*.
 * 
 * ВАЖНО: НЕ фильтруем по типу (messaging, purchase, lead и т.д.).
 * Тип результата зависит от optimization_goal кампании.
 */
const CONVERSIONS_RESULTS_GROUP_PATTERNS = [
  // Results — любые типы результатов
  'results_',
  // Conversions — любые типы конверсий  
  'conversions_',
  // Actions — конверсионные действия (НЕ engagement!)
  'actions_onsite_conversion.lead',
  'actions_onsite_conversion.purchase',
  'actions_onsite_conversion.fb_pixel',
  'actions_onsite_conversion.complete_registration',
  'actions_onsite_conversion.add_to_cart',
  'actions_onsite_conversion.initiate_checkout',
  'actions_onsite_conversion.add_payment_info',
  'actions_onsite_conversion.subscribe',
  'actions_onsite_conversion.contact',
  'actions_offsite_conversion',
  'actions_lead',
  'actions_purchase',
  'actions_add_to_cart',
  'actions_complete_registration',
  // Cost per
  'cost_per_result_',
  'cost_per_conversion_',
  'cost_per_action_type_onsite_conversion.lead',
  'cost_per_action_type_onsite_conversion.purchase',
  'cost_per_action_type_offsite_conversion',
];

// Паттерны ИСКЛЮЧЕНИЯ из конверсий — это engagement, не конверсии
const CONVERSIONS_EXCLUDE_PATTERNS = [
  'post_net_like',
  'post_unlike', 
  'post_save',
  'post_net_save',
  'post_engagement',
  'page_engagement',
  'post_reaction',
  'comment',
  'like',
  'photo_view',
];

/**
 * Статические метрики группы (без паттернов)
 */
const CONVERSIONS_RESULTS_STATIC_METRICS = [
  'results',
  'result_rate', 
  'cost_per_result',
  'conversions',
  'conversion_values',
  'cost_per_conversion',
  'actions',
  'unique_actions',
  'action_values',
  'conversion_leads',
  'conversion_lead_rate',
  'cost_per_conversion_lead',
  'dda_countby_convs',
  'cost_per_dda_countby_convs',
  'dda_results',
];

/**
 * Метрики, для которых применяется групповой фоллбэк
 */
const METRICS_WITH_GROUP_FALLBACK = new Set([
  'conversions',
  'cost_per_conversion',
  'results',
  'result_rate',
  'cost_per_result',
]);

/**
 * Тип данных метрик: date → itemId → metricId → value
 */
type MetricsData = Record<string, Record<string, Record<string, number>>>;

/**
 * Находит все метрики из группы Conversions & Results среди доступных
 * ИСКЛЮЧАЕТ engagement метрики (post_net_like, post_save и т.д.)
 */
function findGroupMetrics(availableMetricIds: string[]): string[] {
  const found: string[] = [];
  
  for (const metricId of availableMetricIds) {
    // Проверяем исключения — это engagement, не конверсии
    const isExcluded = CONVERSIONS_EXCLUDE_PATTERNS.some(excl => metricId.includes(excl));
    if (isExcluded) continue;
    
    // Проверяем статические метрики
    if (CONVERSIONS_RESULTS_STATIC_METRICS.includes(metricId)) {
      found.push(metricId);
      continue;
    }
    // Проверяем динамические паттерны
    for (const pattern of CONVERSIONS_RESULTS_GROUP_PATTERNS) {
      if (metricId.startsWith(pattern)) {
        found.push(metricId);
        break;
      }
    }
  }
  
  return found;
}

/**
 * Ищет наиболее релевантную динамическую метрику по количеству выполнений.
 * Выбирает вариант с максимальной суммой значений по всем данным.
 * 
 * Если прямых паттернов нет — использует фоллбэк на всю группу Conversions & Results.
 * 
 * @param genericMetricId - ID generic метрики (например, 'conversions')
 * @param availableMetricIds - список доступных метрик из БД
 * @param metricsData - данные метрик для подсчёта сумм (опционально)
 * @returns ID релевантной метрики или исходный ID если не найдено
 */
export function resolveMetric(
  genericMetricId: string, 
  availableMetricIds: string[],
  metricsData?: MetricsData
): string {
  // Если метрика уже есть в доступных — возвращаем как есть
  if (availableMetricIds.includes(genericMetricId)) {
    return genericMetricId;
  }
  
  // Проверяем, есть ли паттерны для этой generic метрики
  const patterns = GENERIC_TO_DYNAMIC_PATTERNS[genericMetricId];
  
  let matchingMetrics: string[] = [];
  
  if (patterns) {
    // Ищем все совпадающие динамические метрики по прямым паттернам
    for (const pattern of patterns) {
      for (const metricId of availableMetricIds) {
        if (metricId.startsWith(pattern)) {
          matchingMetrics.push(metricId);
        }
      }
    }
  }
  
  // Если прямых паттернов нет и метрика поддерживает групповой фоллбэк
  if (matchingMetrics.length === 0 && METRICS_WITH_GROUP_FALLBACK.has(genericMetricId)) {
    matchingMetrics = findGroupMetrics(availableMetricIds);
  }

  // ВАЖНО: если пользователь выбрал количественные метрики 'conversions'/'results',
  // мы не должны подменять их на cost/rate метрики даже при групповом фоллбэке.
  // Иначе UI начинает форматировать значение как валюту (см. formatMetricValue: metricId.includes('cost')).
  if ((genericMetricId === 'conversions' || genericMetricId === 'results') && matchingMetrics.length > 0) {
    const countOnly = matchingMetrics.filter((metricId) => {
      const lowered = metricId.toLowerCase();
      return !(
        lowered.includes('cost') ||
        lowered.includes('_rate') ||
        lowered.includes('_ctr') ||
        lowered.includes('_cpm') ||
        lowered.includes('_cpc') ||
        lowered.includes('_roas') ||
        lowered.includes('_value')
      );
    });

    if (countOnly.length > 0) {
      matchingMetrics = countOnly;
    }
  }
  
  if (matchingMetrics.length === 0) {
    return genericMetricId;
  }
  
  // Если только одна — возвращаем её
  if (matchingMetrics.length === 1) {
    return matchingMetrics[0];
  }
  
  // Если нет данных для подсчёта — возвращаем первую
  if (!metricsData || Object.keys(metricsData).length === 0) {
    return matchingMetrics[0];
  }
  
  // Считаем сумму по каждой метрике
  const sums = matchingMetrics.map(metricId => {
    let total = 0;
    for (const dateData of Object.values(metricsData)) {
      for (const itemData of Object.values(dateData)) {
        const value = itemData[metricId];
        if (typeof value === 'number' && !isNaN(value)) {
          total += value;
        }
      }
    }
    return { metricId, total };
  });
  
  // Сортируем по убыванию суммы
  sums.sort((a, b) => b.total - a.total);
  
  return sums[0].metricId;
}

/**
 * Резолвит массив метрик, заменяя generic на динамические.
 * 
 * @param metricIds - исходный массив метрик
 * @param availableMetricIds - доступные метрики из БД
 * @param metricsData - данные метрик для выбора по количеству (опционально)
 * @returns массив с замененными метриками
 */
export function resolveMetrics(
  metricIds: string[], 
  availableMetricIds: string[],
  metricsData?: MetricsData
): string[] {
  return metricIds.map(id => resolveMetric(id, availableMetricIds, metricsData));
}

/**
 * Проверяет, является ли метрика generic (требует резолва).
 */
export function isGenericMetric(metricId: string): boolean {
  return metricId in GENERIC_TO_DYNAMIC_PATTERNS;
}

/**
 * Проверяет, доступна ли метрика в данных (напрямую или через резолв).
 * Используется для фильтрации — скрыть метрики, которых нет в БД.
 */
export function isMetricResolvable(metricId: string, availableMetricIds: string[]): boolean {
  // Метрика есть напрямую
  if (availableMetricIds.includes(metricId)) {
    return true;
  }
  
  // Проверяем прямые паттерны
  const patterns = GENERIC_TO_DYNAMIC_PATTERNS[metricId];
  if (patterns) {
    for (const pattern of patterns) {
      for (const available of availableMetricIds) {
        if (available.startsWith(pattern)) {
          return true;
        }
      }
    }
  }
  
  // Проверяем групповой фоллбэк для Conversions & Results
  if (METRICS_WITH_GROUP_FALLBACK.has(metricId)) {
    return findGroupMetrics(availableMetricIds).length > 0;
  }
  
  return false;
}

/**
 * Фильтрует массив метрик, оставляя только те, что есть в данных.
 */
export function filterResolvableMetrics(metricIds: string[], availableMetricIds: string[]): string[] {
  return metricIds.filter(id => isMetricResolvable(id, availableMetricIds));
}

/**
 * Получает все доступные варианты для generic метрики.
 * Полезно для UI — показать dropdown с вариантами.
 */
export function getAvailableVariants(genericMetricId: string, availableMetricIds: string[]): string[] {
  const patterns = GENERIC_TO_DYNAMIC_PATTERNS[genericMetricId];
  if (!patterns) return [];
  
  const variants: string[] = [];
  for (const pattern of patterns) {
    for (const metricId of availableMetricIds) {
      if (metricId.startsWith(pattern)) {
        variants.push(metricId);
      }
    }
  }
  
  return variants;
}

/**
 * Получает все варианты конверсий/результатов с их значениями.
 * Сортирует по убыванию значения.
 * 
 * Берёт ВСЕ results_* и conversions_* метрики, включая messaging, video и т.д.
 * Тип результата зависит от optimization_goal кампании:
 * - Для MESSAGES кампаний: results_messaging_* — это реальные конверсии
 * - Для CONVERSIONS кампаний: results_purchase, results_lead — это конверсии
 * 
 * ИСКЛЮЧАЕТ только: cost метрики и rate/процентные метрики
 * 
 * @param availableMetricIds - доступные метрики из БД
 * @param aggregatedMetrics - агрегированные значения метрик
 * @returns массив { metricId, value } отсортированный по value DESC
 */
export function getAllConversionVariants(
  availableMetricIds: string[],
  aggregatedMetrics: Record<string, { total: number; change?: number | null; changePercent?: number | null }>
): Array<{ metricId: string; value: number; changePercent: number | null }> {
  // Паттерны ИСКЛЮЧЕНИЯ — это НЕ количественные результаты, а производные метрики
  const excludePatterns = [
    'cost_per_',      // cost метрики (цена за результат)
    '_rate',          // rate метрики (проценты)
    '_ctr',           // ctr (click-through rate)
    '_cpm',           // cpm (cost per mille)
    '_cpc',           // cpc (cost per click)
    '_roas',          // roas (return on ad spend)
    '_value',         // value метрики (денежные значения)
  ];
  
  // Делим варианты на results_* и conversions_*.
  // Важно: в Facebook Insights эти группы могут пересекаться по смыслу.
  // Для карточки «Conversions» выбираем results_* если они есть, иначе conversions_*,
  // чтобы не получить двойной счёт.
  const resultsMetrics: Array<{ metricId: string; value: number; changePercent: number | null }> = [];
  const conversionsMetrics: Array<{ metricId: string; value: number; changePercent: number | null }> = [];
  
  for (const metricId of availableMetricIds) {
    const isResults = metricId.startsWith('results_');
    const isConversions = metricId.startsWith('conversions_');
    if (!isResults && !isConversions) continue;
    
    // Пропускаем cost/rate/процентные метрики
    const isExcluded = excludePatterns.some(pattern => metricId.includes(pattern));
    if (isExcluded) continue;
    
    // Проверяем что есть данные
    if (aggregatedMetrics[metricId]) {
      const { total } = aggregatedMetrics[metricId];
      const changePercent = aggregatedMetrics[metricId].changePercent ?? null;
      if (total > 0) {
        const entry = { metricId, value: total, changePercent };
        if (isResults) {
          resultsMetrics.push(entry);
        } else {
          conversionsMetrics.push(entry);
        }
      }
    }
  }

  const chosen = resultsMetrics.length > 0 ? resultsMetrics : conversionsMetrics;

  // Сортируем по убыванию значения
  chosen.sort((a, b) => b.value - a.value);

  return chosen;
}
