/**
 * Санитизирует произвольное значение метрики и гарантирует конечное число.
 * Удаляет декоративные символы (пробелы, запятые), обрабатывает placeholder "--".
 */
export function sanitizeMetricValue(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '--') {
      return 0;
    }

    const normalized = trimmed.replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'object' && value && 'value' in (value as Record<string, unknown>)) {
    return sanitizeMetricValue((value as Record<string, unknown>).value);
  }

  return 0;
}
