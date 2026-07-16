import caseMetadata from "@/data/cases/varennes/case.json";
import causalGraph from "@/data/cases/varennes/causal-graph.json";
import evidence from "@/data/cases/varennes/evidence.json";
import facts from "@/data/cases/varennes/facts.json";
import repairGates from "@/data/cases/varennes/repair-gates.json";
import sources from "@/data/cases/varennes/sources.json";
import { type CasePackage, casePackageSchema } from "@/schemas/case-package";

export function loadVarennesCase(): CasePackage {
  return casePackageSchema.parse({
    schemaVersion: caseMetadata.schemaVersion,
    caseVersion: caseMetadata.caseVersion,
    caseId: caseMetadata.caseId,
    title: caseMetadata.title,
    facts,
    sources,
    evidence: evidence.evidence,
    anomalies: caseMetadata.anomalies,
    branchObservations: evidence.branchObservations,
    conditions: causalGraph.conditions,
    causalNodes: causalGraph.causalNodes,
    causalEdges: causalGraph.causalEdges,
    uncertainties: caseMetadata.uncertainties,
    comparisonFindings: caseMetadata.comparisonFindings,
    solution: causalGraph.solution,
    repairGates,
  });
}
