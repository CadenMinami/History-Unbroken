# AI Contracts

## Purpose

This document records the implemented authority boundary for GPT-5.6 in History Unbroken. The model interprets student language and selects from authored policy units. It does not define historical truth, write visible historical prose, mutate game state, or affect repair eligibility.

No model output, rubric score, feedback status, or extracted span can unlock, block, delay, or revoke the repair.

## Implementation Status

| Contract | Status | Runtime authority |
|---|---|---|
| Character turn | Implemented for Drouet and Louis | Formative only |
| Case Brief feedback | Implemented | Formative only |
| Browser speech rendering | Implemented as an explicit local fallback | Presentation only |
| Contract F: player transcription | Security contract implemented; provider route deferred to Task 12 | Presentation only |
| Contract G: authorized speech | Security contract and ticket minting implemented; provider route deferred to Task 12 | Presentation only |
| Course packet ingestion | Planned | Alignment only |
| Hint adaptation | Planned | Selection from authored hints only |
| Teacher report narration | Planned | Narrative over validated telemetry only |

The Varennes civic station and Assembly reaction station are static dossiers. They do not call GPT-5.6.

Current binding: AI contract `1.1.0`, media contract `1.0.0`, model policy `1.0.1`, case schema `1.0.0`, case content `1.0.3`, and state `1.2.0`. AI `1.1.0` is the only accepted active version; `1.0.0` requests receive a classified HTTP 409 before provider invocation. Character success and fallback envelopes now require top-level `speechAuthorization`, which is `null` without a usable server secret and signed when one is available. Case Brief responses do not carry speech authorization.

### Browser Speech Exception

The implemented browser speech fallback is outside model authority and must satisfy all of these rules:

- playback is explicitly player-initiated and never automatic
- the spoken input is exactly `turn.spokenResponse`; it is not rewritten or regenerated
- the visible caption remains authoritative and available throughout playback or failure
- the UI states that the sound is synthetic and is not the historical person's voice
- the adapter requests no historical-person imitation, accent performance, or identity claim
- active speech is cancelled when the station, case revision, response text, or mounted dialogue changes
- speech state is not persisted and cannot issue case commands
- unsupported browsers and playback errors preserve the complete text path

This exception is not the Contract G provider-speech pipeline. The existing browser adapter remains unchanged and may ignore the new authorization field. Provider-generated audio still requires the Task 12 route, provider service, cleanup, rate limiting, and explicit consent controls; none of those runtime surfaces exists yet.

## Global Rules

Every implemented model request:

- runs from a Next.js server route
- carries contract, case schema, case content, model policy, state, prompt, request, and state-revision metadata
- uses strict Zod-backed Structured Outputs
- treats student text as untrusted
- is moderated before generation when `OPENAI_API_KEY` is configured
- uses bounded input schemas
- sends only the policy and evidence context needed for the task
- sets `store: false`
- propagates request cancellation to moderation and generation
- returns an ID-only or span-and-ID plan
- is authorized against repository-owned policy after generation
- fails closed to an honest deterministic fallback
- returns `authority: "formative_only"` and `mutatesCaseState: false`

The OpenAI SDK is configured with provider retries disabled. Each service performs at most one explicit retry after a classified transient failure. The provider timeout is ten seconds.

## Request Correlation

Implemented requests and responses include:

- `contractVersion`
- `caseId`
- `caseSchemaVersion`
- `caseVersion`
- `policyVersion`
- `stateVersion`
- `requestId`
- `stateRevision`
- `promptVersion`

The browser displays a response only when its correlation metadata still matches the active request snapshot. Editing a question or evidence selection, switching stations, changing case state, or unmounting the component invalidates and aborts the previous request.

## Contract A: Character Turn

### Authorized Stations

| Station | Mode | Allowed historical evidence | Boundary |
|---|---|---|---|
| `CHAR-DROUET` | Generated dialogue | E3, E4, E5 | FO1 fictional-branch perspective plus attributed reactions to records the student presents |
| `CHAR-LOUIS` | Generated dialogue | E1 only | Louis's public position in the declaration; complete private motive remains unknown |
| `STATION-VARENNES-CIVIC` | Static dossier | E5 | No generated Sauce roleplay |
| `STATION-ASSEMBLY` | Static dossier | E7 | No generated Barnave dialogue |

Louis may not receive or discuss E2 through the generated station. S8 and S9 remain deterministic preparation records in E2, not part of Louis's model context.

### Input

- correlated request metadata
- station ID, restricted to Drouet or Louis
- player message, trimmed and limited to 600 characters
- inspected evidence IDs, unique and limited to eight
- presented evidence IDs, unique, limited to two, and required to be inspected
- reading mode

The service additionally rejects evidence outside the selected station's authored allowlist.

### Model Plan

GPT-5.6 returns only:

- `claimUnitIds`
- `evidenceReactionUnitId`
- `followUpQuestionUnitId`
- `refusalUnitId`

It returns no `spokenResponse`, historical sentence, fact ID, source ID, or recordable claim. At least one audible authored claim, reaction, or refusal unit is required. A refusal cannot be combined with claims or an evidence reaction.

### Server Authorization And Rendering

The server:

1. Loads the generated station policy.
2. Filters the prompt catalog to units whose evidence prerequisites are currently satisfied.
3. Validates every selected ID against that station's exact allowlists.
4. Rechecks `requiresPresentedEvidenceIds` for both claims and evidence reactions.
5. Rejects empty, mixed-refusal, unknown, or out-of-bound plans.
6. Renders visible text from authored standard or reduced-reading policy units.
7. Derives fact, source, evidence, epistemic, and rendered-unit metadata from those authored units.
8. Returns a validated internal result with no speech authorization or secret dependency.

The character route is the separate public trust boundary. After the service returns an authorized model or authored fallback caption, the route optionally signs that exact caption and validates the public response envelope. No other application path mints speech authorization.

Generated dialogue cannot be pinned, scored, or promoted to historical evidence. Every station's `recordableClaimIds` allowlist is empty in the MVP.

### Moderation And Safety Fallback

When the moderation gateway flags a message, generation is not called. The server renders the station's authored no-fact safety refusal and returns:

- no claim IDs
- no fact IDs
- no source IDs
- no evidence references
- `epistemicStatus: "refused"`
- `reason: "unsafe_input"`

If moderation itself fails, the request fails closed to the ordinary authored provider fallback.

## Contract B: Case Brief Feedback

### Input

- correlated request metadata
- a validated submitted CaseState snapshot
- the student's Case Brief, limited to 2,400 characters
- pinned evidence and selected board state
- deterministic repair eligibility and missing-gate IDs
- the fixed formative rubric

For each pinned evidence item, the prompt includes only reviewed case-package metadata:

- evidence ID, title, excerpt, and description
- source type and provenance
- fact IDs
- dependency lineage IDs
- independently eligible historical source lineage IDs
- source ID, type, lineage, eligibility, verification status, and limitation

The model receives deterministic gate results as context, not as authority it may alter.

### Model Plan

GPT-5.6 returns:

- a formative status
- a summary template ID
- evidence-to-claim links using pinned evidence IDs and exact spans copied from the student's argument
- concern spans with authored issue-template IDs
- five 0-4 rubric recommendations
- one authored rubric-reason ID per criterion
- a revision-prompt ID

The model does not write the summary, concern explanation, rubric reason, or revision prompt displayed to the student. The server renders those from authored feedback units.

### Server Authorization And Coherence

The server rejects feedback when:

- a template, evidence, or issue ID is not authorized
- a quoted student span does not appear in the submitted argument
- a link or concern cites evidence that was not pinned
- a rubric-reason template does not match its criterion and score band
- corroboration is rated strong with fewer than two independent historical lineages among the non-`unclear` evidence-to-claim links; unrelated pinned evidence does not count
- evidence-fit or corroboration scores exceed the allowed floor without an evidence-to-claim link
- `contradicted_by_record` has no contradictory evidence link
- a contradicted, under-evidenced, or supported-incomplete status carries rubric scores that deny the weakness named by that status
- `well_supported` conflicts with concerns, weak rubric scores, too few linked records, or too few independent lineages

Authorized results are advisory. Deterministic repair eligibility is computed separately from `solution` and remains visible even when feedback fails.

### Feedback Fallback

Missing keys, moderation flags, provider errors, timeouts, rate limits, aborts, invalid structured output, or failed authorization produce a no-score fallback. The student's Case Brief remains stored in the local case state, and repair eligibility does not change.

## Operational Boundary

### Input Bounds

- Character message: 600 characters
- Inspected evidence IDs: at most 8
- Presented evidence IDs: at most 2
- Case Brief argument: 2,400 characters

The UI and server schemas enforce the same text limits.

### Rate Limiting

Each AI endpoint uses an in-memory sliding window of 20 requests per 60 seconds per forwarded client key. A rejected request returns HTTP 429 and `Retry-After: 60`.

This is hackathon-level process-local protection. A multi-instance or production classroom deployment needs a shared limiter and stronger client identity.

### Failure Classification

The services distinguish:

- missing API key
- timeout
- aborted request
- unsafe input
- invalid structured output
- unauthorized output
- rate limit
- provider error

Only timeout, connection, 408, 429, and 5xx-style failures are treated as transient. Non-transient 4xx errors and aborts are not retried.

## Planned Contract C: Course Packet Ingestion

Course packet ingestion is not implemented. The approved future boundary remains:

- teacher material may align terminology, objectives, hints, and reporting
- teacher material is untrusted class material, not historical ground truth
- it may not add facts, change evidence, expand character knowledge, alter the solution, or define correctness

## Planned Contract D: Hint Adaptation

Hint adaptation is not implemented. A future model may select from currently valid authored hint IDs and adapt reading level, but may not invent a clue or reveal a locked solution component.

## Planned Contract E: Teacher Report

AI-authored teacher-report narration is not implemented. A future report model may narrate validated telemetry and approved formative feedback, but may not recalculate repair status, invent student behavior, infer personal traits, or recommend high-stakes grading without teacher review.

## Contract F: Player Transcription

Contract F is implemented as strict provider-independent schemas and pure validation helpers. The transcription route, multipart parser, recorder, provider call, and transcript UI remain Task 12 work.

### Correlation And Input

Every request and response carries media contract `1.0.0`, case ID, generated station ID, request UUID, and nonnegative state revision. Audio metadata is constructed from the bytes the future server boundary actually receives rather than trusted client claims. It permits exactly one channel, at most decimal `2,000,000` audio bytes, and at most `20,000` milliseconds for both advisory and provider-detected duration.

Canonical MIME values are `audio/webm`, `audio/mp4`, `audio/ogg`, and `audio/wav`. A pure helper may convert a browser value such as `audio/webm; codecs=opus` to its canonical value before schema parsing. The schema itself accepts only canonical values, and declared/detected MIME disagreement fails closed.

### Output And Non-Authority

A successful response returns the same correlation, a canonical detected MIME value, detected duration, and an untrusted transcript of at most 600 characters. The transcript enters the existing character-message path and moderation boundary; it is never a source, historical fact, model plan, score, command, or CaseState snapshot.

The strict request and response schemas reject historical facts, sources, evidence, scores, commands, CaseState snapshots, `authority`, `mutatesCaseState`, and unknown fields. Media transforms cannot unlock evidence, affect repair eligibility, or mutate case state.

### Staleness, Failures, And Privacy

The pure current-correlation check requires exact media version, case, station, request, and revision equality. It rejects stale request IDs, station changes, or revision changes. The stateless server cannot know the browser's globally current revision; the browser must compare the response to its active interaction snapshot before display or submission.

Failure reasons preserve the existing operational set of `missing_api_key`, `timeout`, `aborted`, `rate_limited`, and `provider_error`, plus invalid request/version, payload, duration, MIME, transcript, stale-correlation, and authorization failures. Timeout and rate-limit failures are transient. Provider errors are retryable only when separately classified transient. Abort and validation failures are never retryable.

Task 12 must keep raw audio and full transcripts out of logs, enforce the byte limit while streaming before multipart parsing, and release every temporary byte buffer or file in a `finally` path after success, rejection, timeout, abort, or provider failure. No raw audio retention is authorized by this contract.

## Contract G: Authorized Speech Synthesis

Contract G is implemented as strict schemas, route-bound character authorization, and HMAC ticket verification. The speech endpoint, provider gateway, generated-audio response, and playback UI remain Task 12 work.

### Trusted Mint Boundary

`createCharacterTurn` returns a server-internal validated result and imports no ticket or secret code. Only `handleCharacterTurnRequest` may attach `speechAuthorization`, and only after the service has returned an authorized visible caption. This applies equally to model-selected and authored fallback captions. If `SPEECH_AUTHORIZATION_SECRET` is absent or shorter than 32 UTF-8 bytes, the route preserves the complete character response with `speechAuthorization: null`.

There is no ticket-mint endpoint and no application path that mints from client-supplied text. `AuthorizedSpeechRequest` is exactly the caption plus the pre-minted authorization record; unknown top-level fields are rejected.

### Exact Text And Signature

The logical app-owned voices are `drouet-source-v1` and `louis-source-v1`. Their station mapping is private server policy, not a provider voice name or a client choice. Task 12 may map those IDs to provider configuration without changing the public contract.

The ticket binds media version, case ID, generated station ID, original character request UUID, state revision, logical voice ID, SHA-256 of the exact UTF-8 visible caption, and integer expiry. Signing uses HMAC-SHA256 over a domain-separated, byte-length-prefixed canonical representation and emits an unpadded base64url signature. Verification decodes a canonical 32-byte signature and uses `timingSafeEqual` only after equal-length checks.

Speech-request parsing and verification do not trim or Unicode-normalize the caption. Whitespace, code-point composition, or any other text alteration changes the caption hash and fails authorization. Malformed/short signatures, wrong or short secrets, altered correlation, altered voice, and altered text fail closed without logging secret material.

### Expiry, Replay, And Playback Correlation

Tickets expire after 120 seconds. Verification rejects expired tickets and tickets whose remaining lifetime exceeds that bound. Expiry limits replay but does not identify the browser's globally current interaction. Signed fields prevent tampering; the client must also run the current-correlation check against the active station, request, revision, and visible caption before playing returned audio. A station switch, superseding request, revision change, or caption change rejects stale playback.

A successful future speech transform may return only correlated audio metadata, logical voice ID, and the authorized caption hash. It returns no new text, historical fact, source, evidence, score, command, CaseState, authority, or state transition. Generated audio is not application-persisted. Task 12 must redact caption/audio content from operational logs and clean temporary generated bytes on every completion path.

## Verification Boundary

The current automated corpus covers station allowlists, evidence prerequisites, exact-span validation, one-lineage corroboration rejection, contradictory-status coherence, prompt injection, attempted solution leakage, moderation mapping, request cancellation, retry behavior, provider-error classification, rate limiting, no-key fallbacks, strict media limits, MIME mismatch, stale media correlation, exact-caption hashes, ticket expiry, signature tampering, route-only nullable/minted authorization, and legacy AI-contract rejection.

The source-bounded paths have not yet been verified against a live `OPENAI_API_KEY` in this repository session. No transcription or provider-speech route exists yet, so media verification is contract-level only. Until Task 12 and live smoke tests are recorded, documentation must distinguish schema, ticket, and fallback verification from provider verification.
