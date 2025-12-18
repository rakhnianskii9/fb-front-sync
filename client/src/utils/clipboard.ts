/**
 * Кроссбраузерная копия текста в буфер обмена с fallback на execCommand.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('[clipboard] navigator.clipboard.writeText error', error);
  }

  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackError) {
    console.error('[clipboard] execCommand fallback failed', fallbackError);
    return false;
  }
}
