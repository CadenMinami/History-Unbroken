import { handleCharacterTurnRequest } from "@/lib/openai/route-handlers";

export async function POST(request: Request): Promise<Response> {
  return handleCharacterTurnRequest(request);
}
