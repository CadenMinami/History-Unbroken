import { z } from "zod";

import { sourceTypeSchema } from "./source-type";
import { allowedProvenanceByClassification } from "./student-provenance";
import { verificationStatusSchema } from "./verification-status";

const idSchema = z.string().min(1);
const historicalEvidenceSourceTypeSchema = z.enum(["primary", "secondary", "reconstruction"]);
const historicalEvidenceClassificationSchema = z.enum([
  "verified_record",
  "source_claim",
  "reconstruction",
]);
const historicalEvidenceProvenanceSchema = z.enum([
  "verified_historical_record",
  "historical_reconstruction",
]);

const factSchema = z
  .object({
    id: idSchema,
    claim: z.string().min(1),
    verificationStatus: verificationStatusSchema,
    sourceIds: z.array(idSchema).min(1),
  })
  .strict();

const sourceSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1),
    sourceType: sourceTypeSchema,
    verificationStatus: verificationStatusSchema,
    lineageId: idSchema,
    historicalLineageEligible: z.boolean(),
    ledgerEntryId: z.string().regex(/^S\d+$/),
    citation: z.string().min(1),
    citationUrl: z.string().url(),
    limitations: z.string().min(1),
  })
  .strict();

const evidenceSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1),
    shortTitle: z.string().min(1),
    kind: z.literal("historical_evidence"),
    sourceType: historicalEvidenceSourceTypeSchema,
    verificationStatus: z.literal("verified"),
    epistemicClassification: historicalEvidenceClassificationSchema,
    provenance: historicalEvidenceProvenanceSchema,
    sourceIds: z.array(idSchema).min(1),
    dependencyLineageIds: z.array(idSchema).min(1),
    sourceLineageIds: z.array(idSchema).min(1),
    factIds: z.array(idSchema).min(1),
    studentExcerpt: z.string().min(1),
    description: z.string().min(1),
    countsAsHistoricalEvidence: z.literal(true),
  })
  .strict()
  .superRefine((value, context) => {
    const allowed = allowedProvenanceByClassification[value.epistemicClassification];
    if (!allowed.includes(value.provenance as never)) {
      context.addIssue({
        code: "custom",
        path: ["provenance"],
        message: "Provenance does not match the epistemic classification.",
      });
    }
    const metadataMismatch =
      value.sourceType === "reconstruction"
        ? value.epistemicClassification !== "reconstruction" ||
          value.provenance !== "historical_reconstruction"
        : value.epistemicClassification === "reconstruction" ||
          value.provenance !== "verified_historical_record";
    if (metadataMismatch) {
      context.addIssue({
        code: "custom",
        path: ["sourceType"],
        message: "Historical evidence source type, classification, and provenance are incompatible.",
      });
    }
  });

const anomalySchema = z
  .object({
    id: z.enum(["E6A", "E6B", "E6C"]),
    title: z.string().min(1),
    summary: z.string().min(1),
    provenance: z.literal("fictional_temporal_anomaly"),
    presentationWeight: z.literal(1),
  })
  .strict();

const branchObservationSchema = z
  .object({
    id: z.enum(["FO1", "FO2", "FO3"]),
    title: z.string().min(1),
    content: z.string().min(1),
    provenance: z.literal("fictional_branch_observation"),
    countsAsHistoricalEvidence: z.literal(false),
  })
  .strict();

const conditionSchema = z
  .object({
    id: idSchema,
    category: z.enum(["background", "journey", "geographic", "civic"]),
    label: z.string().min(1),
    factIds: z.array(idSchema).min(1),
  })
  .strict();

const causalNodeSchema = z
  .object({
    id: idSchema,
    category: z.enum(["condition", "trigger", "mechanism", "consequence"]),
    label: z.string().min(1),
    factIds: z.array(idSchema).min(1),
  })
  .strict();

const causalEdgeSchema = z
  .object({
    id: idSchema,
    fromNodeId: idSchema,
    toNodeId: idSchema,
    verb: z.enum([
      "enabled",
      "constrained",
      "triggered",
      "made_more_likely",
      "intensified",
      "undermined",
      "contributed_to",
    ]),
    factIds: z.array(idSchema).min(1),
  })
  .strict();

const uncertaintySchema = z
  .object({
    id: idSchema,
    label: z.string().min(1),
    authority: z.literal("claim_limit"),
    factIds: z.array(idSchema).min(1),
  })
  .strict();

const comparisonFindingSchema = z
  .object({
    id: idSchema,
    label: z.string().min(1),
    requiredItemIds: z.array(idSchema).min(2),
    conclusion: z.string().min(1),
    result: z
      .object({
        action: z.enum(["reject_anomaly", "support_active_anomaly"]),
        anomalyId: z.enum(["E6A", "E6B", "E6C"]),
      })
      .strict(),
  })
  .strict();

const repairGateSchema = z
  .object({
    id: idSchema,
    label: z.string().min(1),
    authority: z.literal("traceability_only"),
    requiredFactIds: z.array(idSchema),
    requiredEvidenceIds: z.array(idSchema),
  })
  .strict();

const solutionSchema = z
  .object({
    activeAnomalyId: z.enum(["E6A", "E6B", "E6C"]),
    rejectedAnomalyIds: z.array(z.enum(["E6A", "E6B", "E6C"])).length(2),
    requiredCausalNodeIds: z.array(idSchema).min(1),
    requiredCausalEdgeIds: z.array(idSchema).min(1),
    requiredComparisonIds: z.array(idSchema).min(1),
    requiredEvidenceGroups: z
      .array(z.object({ allOf: z.array(idSchema).min(1) }).strict())
      .min(1),
    minimumHistoricalLineages: z.number().int().min(1),
    minimumConditions: z.number().int().min(2),
    requiredConditionCategories: z.array(
      z.enum(["background", "journey", "geographic", "civic"]),
    ),
    requireOneConditionFrom: z
      .array(z.enum(["background", "journey", "geographic", "civic"]))
      .min(1),
    limitedConsequenceIds: z.array(idSchema).min(1),
    uncertaintyIds: z.array(idSchema).min(1),
  })
  .strict();

export const casePackageSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    caseVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    caseId: idSchema,
    title: z.string().min(1),
    facts: z.array(factSchema).min(1),
    sources: z.array(sourceSchema).min(1),
    evidence: z.array(evidenceSchema).min(1),
    anomalies: z.array(anomalySchema).length(3),
    branchObservations: z.array(branchObservationSchema).length(3),
    conditions: z.array(conditionSchema).min(2),
    causalNodes: z.array(causalNodeSchema).min(1),
    causalEdges: z.array(causalEdgeSchema).min(1),
    uncertainties: z.array(uncertaintySchema).min(1),
    comparisonFindings: z.array(comparisonFindingSchema).min(1),
    solution: solutionSchema,
    repairGates: z.array(repairGateSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const sourceById = new Map(value.sources.map((source) => [source.id, source]));
    const factById = new Map(value.facts.map((fact) => [fact.id, fact]));
    const evidenceIds = new Set(value.evidence.map((evidence) => evidence.id));
    const causalNodeIds = new Set(value.causalNodes.map((node) => node.id));
    const causalEdgeIds = new Set(value.causalEdges.map((edge) => edge.id));
    const uncertaintyIds = new Set(value.uncertainties.map((item) => item.id));
    const comparisonIds = new Set(value.comparisonFindings.map((item) => item.id));
    const comparableItemIds = new Set([
      ...value.evidence.map((item) => item.id),
      ...value.anomalies.map((item) => item.id),
      ...value.branchObservations.map((item) => item.id),
    ]);

    const registries = [
      ["facts", value.facts.map((item) => item.id)],
      ["sources", value.sources.map((item) => item.id)],
      ["evidence", value.evidence.map((item) => item.id)],
      ["anomalies", value.anomalies.map((item) => item.id)],
      ["branchObservations", value.branchObservations.map((item) => item.id)],
      ["conditions", value.conditions.map((item) => item.id)],
      ["causalNodes", value.causalNodes.map((item) => item.id)],
      ["causalEdges", value.causalEdges.map((item) => item.id)],
      ["uncertainties", value.uncertainties.map((item) => item.id)],
      ["comparisonFindings", value.comparisonFindings.map((item) => item.id)],
      ["repairGates", value.repairGates.map((item) => item.id)],
    ] as const;
    for (const [path, ids] of registries) {
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: `Duplicate IDs are not allowed in ${path}.`,
        });
      }
    }

    const comparableIds = [
      ...value.evidence.map((item) => item.id),
      ...value.anomalies.map((item) => item.id),
      ...value.branchObservations.map((item) => item.id),
    ];
    if (new Set(comparableIds).size !== comparableIds.length) {
      context.addIssue({
        code: "custom",
        path: ["comparisonFindings"],
        message: "Evidence, anomaly, and branch-observation IDs must not collide.",
      });
    }

    for (const [index, fact] of value.facts.entries()) {
      for (const sourceId of fact.sourceIds) {
        const source = sourceById.get(sourceId);
        if (!source) {
          context.addIssue({
            code: "custom",
            path: ["facts", index, "sourceIds"],
            message: `Unknown source ID: ${sourceId}`,
          });
        } else if (fact.verificationStatus === "verified" && source.verificationStatus !== "verified") {
          context.addIssue({
            code: "custom",
            path: ["facts", index, "sourceIds"],
            message: `Verified fact uses an unresolved source: ${sourceId}`,
          });
        } else if (["fiction", "dramatization", "class_packet"].includes(source.sourceType)) {
          context.addIssue({
            code: "custom",
            path: ["facts", index, "sourceIds"],
            message: `Historical fact uses an ineligible source type: ${sourceId}`,
          });
        }
      }
    }

    for (const [index, evidence] of value.evidence.entries()) {
      const dependencyLineages = new Set<string>();
      const eligibleLineages = new Set<string>();
      const referencedSourceIds = new Set(evidence.sourceIds);
      for (const sourceId of evidence.sourceIds) {
        const source = sourceById.get(sourceId);
        if (!source) {
          context.addIssue({
            code: "custom",
            path: ["evidence", index, "sourceIds"],
            message: `Unknown source ID: ${sourceId}`,
          });
        } else {
          dependencyLineages.add(source.lineageId);
          if (source.verificationStatus !== "verified") {
            context.addIssue({
              code: "custom",
              path: ["evidence", index, "sourceIds"],
              message: `Historical evidence uses an unresolved source: ${sourceId}`,
            });
          }
          if (["fiction", "dramatization", "class_packet"].includes(source.sourceType)) {
            context.addIssue({
              code: "custom",
              path: ["evidence", index, "sourceIds"],
              message: `Historical evidence uses an ineligible source type: ${sourceId}`,
            });
          }
          if (source.historicalLineageEligible) eligibleLineages.add(source.lineageId);
        }
      }
      const declaredDependencies = new Set(evidence.dependencyLineageIds);
      if (
        declaredDependencies.size !== evidence.dependencyLineageIds.length ||
        declaredDependencies.size !== dependencyLineages.size ||
        [...dependencyLineages].some((lineageId) => !declaredDependencies.has(lineageId))
      ) {
        context.addIssue({
          code: "custom",
          path: ["evidence", index, "dependencyLineageIds"],
          message: "Evidence must declare every dependency lineage supplied by its sources.",
        });
      }
      const declaredLineages = new Set(evidence.sourceLineageIds);
      if (
        declaredLineages.size !== evidence.sourceLineageIds.length ||
        declaredLineages.size !== eligibleLineages.size ||
        [...eligibleLineages].some((lineageId) => !declaredLineages.has(lineageId))
      ) {
        context.addIssue({
          code: "custom",
          path: ["evidence", index, "sourceLineageIds"],
          message: "Evidence must declare each and only each eligible independent source lineage.",
        });
      }
      for (const factId of evidence.factIds) {
        const fact = factById.get(factId);
        if (!fact) {
          context.addIssue({
            code: "custom",
            path: ["evidence", index, "factIds"],
            message: `Unknown fact ID: ${factId}`,
          });
        } else if (fact.verificationStatus !== "verified") {
          context.addIssue({
            code: "custom",
            path: ["evidence", index, "factIds"],
            message: `Verified evidence uses an unresolved fact: ${factId}`,
          });
        } else if (fact.sourceIds.some((sourceId) => !referencedSourceIds.has(sourceId))) {
          context.addIssue({
            code: "custom",
            path: ["evidence", index, "factIds"],
            message: `Evidence does not reference every source supporting fact: ${factId}`,
          });
        }
      }
    }

    for (const [index, condition] of value.conditions.entries()) {
      for (const factId of condition.factIds) {
        const fact = factById.get(factId);
        if (!fact) {
          context.addIssue({
            code: "custom",
            path: ["conditions", index, "factIds"],
            message: `Unknown fact ID: ${factId}`,
          });
        } else if (fact.verificationStatus !== "verified") {
          context.addIssue({
            code: "custom",
            path: ["conditions", index, "factIds"],
            message: `Condition uses an unresolved fact: ${factId}`,
          });
        }
      }
    }

    for (const [index, gate] of value.repairGates.entries()) {
      if (gate.requiredFactIds.length === 0 && gate.requiredEvidenceIds.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["repairGates", index],
          message: "A traceability gate must reference at least one fact or evidence item.",
        });
      }
      for (const factId of gate.requiredFactIds) {
        const fact = factById.get(factId);
        if (!fact) {
          context.addIssue({
            code: "custom",
            path: ["repairGates", index, "requiredFactIds"],
            message: `Unknown fact ID: ${factId}`,
          });
        } else if (fact.verificationStatus !== "verified") {
          context.addIssue({
            code: "custom",
            path: ["repairGates", index, "requiredFactIds"],
            message: `Repair gate uses unverified fact: ${factId}`,
          });
        }
      }
      for (const evidenceId of gate.requiredEvidenceIds) {
        if (!evidenceIds.has(evidenceId)) {
          context.addIssue({
            code: "custom",
            path: ["repairGates", index, "requiredEvidenceIds"],
            message: `Unknown evidence ID: ${evidenceId}`,
          });
        }
      }
    }

    for (const nodeId of value.solution.requiredCausalNodeIds) {
      if (!causalNodeIds.has(nodeId)) {
        context.addIssue({
          code: "custom",
          path: ["solution", "requiredCausalNodeIds"],
          message: `Unknown causal node ID: ${nodeId}`,
        });
      }
    }

    for (const [index, node] of value.causalNodes.entries()) {
      for (const factId of node.factIds) {
        const fact = factById.get(factId);
        if (!fact) {
          context.addIssue({
            code: "custom",
            path: ["causalNodes", index, "factIds"],
            message: `Unknown fact ID: ${factId}`,
          });
        } else if (fact.verificationStatus !== "verified") {
          context.addIssue({
            code: "custom",
            path: ["causalNodes", index, "factIds"],
            message: `Causal node uses an unresolved fact: ${factId}`,
          });
        }
      }
    }

    for (const [index, edge] of value.causalEdges.entries()) {
      if (!causalNodeIds.has(edge.fromNodeId) || !causalNodeIds.has(edge.toNodeId)) {
        context.addIssue({
          code: "custom",
          path: ["causalEdges", index],
          message: `Causal edge uses an unknown node: ${edge.id}`,
        });
      }
      for (const factId of edge.factIds) {
        const fact = factById.get(factId);
        if (!fact) {
          context.addIssue({
            code: "custom",
            path: ["causalEdges", index, "factIds"],
            message: `Unknown fact ID: ${factId}`,
          });
        } else if (fact.verificationStatus !== "verified") {
          context.addIssue({
            code: "custom",
            path: ["causalEdges", index, "factIds"],
            message: `Causal edge uses an unresolved fact: ${factId}`,
          });
        }
      }
    }

    for (const edgeId of value.solution.requiredCausalEdgeIds) {
      if (!causalEdgeIds.has(edgeId)) {
        context.addIssue({
          code: "custom",
          path: ["solution", "requiredCausalEdgeIds"],
          message: `Unknown causal edge ID: ${edgeId}`,
        });
      }
    }

    for (const group of value.solution.requiredEvidenceGroups) {
      for (const evidenceId of group.allOf) {
        if (!evidenceIds.has(evidenceId)) {
          context.addIssue({
            code: "custom",
            path: ["solution", "requiredEvidenceGroups"],
            message: `Unknown evidence ID: ${evidenceId}`,
          });
        }
      }
    }

    for (const consequenceId of value.solution.limitedConsequenceIds) {
      const node = value.causalNodes.find((item) => item.id === consequenceId);
      if (!node || node.category !== "consequence") {
        context.addIssue({
          code: "custom",
          path: ["solution", "limitedConsequenceIds"],
          message: `Unknown consequence node ID: ${consequenceId}`,
        });
      }
    }

    for (const uncertaintyId of value.solution.uncertaintyIds) {
      if (!uncertaintyIds.has(uncertaintyId)) {
        context.addIssue({
          code: "custom",
          path: ["solution", "uncertaintyIds"],
          message: `Unknown uncertainty ID: ${uncertaintyId}`,
        });
      }
    }

    for (const [index, uncertainty] of value.uncertainties.entries()) {
      for (const factId of uncertainty.factIds) {
        const fact = factById.get(factId);
        if (!fact) {
          context.addIssue({
            code: "custom",
            path: ["uncertainties", index, "factIds"],
            message: `Unknown fact ID: ${factId}`,
          });
        } else if (fact.verificationStatus !== "verified") {
          context.addIssue({
            code: "custom",
            path: ["uncertainties", index, "factIds"],
            message: `Claim limit uses an unresolved fact: ${factId}`,
          });
        }
      }
    }

    for (const [index, finding] of value.comparisonFindings.entries()) {
      if (new Set(finding.requiredItemIds).size !== finding.requiredItemIds.length) {
        context.addIssue({
          code: "custom",
          path: ["comparisonFindings", index, "requiredItemIds"],
          message: "Comparison items must be unique.",
        });
      }
      for (const itemId of finding.requiredItemIds) {
        if (!comparableItemIds.has(itemId)) {
          context.addIssue({
            code: "custom",
            path: ["comparisonFindings", index, "requiredItemIds"],
            message: `Unknown comparison item ID: ${itemId}`,
          });
        }
      }
      if (
        !finding.requiredItemIds.some((itemId) =>
          value.branchObservations.some((item) => item.id === itemId),
        ) ||
        !finding.requiredItemIds.some((itemId) =>
          value.evidence.some((item) => item.id === itemId),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["comparisonFindings", index, "requiredItemIds"],
          message: "An anomaly decision requires both branch-state and historical evidence.",
        });
      }
      if (!finding.requiredItemIds.includes(finding.result.anomalyId)) {
        context.addIssue({
          code: "custom",
          path: ["comparisonFindings", index, "result"],
          message: "A comparison result must target an anomaly included in the comparison.",
        });
      }
      if (
        (finding.result.action === "support_active_anomaly" &&
          finding.result.anomalyId !== value.solution.activeAnomalyId) ||
        (finding.result.action === "reject_anomaly" &&
          !value.solution.rejectedAnomalyIds.includes(finding.result.anomalyId))
      ) {
        context.addIssue({
          code: "custom",
          path: ["comparisonFindings", index, "result"],
          message: "A comparison result contradicts the authored solution.",
        });
      }
    }

    for (const comparisonId of value.solution.requiredComparisonIds) {
      if (!comparisonIds.has(comparisonId)) {
        context.addIssue({
          code: "custom",
          path: ["solution", "requiredComparisonIds"],
          message: `Unknown comparison ID: ${comparisonId}`,
        });
      }
    }
    const requiredFindings = value.comparisonFindings.filter((finding) =>
      value.solution.requiredComparisonIds.includes(finding.id),
    );
    if (
      !requiredFindings.some(
        (finding) =>
          finding.result.action === "support_active_anomaly" &&
          finding.result.anomalyId === value.solution.activeAnomalyId,
      ) ||
      value.solution.rejectedAnomalyIds.some(
        (anomalyId) =>
          !requiredFindings.some(
            (finding) =>
              finding.result.action === "reject_anomaly" &&
              finding.result.anomalyId === anomalyId,
          ),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["solution", "requiredComparisonIds"],
        message: "Required comparisons must authorize the active anomaly and every rejection.",
      });
    }

    const rejectedAnomalies = new Set(value.solution.rejectedAnomalyIds);
    if (
      rejectedAnomalies.size !== value.solution.rejectedAnomalyIds.length ||
      rejectedAnomalies.has(value.solution.activeAnomalyId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["solution", "rejectedAnomalyIds"],
        message: "Rejected anomalies must be unique and cannot include the active anomaly.",
      });
    }

    const uniqueRequirementLists = [
      ["requiredCausalNodeIds", value.solution.requiredCausalNodeIds],
      ["requiredCausalEdgeIds", value.solution.requiredCausalEdgeIds],
      ["requiredComparisonIds", value.solution.requiredComparisonIds],
      ["requiredConditionCategories", value.solution.requiredConditionCategories],
      ["requireOneConditionFrom", value.solution.requireOneConditionFrom],
      ["limitedConsequenceIds", value.solution.limitedConsequenceIds],
      ["uncertaintyIds", value.solution.uncertaintyIds],
    ] as const;
    for (const [path, items] of uniqueRequirementLists) {
      if (new Set(items).size !== items.length) {
        context.addIssue({
          code: "custom",
          path: ["solution", path],
          message: `Duplicate solution requirements are not allowed in ${path}.`,
        });
      }
    }

    const availableCategories = new Set(value.conditions.map((condition) => condition.category));
    if (value.solution.minimumConditions > value.conditions.length) {
      context.addIssue({
        code: "custom",
        path: ["solution", "minimumConditions"],
        message: "The minimum condition count exceeds the available conditions.",
      });
    }
    if (
      value.solution.requiredConditionCategories.some(
        (category) => !availableCategories.has(category),
      ) ||
      !value.solution.requireOneConditionFrom.some((category) => availableCategories.has(category))
    ) {
      context.addIssue({
        code: "custom",
        path: ["solution", "requiredConditionCategories"],
        message: "The solution requires a condition category that the case cannot supply.",
      });
    }

    const availableHistoricalLineages = new Set(
      value.evidence.flatMap((item) => item.sourceLineageIds),
    );
    if (value.solution.minimumHistoricalLineages > availableHistoricalLineages.size) {
      context.addIssue({
        code: "custom",
        path: ["solution", "minimumHistoricalLineages"],
        message: "The minimum historical-lineage count exceeds the available lineages.",
      });
    }

    const weights = new Set(value.anomalies.map((anomaly) => anomaly.presentationWeight));
    if (weights.size !== 1) {
      context.addIssue({
        code: "custom",
        path: ["anomalies"],
        message: "All anomaly candidates must have equal presentation weight.",
      });
    }
  });

export type CasePackage = z.infer<typeof casePackageSchema>;
