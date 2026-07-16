# Architecture

## Architecture Goal

Build a deterministic historical game system that uses GPT-5.6 for flexible language and reasoning support while preventing the model from controlling historical truth, game state, or assessment gates.

## Recommended Stack

- Next.js
- TypeScript
- Tailwind CSS
- OpenAI API with GPT-5.6
- server-side model calls only
- Zod validation
- structured model outputs
- authored case data in JSON
- local browser persistence
- Vercel deployment
- React Three Fiber and Three.js for the client-only spatial presentation

## System Flow

```text
Browser UI
  -> typed reducer commands -> deterministic client state -> local persistence
  -> reviewed scene manifest -> fail-closed interaction adapter -> existing DOM focus overlays
  -> versioned formative request snapshot -> Next.js API route
  -> schema, version, station, evidence, moderation, and rate-limit checks
  -> source-bounded policy catalog -> OpenAI Responses API
  -> strict ID-only plan -> server authorization and coherence checks
  -> server-rendered authored response -> optional exact-caption speech authorization
  -> strict public response -> advisory UI only
```

The deterministic command path, spatial path, and model path are intentionally separate. The spatial runtime may resolve proximity to a reviewed canonical ID, but only the interaction adapter and existing reducer can authorize effects. Model responses never enter the reducer. They are correlated to contract, case schema, case content, policy, state, prompt, request, and revision versions, then displayed only while that request snapshot remains current.

## Active Compatibility Matrix

| Contract | Version |
|---|---|
| Case schema | `1.0.0` |
| Varennes case content | `1.0.3` |
| Case state | `1.2.0` |
| Persistence envelope | `1.2.0` |
| Reconstruction companion | `1.1.0` |
| Scene manifest | `1.0.0` |
| Spatial session | `1.0.0` |
| Model policy | `1.0.1` |
| AI contract | `1.1.0` |
| Media contract | `1.0.0` |

AI `1.1.0` is the sole active browser/server contract. Character success and fallback responses require nullable speech authorization; Case Brief responses do not. Media `1.0.0` independently versions the future transcription and speech transforms. Provider transcription/speech routes and services are not implemented yet.

### Current world reasoning handoff

- The case reducer must enter `case_brief` before the world may open the caseboard.
- A pure handoff policy permits the overlay only from `exploring`, transitions the world to `focused`, and rejects close attempts after case authority has advanced to repair.
- The overlay renders the existing `CausalCaseboard`; it does not copy causal rules, evidence requirements, hypothesis state, or repair eligibility into the 3D runtime.
- Incomplete investigations route to the existing non-spatial case file. Repair and debrief resume their canonical routes.
- Locomotion remains disabled while the caseboard is focused.

### Current optional browser voice

- Speech starts only from the visible **Hear response** button after a validated character reply is rendered.
- The displayed caption remains authoritative and available when speech is unsupported or fails.
- Closing, replacing, or changing a dialogue cancels active browser speech.
- Browser speech is presentation-only and has no reducer, evidence, scoring, or model authority.
- This local fallback does not replace the planned signed OpenAI speech pipeline, microphone consent flow, or audio-ticket cleanup rules.

### Media Security Contracts

- Transcription and speech are presentation-only transforms with strict schemas that cannot carry historical facts, sources, evidence, scores, reducer commands, or CaseState snapshots.
- Media correlation binds media version, case, generated station, original request UUID, and state revision. The browser rejects stale station, request, or revision data against its active interaction.
- The server is stateless with respect to the browser's globally current revision. Signed speech tickets prevent field tampering, client correlation rejects stale playback, and a 120-second expiry limits replay.
- The character service returns a validated internal result with no ticket or secret dependency. The character route alone attaches nullable authorization after it has the exact authorized caption, then validates the public response.
- Drouet and Louis use app-owned logical voice IDs. Their station mapping is private server policy and is not coupled to provider voice names.
- Speech authorization uses an exact UTF-8 caption SHA-256 and HMAC-SHA256 over byte-length-prefixed fields. Speech request parsing and verification perform no trim or Unicode normalization.
- The optional browser `SpeechSynthesis` fallback remains untouched and does not consume provider audio.
- Task 12 still owns provider routes, bounded streaming/multipart handling, recorder/playback UI, rate limits, provider services, log redaction, and temporary byte cleanup.

## MVP State Authority

The anonymous formative MVP uses a shared pure case reducer in the browser and versioned local persistence. The repository-owned case package defines canonical facts, IDs, evidence relationships, commands, and repair selectors.

The package has two independent versions: `schemaVersion` changes when its structure changes, while `caseVersion` changes whenever canonical content, IDs, evidence, or solution requirements change. Persisted state must match both.

`solution` is the sole runtime repair authority. `repairGates` contains human-readable, source-linked traceability records and is permanently marked `traceability_only`; the reducer and eligibility selector do not treat it as a second win-condition system. Required causal nodes, edges, comparisons, evidence groups, conditions, consequence boundaries, and uncertainty boundaries all come from `solution`.

Each historical evidence record lists:

- every dependency lineage represented by its source set
- the subset explicitly eligible as independent historical corroboration
- only verified facts and verified historical or reconstruction sources

Fiction, dramatization, class packets, and unresolved material are rejected by the package validator before reducer state exists.

This local session is not tamper-resistant. The deterministic debrief and teacher-facing local summary must be labeled as formative artifacts, not secure grade records. Authentication, roster-linked assignments, cross-device state, and authoritative grading would require a server-side event store and are explicit post-MVP work.

The server remains authoritative for OpenAI calls, course-file processing, secret handling, and model-output validation. Model output never dispatches case commands directly.

Spatial preferences use a separate versioned envelope bound to case and scene-manifest versions. Camera mode, last safe spawn, discovered zones, guidance, and graphics tier do not belong in `CaseState` and cannot affect educational eligibility.

The scene manifest is parsed with strict Zod schemas and then cross-validated against the canonical case package, model policy, reconstruction checkpoints, and ambient-line companion. Unknown evidence, fact, source, station, checkpoint, zone, or spawn IDs fail closed. A 3D object is an authored entry point to a canonical record, never a new evidence artifact.

## Core Modules

### Case Engine

Responsibilities:

- load case data
- validate fact IDs
- validate evidence IDs
- track investigation state
- track evidence discovered/presented
- track claims recorded
- manage notebook entries
- enforce hard gates
- determine repair eligibility

### Provenance Registry

Responsibilities:

- source metadata
- evidence labels
- reconstruction labels
- fiction labels
- class-packet labels
- citation drawer

### Spatial Runtime Contracts

Responsibilities:

- four approved zone IDs and globally unique safe spawns
- schematic placement labels and explicit location, ownership, scale, and appearance limits
- canonical interaction targets that resolve only to reviewed evidence, station, surface, or repair-checkpoint IDs
- pure fail-closed interaction authorization with no synthesized fallback target
- separate spatial preference persistence bound to spatial-session, case, and scene-manifest versions
- discarded spatial state after any version mismatch, removed zone, or removed spawn without touching deterministic case progress
- ambient lines that are always dramatization, non-evidentiary, and progression-neutral

The current district renders exactly four player-facing zones: archive antechamber, post-road square, royal lodging and civic area, and bridge approach. Drouet and Louis are the only rendered, proximity-eligible generated stations. The repair checkpoint remains a reserved manifest binding until its implementation gate passes.

Walking discovery resolves only against the four active zone IDs and each zone's authored safe spawn. The latest safe spawn and discovered-zone set are persisted in the spatial envelope. Fast travel is available only after a valid first visit and only where the manifest declares `first_valid_visit`; it remounts the controller at the authored spawn and cannot issue a case reducer command. The same authorization permits returning to the current district's safe point after discovery, which provides navigation recovery without bypassing first-visit travel.

The route journal is a semantic DOM dialog over the world. It displays a schematic, not-to-scale navigation diagram rather than historical geography or chronology. Its E6A/E6B/E6C anomaly candidates and FO1/FO2/FO3 branch observations have equal presentation weight and can be inspected only through the existing deterministic reducer. The journal has no model call path. Off, subtle, and guided objective settings are player-selected and persist only in the spatial envelope.

Static civic and Assembly stations are fixed dossiers with no free-form model input. E5 and E7 become inspected only after an explicit player action. The Assembly copy identifies its position as situated political interpretation rather than national consensus. Anonymous ambient residents use deterministic placements and captions, and every caption is labeled as authored dramatization rather than testimony or evidence.

### Spatial Presentation Resilience

The world shell performs one cached browser WebGL capability check before mounting the renderer and rechecks only when the player explicitly retries. It contains runtime failures in a local React error boundary. Capability failure, render failure, or active WebGL context loss always leaves a retry action and a direct link to the complete non-spatial route. The context-loss listener is removed before an intentional renderer replacement, so safe-spawn travel is not misclassified as a graphics failure. Case progress is outside the canvas boundary and is never cleared by a graphics retry. Invalid persisted spatial data is replaced with the recovered authored-safe session on mount instead of being discarded again on every reload.

The renderer has `high`, `balanced`, and `classroom` presentation profiles. Profiles may change DPR, shadows, fog distance, post-processing permission, ambient population limits, and texture tier only. They may not change canonical IDs, interaction distance, readable content, evidence availability, repair gates, or assessment behavior.

A pure rolling monitor receives timestamped FPS samples outside React render. Sustained averages below 28 FPS for three seconds step down one tier. At `classroom`, a sustained average below 24 FPS for five seconds displays a voluntary non-spatial-route offer. The runtime supports `NEXT_PUBLIC_WORLD_TEST_MODE=1`; the frozen canvas E2E path opts in through a session-scoped test flag so movement tests can exercise the normal frame loop from the same production build.

All Playwright routes use a dedicated `127.0.0.1:3100` production server, never reuse a running development server, and leave the user-facing `localhost:3000` route independent. The Phase 1 automated performance gate additionally disables retries and browser cache. A Chromium CDP profile sets 1366 x 768, four logical processors, 4x CPU slowdown, the `classroom` graphics tier, and Chromium DevTools' effective Fast 4G throughput and latency values. The test measures navigation start through a successful canonical E3 overlay open for interactivity, sums same-origin `Network.loadingFinished.encodedDataLength` values for compressed transfer, verifies nonblank canvas pixels, warms the scene for ten seconds, then records 60 one-second frame buckets from the renderer's R3F `useFrame` callback while a scripted movement loop runs. It also requires measured investigator displacement and a healthy nonblank canvas after the sample. The gate fails above 15,000,000 bytes, above 8,000 ms to interaction, below 30 median FPS, below 24 10th-percentile FPS, or above a 250 ms renderer-frame stall.

The automated proxy is a regression gate, not evidence of physical-device performance. A current ChromeOS browser on a 4 GB integrated-graphics Chromebook in the N4500 class or a documented equivalent must still pass before the spatial route can become the default classroom mode.

After the Louis station, safe-point recovery, and context-loss lifecycle correction were integrated, the production proxy reported 1,525,007 compressed bytes, 3,759 ms to the first canonical interaction, 52 median FPS, 50 10th-percentile FPS, a 47.5 ms maximum post-load renderer stall, a nonblank canvas, and 2.45 world units of measured movement. Portrait browser coverage separately requires a nonblank 390 x 844 canvas and non-overlapping top controls.

### Movement And Focus Authority

The spatial client uses a pure finite state machine with `exploring`, `focused`, `cinematic`, `repair`, and `suspended` modes. Locomotion and world pointer capture are permitted only in `exploring`. Visibility loss suspends the prior mode and visibility restoration returns to that exact mode; illegal transitions return a typed rejection without mutation.

Ecctrl owns only the investigator capsule and movement physics. Drei keyboard state is explicitly bridged into `EcctrlHandle.setMovement`; every movement boolean is set false and horizontal velocity is cleared when exploration stops. Rapier fixed colliders represent only schematic navigation boundaries. The controller starts from the manifest's validated safe spawn, never an arbitrary persisted physics transform.

The first follow camera is a damped, medium-distance presentation camera. It carries no historical or educational state. Browser verification waits for initial physics/camera settling before proving that keyboard input changes the rendered frame.

### Physical Evidence Entry Points

Proximity selection considers only manifest-authored candidates, rejects ineligible or out-of-radius candidates, selects one nearest target, and uses the stable interactable ID for equal-distance ties. The selected request must still pass the fail-closed manifest interaction policy.

After authorization, the interaction adapter may dispatch an existing case command. `CaseSessionProvider.issue` uses a current-state ref and returns the exact synchronous `ReducerResult`, so successive commands consume successive revisions and a world caller never infers success from a future React render. The provider remains the sole client educational state owner.

The 3D object opens a semantic React DOM overlay containing the canonical evidence record, provenance, citation, and source limitation. The object itself never enters inspected IDs, pinned evidence, source lineage, or scoring. Focus mode stops locomotion, the overlay receives focus, Escape/close exits, and focus returns to the invoking world control.

### Character System

Responsibilities:

- generated station policies for Drouet and Louis only
- static Varennes civic and Assembly reaction dossiers
- station-specific fact, source, evidence, and authored-unit allowlists
- explicit unknowns and response boundaries
- evidence reactions with required presented-evidence IDs
- ID-only model plans and server-rendered authored prose
- station-specific safety refusals and no-key/provider fallbacks
- model call assembly, correlation, authorization, and stale-response rejection

Drouet's generated station may use FO1 as a fixed fictional-branch perspective and may react to E3, E4, or E5 only after the matching record is presented. Louis's generated station is limited to E1 and S1. E2, S8, and S9 remain deterministic archive content and are not available to Louis's model policy. Generated dialogue has an empty recordable-claim allowlist and never becomes evidence.

### Evidence System

Responsibilities:

- evidence archive
- evidence inspector
- comparison lab
- source metadata
- simplified/original versions
- glossary hooks
- evidence-to-claim links

### Causal Board

Responsibilities:

- node categories
- evidence pins
- relationship labels
- supported/unsupported/contested states
- deterministic solution checks

### Hypothesis System

Responsibilities:

- free-form student submission
- pinned evidence
- selected altered link
- selected conditions
- selected consequence
- rejected alternative
- deterministic hard gates
- deterministic repair eligibility
- GPT-5.6 classification of exact student spans, evidence fit, concerns, and rubric bands for formative feedback only
- provenance-, dependency-lineage-, and independent-source-lineage context in the feedback prompt
- server coherence checks for pinned evidence, source independence, score/template fit, and contradictory claims
- no-score deterministic fallback feedback

### Teacher Alignment

Responsibilities:

- packet upload
- size/type validation
- ingestion call
- alignment profile
- teacher review
- objective selection
- packet-aware hints and reports

### Safety

Responsibilities:

- `omni-moderation-latest` checks before generation when a provider key is configured
- authored no-fact safety refusals and no-score safety feedback
- bounded request schemas: 600-character character questions and 2,400-character Case Briefs
- per-endpoint in-memory rate limiting at 20 requests per 60 seconds per forwarded client key
- browser-to-provider cancellation with `AbortSignal`
- one explicit retry for transient provider failures; OpenAI SDK retries disabled
- ten-second provider timeout, `store: false`, and typed failure classification
- minor-safety defaults, honest API fallback, and privacy rules

## Data Structure

Current case and model-policy structure:

```text
data/cases/varennes/
  case.json
  facts.json
  interpretations.json
  characters.json
  evidence.json
  branch-observations.json
  causal-graph.json
  hints.json
  rubric.json
  sources.json
  model-policy.json
```

Each canonical item should have a stable ID.

Example ID families:

- `fact.*`
- `source.*`
- `evidence.*`
- `branch-observation.*`
- `claim.*`
- `character.*`
- `condition.*`
- `mechanism.*`
- `consequence.*`
- `hint.*`

## Deterministic Responsibilities

The application controls:

- canonical chronology
- verified facts
- evidence items
- provenance labels
- fictional alteration
- fixed fictional branch observations, which may identify the authored branch mechanism but never count as historical evidence
- character knowledge boundaries
- unlocked evidence
- claim recording
- caseboard node validity
- required solution components
- prohibited misconceptions
- hint availability
- repair eligibility
- final reconstruction
- report telemetry

## GPT-5.6 Responsibilities

Implemented GPT-5.6 responsibilities:

- select authored character claim, evidence-reaction, follow-up, or refusal unit IDs
- classify exact spans from the student's Case Brief against pinned evidence
- select authored summary, rubric-reason, issue, and revision-template IDs
- recommend non-authoritative rubric scores subject to lineage and coherence validation

The model does not generate visible historical sentences. The server renders selected policy units after authorization. Teacher-packet vocabulary mapping, hint adaptation, and teacher-report narration remain planned Phase 4 work.

## Teacher Packet Pipeline

Status: planned; not yet implemented.

1. Teacher uploads PDF/TXT/Markdown/DOCX or chooses sample packet.
2. Server validates file type and size.
3. File is treated as untrusted source data.
4. Model extracts alignment profile only.
5. Application validates mappings against allowed case concepts.
6. Teacher reviews and confirms profile.
7. Gameplay uses only the approved profile.
8. Raw file is not retained unless explicitly required.

Packet profile can include:

- glossary entries
- relevant passages
- objective mappings
- reading profile
- possible conflicts
- injection flags
- limitations

Packet profile cannot:

- create facts
- modify evidence
- change solution
- change character knowledge
- define correctness

## Security and Prompt Injection

Controls:

- uploaded materials are untrusted
- student messages are untrusted
- raw conversation is not trusted as state
- model receives whitelisted facts
- model outputs only authored unit/template IDs and exact spans copied from submitted student text
- unknown IDs invalidate output
- claim and evidence-reaction prerequisites are checked against the evidence actually presented
- feedback evidence links and concerns are checked against the committed pinned-evidence snapshot
- feedback receives source type, provenance, dependency lineage, independent lineage, source limitations, and deterministic gate context
- strong corroboration requires at least two independently eligible historical lineages among evidence actually linked to the student's claims; unrelated pinned evidence does not count
- character prompts omit full solution
- no open-web calls during gameplay
- no model-generated evidence
- no model-generated win condition

## Privacy

MVP privacy defaults:

- anonymous session
- no student account
- no names or emails
- no demographics
- no student note upload
- local persistence only unless explicitly changed
- no cross-session memory
- teacher report export controlled by teacher

## API Failure Fallback

The case must complete if model calls fail.

Implemented fallbacks:

- source-bounded authored character turns selected only when their evidence prerequisites fit the current request
- deterministic hint library
- no-score Case Brief feedback that preserves the student's text and deterministic status
- deterministic repair eligibility independent of model availability
- deterministic report

Failure handling:

- preserve player text
- retry one transient provider failure while disabling SDK-level retries
- classify timeout, rate limit, connection, abort, invalid output, and non-transient provider failures
- cancel superseded or unmounted requests through the provider call
- show an explicit authored-fallback or unavailable state
- never strand player on a blank screen

The current limiter is process-local and intended for the hackathon MVP, not a distributed production abuse-control system. The complete no-key browser path has been exercised. A live GPT-5.6 API-key smoke test remains outstanding.

## Testing Strategy

Unit tests:

- reducer transitions
- evidence unlocks
- hard gates
- character authorization
- provenance labels
- hint selection
- packet boundaries

Historical integrity tests:

- facts have source IDs
- evidence has provenance
- fiction is labeled
- reconstructions are not primary sources
- characters cannot use forbidden facts
- no consequence edge says "inevitable"

Model eval tests:

- direct answer requests
- out-of-bound questions
- prompt injections
- evidence reactions without the required presented record
- Louis's private-motive and E1-only boundary
- invented student quotations
- strong corroboration claimed from one lineage
- contradictory statuses without contradictory evidence
- incoherent high-confidence feedback
- unauthorized IDs and attempted solution leakage

Safety and operational tests additionally cover moderation mapping, bounded schemas, cancellation propagation, retry counts, provider-error classification, rate limiting, stale-response coordination, and authored fallbacks.

End-to-end tests:

- clean path
- alternate character order
- early wrong hypothesis then revision
- reduced-reading mode
- teacher packet alignment
- API failure fallback
- refresh/resume
- keyboard-only path
