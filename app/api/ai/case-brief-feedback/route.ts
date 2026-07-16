import { handleCaseBriefFeedbackRequest } from "@/lib/openai/route-handlers";

export async function POST(request: Request): Promise<Response> {
  return handleCaseBriefFeedbackRequest(request);
}
