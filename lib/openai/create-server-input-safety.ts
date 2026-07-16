import type { InputSafetyGateway } from "@/lib/openai/input-safety-gateway";
import { OpenAIInputSafetyGateway } from "@/lib/openai/openai-input-safety-gateway";

export function createServerInputSafetyGateway(): InputSafetyGateway | null {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;
  return new OpenAIInputSafetyGateway();
}
