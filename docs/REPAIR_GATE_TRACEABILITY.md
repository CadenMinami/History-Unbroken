# Repair Gate Traceability

## Purpose

Every repair gate must trace to approved historical facts, learner-visible evidence, an explicit student command, a state field, a visible control, and a deterministic test. Free-form prose and model output are never gate inputs.

No production Varennes case package may mark `repairEligible=true` while any required row remains `BLOCKS_CANON`.

## Gate Map

| Gate | Authority inputs | Evidence | Student command and state | Visible control | Required test | Status |
|---|---|---|---|---|---|---|
| Reject recognition echo E6A | Game-state: FO1. Historical: F-S2-001 and approved E4 context. | FO1, E3, E4, E6A | `record_comparison`, `reject_anomaly`; `completedComparisonIds`, `rejectedAnomalyIds` | branch/history comparison finding and Case Brief alternative | label/order and generated dialogue cannot reject E6A | `APPROVED` |
| Identify route echo E6B as active | Game-state: FO1-FO3. Historical: F-S2-002 and F-S4-004. | FO1-FO3, E3, E4, E5, E6B | `record_comparison`, `select_active_anomaly`; `completedComparisonIds`, `activeAnomalyId` | branch/history comparison and active-anomaly selector | historical record alone and label/order never select E6B | `APPROVED` |
| Reject authorization echo E6C | Game-state: FO2/FO3. Historical: F-S3-002 and F-S3-005. | FO2, FO3, E5, E6C | `record_comparison`, `reject_anomaly`; `completedComparisonIds`, `rejectedAnomalyIds` | branch/history comparison finding | generated dialogue and optional Valory content cannot satisfy the gate | `APPROVED` |
| Build the operational mechanism | F-S2-002 through F-S2-006; F-S3-002, F-S3-003, F-S3-005; F-S4-004 | E3, E4, E5, E6B | `place_causal_node`, `connect_causal_edge`, `pin_evidence`; `placedCausalNodeIds`, `connectedCausalEdgeIds`, `pinnedEvidenceIds` | causal board | required nodes and authored edges must be present with their package-defined verbs | `APPROVED` |
| Establish Louis's intentional participation | F-S1-002 plus independent S8/S9 travel-preparation facts | E1 and E2 | `pin_evidence`; `pinnedEvidenceIds` | required historical-record tray | E1 alone cannot satisfy the gate; complete motive remains open | `APPROVED` |
| Use three evidentiary lines | eligible L1-L10 historical lineages for E1, E2, E3, E5, and E7; L11-L12 remain non-counting dependencies | selected historical evidence | `pin_evidence`; `pinnedEvidenceIds` | evidence pin tray | five required cards must yield at least three lineages; FO records and non-eligible synthesis lineages never count | `APPROVED` |
| Include two broader conditions | approved S11 context facts and condition whitelist | primer/context artifacts and selected evidence | `select_condition`; `selectedConditionIds` | one background plus one journey/geographic/civic condition | only approved condition IDs count; two variants of one relationship cannot fill both slots | `APPROVED` |
| Identify bounded political reaction and continuity | F-S5-001, F-S5-003, F-S5-004A, and F-S5-005 | E7 | `update_case_brief`; `caseBrief.selectedConsequenceId` | bounded reaction-and-continuity menu | the gate records competing framings and continued monarchy; F-S5-002, F-S5-004, and F-S5-006 remain contextual, while universal collapse, inevitability, and a machine-scored causal inference are absent | `APPROVED` |
| Record claim limits and reject inevitability | F-S1-002, F-S8-001, and F-S9-001 bound what preparation evidence establishes about motive; F-S5-005 prevents an immediate-collapse reading | E1, E2, E7, and explicit `claim_limit` records | `update_case_brief`; `caseBrief.selectedUncertaintyIds` | claim-limit controls and package-authored edge verbs | the controls state what the reviewed record does not establish; free-form prose cannot add causal authority or change eligibility | `APPROVED AS CLAIM LIMIT` |
| Restore the two local-response actions | F-S2-005, F-S2-006, F-S3-003, F-S3-005, with S3 retained as a dependency but excluded from independent-lineage scoring | E3, E5 | `complete_repair_action`; `completedRepairActionIds` | separate passage-control and passport-inspection controls, available in either order | reconstruction data defines action prerequisites; the joint step rejects zero or one action; shortcut authorizes both; persistence rejects unreachable action progress | `APPROVED AS RECONSTRUCTION_ONLY` |
| Restore guarded detention after the joint response | same bounded local-response facts and both authored `contributed_to` detention edges | E3, E5 | `complete_repair_step`; `completedRepairStepIds` | collective-detention reconstruction step with visible authored-reconstruction limit | final step and `complete_repair` reject missing actions; neither incoming edge is rendered as a sole physical arrest or strict but-for cause | `APPROVED AS RECONSTRUCTION_ONLY` |

## Phase 0 Closure

FO1-FO3 and the complete interaction package were approved by the user on 14 July 2026. No required row remains `BLOCKS_CANON`. Production implementation may begin, but tests must still prove that labels and ordering do not reveal E6B and that FO records never count as historical evidence.
