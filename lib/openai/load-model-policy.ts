import rawModelPolicy from "@/data/cases/varennes/model-policy.json";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import {
  modelPolicySchema,
  type GeneratedStationPolicy,
  type ModelPolicy,
} from "@/schemas/model-policy";

let cachedPolicy: ModelPolicy | null = null;

export function loadVarennesModelPolicy(): ModelPolicy {
  if (cachedPolicy) return cachedPolicy;
  const policy = modelPolicySchema.parse(rawModelPolicy);
  const casePackage = loadVarennesCase();
  if (policy.caseId !== casePackage.caseId || policy.caseVersion !== casePackage.caseVersion) {
    throw new Error("The model policy does not match the loaded case version.");
  }
  cachedPolicy = policy;
  return policy;
}

export function getGeneratedStationPolicy(stationId: string): GeneratedStationPolicy {
  const station = loadVarennesModelPolicy().stationPolicies.find(
    (candidate) => candidate.stationId === stationId,
  );
  if (!station || station.mode !== "generated_dialogue") {
    throw new Error(`Station ${stationId} is not authorized for generated dialogue.`);
  }
  return station;
}
