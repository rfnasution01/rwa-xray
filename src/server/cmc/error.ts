export type CmcErrorCode =
  | "CMC_BAD_REQUEST"
  | "CMC_UNAUTHORIZED"
  | "CMC_FORBIDDEN"
  | "CMC_NOT_FOUND"
  | "CMC_RATE_LIMITED"
  | "CMC_UPSTREAM_ERROR"
  | "CMC_TIMEOUT"
  | "CMC_NETWORK_ERROR"
  | "CMC_INVALID_RESPONSE";

export class CmcApiError extends Error {
  readonly code: CmcErrorCode;
  readonly status: number | null;
  readonly retryable: boolean;
  readonly attempts: number;
  readonly details?: unknown;

  constructor(options: {
    code: CmcErrorCode;
    message: string;
    status?: number | null;
    retryable: boolean;
    attempts: number;
    cause?: unknown;
    details?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "CmcApiError";
    this.code = options.code;
    this.status = options.status ?? null;
    this.retryable = options.retryable;
    this.attempts = options.attempts;
    this.details = options.details;
  }
}

export function errorCodeForStatus(status: number): CmcErrorCode {
  if (status === 400) return "CMC_BAD_REQUEST";
  if (status === 401) return "CMC_UNAUTHORIZED";
  if (status === 403) return "CMC_FORBIDDEN";
  if (status === 404) return "CMC_NOT_FOUND";
  if (status === 429) return "CMC_RATE_LIMITED";
  return "CMC_UPSTREAM_ERROR";
}

export function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}
