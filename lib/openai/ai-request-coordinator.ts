import type { AI_CONTRACT_VERSION } from "@/schemas/ai-contracts";

export interface AIRequestMetadata {
  contractVersion: typeof AI_CONTRACT_VERSION;
  caseId: string;
  caseSchemaVersion: string;
  caseVersion: string;
  policyVersion: string;
  stateVersion: string;
  promptVersion: string;
  requestId: string;
  stateRevision: number;
}

function metadataMatches(left: AIRequestMetadata, right: AIRequestMetadata): boolean {
  return (
    left.contractVersion === right.contractVersion &&
    left.caseId === right.caseId &&
    left.caseSchemaVersion === right.caseSchemaVersion &&
    left.caseVersion === right.caseVersion &&
    left.policyVersion === right.policyVersion &&
    left.stateVersion === right.stateVersion &&
    left.promptVersion === right.promptVersion &&
    left.requestId === right.requestId &&
    left.stateRevision === right.stateRevision
  );
}

export class AIRequestCoordinator {
  private active: { metadata: AIRequestMetadata; controller: AbortController } | null = null;

  begin(metadata: AIRequestMetadata): { signal: AbortSignal } {
    this.active?.controller.abort();
    const controller = new AbortController();
    this.active = { metadata, controller };
    return { signal: controller.signal };
  }

  isCurrent(metadata: AIRequestMetadata): boolean {
    return Boolean(
      this.active &&
        !this.active.controller.signal.aborted &&
        metadataMatches(this.active.metadata, metadata),
    );
  }

  invalidate(): void {
    this.active?.controller.abort();
    this.active = null;
  }
}
