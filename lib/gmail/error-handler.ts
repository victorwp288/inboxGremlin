export enum GmailErrorType {
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  INVALID_TOKEN = "INVALID_TOKEN",
  RATE_LIMITED = "RATE_LIMITED",
  NETWORK_ERROR = "NETWORK_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNKNOWN = "UNKNOWN",
}

export interface GmailError {
  type: GmailErrorType;
  message: string;
  originalError?: any;
  retryable: boolean;
  retryAfter?: number; // seconds
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  retryableErrors: GmailErrorType[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
}

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export class GmailErrorHandler {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: [
      GmailErrorType.RATE_LIMITED,
      GmailErrorType.NETWORK_ERROR,
      GmailErrorType.QUOTA_EXCEEDED,
    ],
  };

  private circuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
  };

  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    if (retryConfig) {
      this.retryConfig = { ...this.retryConfig, ...retryConfig };
    }
    if (circuitBreakerConfig) {
      this.circuitBreakerConfig = {
        ...this.circuitBreakerConfig,
        ...circuitBreakerConfig,
      };
    }
  }

  /**
   * Execute a function with retry logic and circuit breaker
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = "gmail_operation"
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitState === CircuitState.OPEN) {
      if (
        Date.now() - this.lastFailureTime <
        this.circuitBreakerConfig.resetTimeout
      ) {
        throw this.createError(
          GmailErrorType.NETWORK_ERROR,
          "Circuit breaker is open. Service temporarily unavailable.",
          false
        );
      } else {
        this.circuitState = CircuitState.HALF_OPEN;
        this.failureCount = 0;
      }
    }

    let lastError: GmailError | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        this.onSuccess();
        return result;
      } catch (error) {
        const gmailError = this.parseError(error);
        lastError = gmailError;

        console.warn(
          `${operationName} failed (attempt ${attempt + 1}):`,
          gmailError
        );

        // Check if we should retry
        if (
          attempt < this.retryConfig.maxRetries &&
          this.shouldRetry(gmailError)
        ) {
          const delay = this.calculateDelay(attempt, gmailError.retryAfter);
          console.log(`Retrying ${operationName} in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // All retries exhausted or non-retryable error
        this.onFailure();
        throw gmailError;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError!;
  }

  /**
   * Parse various error types into standardized GmailError
   */
  parseError(error: any): GmailError {
    // Handle Google API errors
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      return this.parseGoogleApiError(apiError, error);
    }

    // Handle network errors
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return this.createError(
        GmailErrorType.NETWORK_ERROR,
        "Network connection failed",
        true,
        undefined,
        error
      );
    }

    // Handle timeout errors
    if (error.code === "ETIMEDOUT") {
      return this.createError(
        GmailErrorType.NETWORK_ERROR,
        "Request timed out",
        true,
        undefined,
        error
      );
    }

    // Handle unknown errors
    return this.createError(
      GmailErrorType.UNKNOWN,
      error.message || "Unknown error occurred",
      false,
      undefined,
      error
    );
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  private parseGoogleApiError(apiError: any, originalError: any): GmailError {
    const message = apiError.message || "Google API error";
    const code = apiError.code;

    switch (code) {
      case 429:
        return this.createError(
          GmailErrorType.RATE_LIMITED,
          "Rate limit exceeded",
          true,
          this.extractRetryAfter(originalError),
          originalError
        );

      case 403:
        if (message.includes("insufficient") || message.includes("scope")) {
          return this.createError(
            GmailErrorType.INSUFFICIENT_PERMISSIONS,
            "Insufficient permissions or scope",
            false,
            undefined,
            originalError
          );
        }
        if (message.includes("quota")) {
          return this.createError(
            GmailErrorType.QUOTA_EXCEEDED,
            "API quota exceeded",
            true,
            3600, // Retry after 1 hour for quota
            originalError
          );
        }
        break;

      case 401:
        return this.createError(
          GmailErrorType.INVALID_TOKEN,
          "Invalid or expired access token",
          false,
          undefined,
          originalError
        );

      case 404:
        return this.createError(
          GmailErrorType.NOT_FOUND,
          "Resource not found",
          false,
          undefined,
          originalError
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return this.createError(
          GmailErrorType.NETWORK_ERROR,
          "Server error",
          true,
          undefined,
          originalError
        );
    }

    return this.createError(
      GmailErrorType.UNKNOWN,
      message,
      false,
      undefined,
      originalError
    );
  }

  private createError(
    type: GmailErrorType,
    message: string,
    retryable: boolean,
    retryAfter?: number,
    originalError?: any
  ): GmailError {
    return {
      type,
      message,
      retryable,
      retryAfter,
      originalError,
    };
  }

  private shouldRetry(error: GmailError): boolean {
    return (
      error.retryable && this.retryConfig.retryableErrors.includes(error.type)
    );
  }

  private calculateDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff with jitter
    const baseDelay =
      this.retryConfig.baseDelay *
      Math.pow(this.retryConfig.backoffFactor, attempt);
    const jitteredDelay = baseDelay * (0.5 + Math.random() * 0.5); // Add 0-50% jitter
    return Math.min(jitteredDelay, this.retryConfig.maxDelay);
  }

  private extractRetryAfter(error: any): number | undefined {
    const retryAfterHeader = error.response?.headers?.["retry-after"];
    if (retryAfterHeader) {
      const retryAfter = parseInt(retryAfterHeader, 10);
      return isNaN(retryAfter) ? undefined : retryAfter;
    }
    return undefined;
  }

  private onSuccess(): void {
    this.successCount++;

    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.circuitState = CircuitState.CLOSED;
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      this.circuitState = CircuitState.OPEN;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for global error handling
 */
export const gmailErrorHandler = new GmailErrorHandler();
