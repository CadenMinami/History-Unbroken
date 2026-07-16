# Implementation Roadmap

## Current Rule

Phases 0-2 are complete for the current vertical slice. The Phase 3 GPT-5.6 source-bounded layer is implemented and contract-tested; only a live API-key smoke test remains before provider-level verification can be claimed. Phase 4 teacher alignment is the next product build.

## Phase 0: Historical Verification And Wireframes

Status: complete and approved for the current case package. Barnave remains excluded from the runtime model policy.

Goal: lock the case canon before implementation.

Tasks:

- read all planning documents
- identify contradictions and ambiguous requirements
- verify historical claims marked `REQUIRES VERIFICATION`
- resolve Sauce role
- resolve Barnave role
- verify route chronology
- verify bridge geography
- verify travel timing
- verify escort details
- choose source excerpts
- update source ledger
- produce text wireframes
- define deterministic state transitions
- review AI contracts
- update build log

Exit condition:

- no unresolved ambiguity about solution, provenance, model authority, or answerability
- user approves implementation

## Phase 1: Deterministic Vertical Slice

Status: complete in the local application and full browser path.

Goal: working crude end-to-end case without model calls.

Build:

- app shell
- case data format
- case-state reducer
- context primer
- fracture opening
- one static character/testimony station
- two evidence items
- comparison action
- simple caseboard
- basic hypothesis hard gate
- repair animation placeholder
- debrief
- fallback mode

Exit condition achieved locally: the case completes from primer through debrief without model calls. Public deployment remains Phase 5 work.

## Phase 2: Full Deterministic Case

Status: complete for the submission path. Packet-aware reporting remains Phase 4 work.

Goal: entire mystery works without AI.

Build:

- all evidence items
- evidence inspector
- comparison lab
- route map
- caseboard
- character locations with static fallback
- notebook
- glossary
- hard-gate hypothesis logic
- full repair sequence
- reconstructed timeline
- student debrief
- teacher report shell
- local persistence
- provenance/source drawer

Exit condition:

- full case is completable without model calls

## Phase 3: GPT-5.6 Integration

Status: implemented, historical-integrity reviewed, and covered by unit, integration, policy-eval, and no-key browser paths. Live-key provider verification remains open.

Goal: make AI meaningfully necessary but bounded.

Implemented:

- strict character-turn endpoint for Drouet and Louis only
- static Varennes civic and Assembly reaction dossiers
- station allowlists, explicit unknowns, and E1-only Louis boundary
- ID-only plans with server-rendered authored character prose
- evidence-aware reactions with presented-evidence prerequisites
- Socratic follow-up and refusal unit selection
- formative Case Brief feedback using exact student spans and authored templates
- provenance, dependency-lineage, and independent-lineage feedback context
- coherence checks for corroboration, evidence fit, and formative status
- tests proving model output cannot change repair eligibility
- `omni-moderation-latest` input checks and authored safety refusals
- schema bounds, rate limiting, abort propagation, one transient retry, and typed failure handling
- validation/no-key/provider fallback and source-bounded model eval corpus

Exit condition:

- GPT-5.6 improves investigation and assessment but cannot alter canon or state directly
- a configured-key smoke test confirms the Responses API and moderation paths

## Phase 4: Teacher Alignment And Accessibility

Status: next. Baseline glossary, responsive, keyboard, and reduced-motion foundations exist, but teacher-packet ingestion and packet-aware reporting do not.

Goal: demonstrate classroom fit.

Build:

- teacher setup screen
- sample course packet
- packet upload or pasted text
- alignment profile
- teacher confirmation
- objective selection
- packet-aware hints
- packet-aware debrief/report
- reduced-reading mode
- reduced-motion mode
- keyboard path
- accessibility labels

Exit condition:

- sample packet visibly changes vocabulary, hints, and reporting without changing solution

## Phase 5: Polish, Testing, Deployment, Demo

Goal: submission-ready package.

Build/test:

- visual polish
- responsive layout
- historical integrity tests
- model eval tests
- e2e tests
- API fallback
- prompt-injection tests
- documentation
- deployment regression
- screenshots
- three-minute video

Exit condition:

- deployed project works
- repo docs are complete
- video under three minutes
- submission is ready before deadline buffer

## Daily Schedule Through July 21

### July 14-15

- materialize planning docs
- complete Phase 0 verification
- approve wireframes
- establish repo/app
- complete the deterministic vertical slice
- implement and review the source-bounded GPT-5.6 layer ahead of the original schedule

### July 16

- run the integrated verification suite
- perform a live-key GPT-5.6 smoke test when credentials are available
- resolve provider-level issues without changing deterministic authority
- begin teacher alignment only after the AI boundary is stable

### July 17

- build the teacher packet pipeline and alignment review
- add packet-aware vocabulary and objective mapping
- preserve sample/no-packet fallback

### July 18

- teacher alignment
- packet pipeline
- accessibility modes
- teacher report

### July 19

- historical review
- prompt injection testing
- polish
- API failure handling
- screenshots

### July 20

- feature freeze
- tests
- documentation
- playtesting
- final demo recording

### July 21

- final regression
- verify deployment
- verify repo setup instructions
- upload YouTube video
- run `/feedback`
- submit by 2:00 PM Pacific if possible

## Testing Checklist

### Unit

- case reducer
- evidence unlocks
- provenance labels
- character knowledge boundaries
- hard gates
- hint ladder
- packet boundaries

### Historical Integrity

- every fact has source ID
- every evidence item has provenance
- every fictional item labeled
- no reconstruction labeled primary
- no character authorized for forbidden fact
- no inevitable downstream causation

### Model Evals

- unauthorized and direct-answer requests
- prompt injection and attempted solution leakage
- evidence reactions without required presented evidence
- Louis private-motive and E1-only boundary
- invented student spans
- strong corroboration from one historical lineage
- contradictory statuses without contradictory evidence
- incoherent `well_supported` feedback
- moderation, retry, cancellation, rate-limit, and no-key fallbacks

### End-To-End

- clean path
- different investigation order
- early wrong answer then revision
- reduced-reading mode
- teacher packet mode
- API failure path
- refresh/resume
- keyboard-only path

## Definition Of Done

Product:

- complete 10-15 minute case
- all evidence implemented
- character/evidence interactions visible
- causal board works
- formative hypothesis feedback works without controlling repair
- repair sequence works
- debrief works and the teacher report is added in Phase 4
- sample packet changes alignment
- accessibility modes work

Historical:

- source ledger complete
- fictional and reconstructed items labeled
- no unsupported character knowledge
- no Varennes-as-single-cause framing
- alternate branch remains uncertain

Technical:

- deployed app runs
- API keys server-side
- model outputs schema-validated
- visible historical model prose is server-rendered from authored units
- evidence prerequisites and source-lineage coherence are post-validated
- input moderation, request bounds, rate limiting, cancellation, and fallbacks work
- full case completable in fallback mode
- core tests pass
- progress survives refresh
- live GPT-5.6 and moderation paths are smoke-tested with a configured key

Submission:

- README complete
- docs complete
- demo under three minutes
- screenshots clear
- repository accessible
- `/feedback` Session ID saved
