import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { mintSpeechAuthorization } from "@/lib/audio/speech-ticket";
import { createCaseBriefFeedback } from "@/lib/openai/case-brief-feedback-service";
import { createCharacterTurn } from "@/lib/openai/character-turn-service";
import { createServerInputSafetyGateway } from "@/lib/openai/create-server-input-safety";
import { createServerModelGateway } from "@/lib/openai/create-server-gateway";
import type { InputSafetyGateway } from "@/lib/openai/input-safety-gateway";
import { loadVarennesModelPolicy } from "@/lib/openai/load-model-policy";
import type { ModelGateway } from "@/lib/openai/model-gateway";
import {
  aiRequestRateLimiter,
  type RequestRateLimiter,
} from "@/lib/openai/request-rate-limit";
import {
  AI_CONTRACT_VERSION,
  caseBriefFeedbackRequestSchema,
  characterTurnRequestSchema,
  characterTurnResponseSchema,
} from "@/schemas/ai-contracts";
import { MEDIA_CONTRACT_VERSION } from "@/schemas/media-contracts";

interface HandlerDependencies {
  gateway?: ModelGateway | null;
  inputSafety?: InputSafetyGateway | null;
  rateLimiter?: RequestRateLimiter | null;
  speechAuthorizationSecret?: string | null;
  nowEpochSeconds?: () => number;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function hasVersionMismatch(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const record = body as Record<string, unknown>;
  const casePackage = loadVarennesCase();
  const policy = loadVarennesModelPolicy();
  const expected = {
    contractVersion: AI_CONTRACT_VERSION,
    caseId: casePackage.caseId,
    caseSchemaVersion: casePackage.schemaVersion,
    caseVersion: casePackage.caseVersion,
    policyVersion: policy.policyVersion,
    stateVersion: "1.2.0",
  } as const;
  return Object.entries(expected).some(
    ([key, value]) => record[key] !== undefined && record[key] !== value,
  );
}

function invalidRequest() {
  return json(
    { error: { code: "invalid_request", message: "The AI request did not match the contract." } },
    400,
  );
}

function versionMismatch() {
  return json(
    {
      error: {
        code: "version_mismatch",
        message: "The case changed before this request could be processed.",
      },
    },
    409,
  );
}

function rateLimited() {
  return Response.json(
    {
      error: {
        code: "rate_limited",
        message: "Too many AI requests. Wait a moment and try again.",
      },
    },
    {
      status: 429,
      headers: { "cache-control": "no-store", "retry-after": "60" },
    },
  );
}

function clientKey(request: Request, endpoint: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${endpoint}:${forwarded || "unknown-client"}`;
}

export async function handleCharacterTurnRequest(
  request: Request,
  dependencies: HandlerDependencies = {},
): Promise<Response> {
  const gateway =
    dependencies.gateway === undefined ? createServerModelGateway() : dependencies.gateway;
  const inputSafety =
    dependencies.inputSafety === undefined
      ? createServerInputSafetyGateway()
      : dependencies.inputSafety;
  const rateLimiter =
    dependencies.rateLimiter === undefined ? aiRequestRateLimiter : dependencies.rateLimiter;
  const speechAuthorizationSecret =
    dependencies.speechAuthorizationSecret === undefined
      ? process.env.SPEECH_AUTHORIZATION_SECRET
      : dependencies.speechAuthorizationSecret;
  const nowEpochSeconds =
    dependencies.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1_000));
  const body = await readBody(request);
  if (hasVersionMismatch(body)) return versionMismatch();
  const parsed = characterTurnRequestSchema.safeParse(body);
  if (!parsed.success) return invalidRequest();
  if (gateway && rateLimiter && !rateLimiter.allow(clientKey(request, "character-turn"))) {
    return rateLimited();
  }

  try {
    const result = await createCharacterTurn(parsed.data, {
      gateway,
      inputSafety,
      signal: request.signal,
    });
    const speechAuthorization = mintSpeechAuthorization(
      {
        caption: result.turn.spokenResponse,
        correlation: {
          mediaVersion: MEDIA_CONTRACT_VERSION,
          caseId: parsed.data.caseId,
          stationId: parsed.data.stationId,
          requestId: parsed.data.requestId,
          stateRevision: parsed.data.stateRevision,
        },
      },
      speechAuthorizationSecret,
      nowEpochSeconds(),
    );
    return json(characterTurnResponseSchema.parse({ ...result, speechAuthorization }));
  } catch {
    return invalidRequest();
  }
}

export async function handleCaseBriefFeedbackRequest(
  request: Request,
  dependencies: HandlerDependencies = {},
): Promise<Response> {
  const gateway =
    dependencies.gateway === undefined ? createServerModelGateway() : dependencies.gateway;
  const inputSafety =
    dependencies.inputSafety === undefined
      ? createServerInputSafetyGateway()
      : dependencies.inputSafety;
  const rateLimiter =
    dependencies.rateLimiter === undefined ? aiRequestRateLimiter : dependencies.rateLimiter;
  const body = await readBody(request);
  if (hasVersionMismatch(body)) return versionMismatch();
  const parsed = caseBriefFeedbackRequestSchema.safeParse(body);
  if (!parsed.success) return invalidRequest();
  if (gateway && rateLimiter && !rateLimiter.allow(clientKey(request, "case-brief-feedback"))) {
    return rateLimited();
  }

  try {
    return json(
      await createCaseBriefFeedback(parsed.data, {
        gateway,
        inputSafety,
        signal: request.signal,
      }),
    );
  } catch {
    return invalidRequest();
  }
}
