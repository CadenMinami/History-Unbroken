import type { ModelGateway } from "@/lib/openai/model-gateway";
import { OpenAIModelGateway } from "@/lib/openai/openai-model-gateway";

export function createServerModelGateway(): ModelGateway | null {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;
  return new OpenAIModelGateway({
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6",
    timeoutMs: 10_000,
  });
}
