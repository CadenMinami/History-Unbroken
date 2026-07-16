import { InvalidStructuredModelOutputError } from "@/lib/openai/model-gateway";
import type { ModelFailureReason } from "@/schemas/ai-contracts";

export interface ProviderFailure {
  reason: ModelFailureReason;
  retryable: boolean;
}

export function classifyProviderError(error: unknown): ProviderFailure {
  if (error instanceof InvalidStructuredModelOutputError) {
    return { reason: "invalid_model_output", retryable: false };
  }
  if (error instanceof TypeError) return { reason: "provider_error", retryable: true };

  if (typeof error === "object" && error !== null) {
    const name = "name" in error ? String((error as { name: unknown }).name) : "";
    if (name === "AbortError") return { reason: "aborted", retryable: false };
    if (name === "APIConnectionTimeoutError") {
      return { reason: "timeout", retryable: true };
    }
    if (name === "APIConnectionError") {
      return { reason: "provider_error", retryable: true };
    }

    if ("status" in error) {
      const status = Number((error as { status: unknown }).status);
      if (status === 408) return { reason: "timeout", retryable: true };
      if (status === 429) return { reason: "rate_limited", retryable: true };
      if (status >= 500) return { reason: "provider_error", retryable: true };
      return { reason: "provider_error", retryable: false };
    }
  }

  return { reason: "provider_error", retryable: false };
}
