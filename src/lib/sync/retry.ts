export type SyncRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableSyncResponse(response: Response): boolean {
  return RETRYABLE_STATUS_CODES.has(response.status);
}

/**
 * Retries a sync request after transient transport/server failures.
 * Callers must reuse the same operation IDs and request body on every attempt;
 * the server-side idempotency record then turns a retry into a replay instead
 * of a second domain mutation.
 */
export async function pushSyncWithRetry(
  request: () => Promise<Response>,
  options: SyncRetryOptions = {},
): Promise<Response> {
  const maxAttempts = Math.max(1, Math.trunc(options.maxAttempts ?? 3));
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 250);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await request();
      if (!isRetryableSyncResponse(response) || attempt === maxAttempts) return response;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw error;
    }

    await delay(baseDelayMs * 2 ** (attempt - 1));
  }

  throw lastError instanceof Error ? lastError : new Error("SYNC_RETRY_EXHAUSTED");
}
