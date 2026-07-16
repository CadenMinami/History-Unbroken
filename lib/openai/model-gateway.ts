import type { z } from "zod";

export interface StructuredGenerationRequest<T> {
  schema: z.ZodType<T>;
  schemaName: string;
  instructions: string;
  input: string;
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export interface ModelGateway {
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<T>;
}

export class InvalidStructuredModelOutputError extends Error {
  constructor() {
    super("The model did not return valid structured output.");
    this.name = "InvalidStructuredModelOutputError";
  }
}
