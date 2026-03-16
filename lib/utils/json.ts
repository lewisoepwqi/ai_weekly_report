export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('JSON parse failed:', error, 'value:', value?.substring(0, 200));
    return fallback;
  }
}
