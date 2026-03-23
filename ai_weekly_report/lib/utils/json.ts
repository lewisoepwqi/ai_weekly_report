export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[safeJsonParse] 解析失败:', error instanceof Error ? error.message : error, '原始值:', value?.slice(0, 80));
    }
    return fallback;
  }
}
