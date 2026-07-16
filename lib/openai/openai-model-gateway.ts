import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  InvalidStructuredModelOutputError,
  type ModelGateway,
  type StructuredGenerationRequest,
} from "@/lib/openai/model-gateway";

interface ResponseParserClient {
  responses: {
    parse: (
      body: Record<string, unknown>,
      options?: { timeout?: number; signal?: AbortSignal },
    ) => Promise<{ output_parsed: unknown }>;
  };
}

interface OpenAIModelGatewayOptions {
  client?: ResponseParserClient;
  model: string;
  timeoutMs?: number;
}

export class OpenAIModelGateway implements ModelGateway {
  private readonly client: ResponseParserClient;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor({ client, model, timeoutMs = 10_000 }: OpenAIModelGatewayOptions) {
    this.client =
      client ?? (new OpenAI({ maxRetries: 0 }) as unknown as ResponseParserClient);
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async generateStructured<T>({
    schema,
    schemaName,
    instructions,
    input,
    maxOutputTokens,
    signal,
  }: StructuredGenerationRequest<T>): Promise<T> {
    const response = await this.client.responses.parse(
      {
        model: this.model,
        instructions,
        input,
        text: { format: zodTextFormat(schema, schemaName) },
        max_output_tokens: maxOutputTokens,
        store: false,
      },
      { timeout: this.timeoutMs, ...(signal ? { signal } : {}) },
    );
    const parsed = schema.safeParse(response.output_parsed);
    if (!parsed.success) throw new InvalidStructuredModelOutputError();
    return parsed.data;
  }
}
