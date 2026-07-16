import {
  AI_CONTRACT_VERSION,
  MODEL_POLICY_VERSION,
} from "@/schemas/ai-contracts";
import type { CasePackage } from "@/schemas/case-package";
import type { CaseState } from "@/schemas/case-state";

export function buildAIRequestMetadata(
  casePackage: CasePackage,
  state: CaseState,
  promptVersion: string,
  createRequestId: () => string = () => crypto.randomUUID(),
) {
  return {
    contractVersion: AI_CONTRACT_VERSION,
    caseId: casePackage.caseId,
    caseSchemaVersion: casePackage.schemaVersion,
    caseVersion: casePackage.caseVersion,
    policyVersion: MODEL_POLICY_VERSION,
    stateVersion: state.stateVersion,
    promptVersion,
    requestId: createRequestId(),
    stateRevision: state.revision,
  };
}
