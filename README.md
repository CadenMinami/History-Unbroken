# History Unbroken

**History Unbroken: The Road That Should Have Closed** is a teacher-aligned historical mystery game where students investigate a fractured version of the Flight to Varennes, question source-bound AI characters, compare evidence, build a causal argument, and repair one altered historical link without reducing the French Revolution to a single cause.

## Current Status

The deterministic primer-to-debrief vertical slice and the first GPT-5.6 source-bounded layer are implemented. Historical truth, evidence, case state, and repair eligibility remain repository-owned and deterministic.

Implemented foundations include:

- a Next.js application shell and real-browser smoke test
- a versioned, source-linked Varennes case package
- strict historical-integrity and referential-integrity validation
- a pure typed case reducer with revision and phase authority
- deterministic repair eligibility independent of model output
- versioned local persistence and invalid-state recovery
- a shared browser case-session provider
- a six-step novice context primer and bounded fracture opening
- a nonlinear investigation archive with explicit source comparison
- a deterministic causal caseboard and open-form recorded Case Brief
- a source-linked repair sequence with an explicit unknown counterfactual boundary
- a final learning summary that separates validated actions, recorded prose, and historical reconstruction
- a complete Playwright path from an empty session through persisted debrief state
- generated, source-bounded exchanges for Drouet and Louis only
- static Varennes civic and Assembly reaction dossiers
- ID-only model plans whose visible historical language is rendered from authored server policy
- evidence-reaction prerequisites that prevent a character from reacting to evidence the student did not present
- provenance- and lineage-aware formative Case Brief feedback
- input moderation, bounded request schemas, in-memory route rate limiting, request cancellation, and authored no-key/provider fallbacks
- versioned presentation-only transcription and speech contracts with exact-caption HMAC authorization
- historical-integrity tests and a source-bounded model-policy evaluation corpus

Task 11's media security contracts are implemented and Task 12 provider transcription/speech work is now the active gate. Recorder/playback controls and live media calls are not yet complete. The current GPT-5.6 paths have been exercised with injected test gateways and through the no-key browser fallback; a live API-key run is still required before claiming provider-level integration verification.

## Local Setup

Requirements:

- Node.js 20.9 or newer
- npm 10 or newer

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Optional server-side model configuration:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6 # optional; this is the default
SPEECH_AUTHORIZATION_SECRET=replace_with_a_random_server_secret_at_least_32_bytes # server-only; optional until provider speech is enabled
```

No API key is required to complete the case. Without one, character exchanges use clearly labeled authored fallback turns and Case Brief feedback reports that AI assistance is unavailable; deterministic repair status is unchanged.

`SPEECH_AUTHORIZATION_SECRET` is server-only and must never use a `NEXT_PUBLIC_` prefix. When absent or too short, character responses remain complete and return `speechAuthorization: null`; the existing browser speech fallback is unchanged. Setting it enables short-lived caption authorization only, not a transcription or provider-speech endpoint.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Install the Playwright Chromium runtime once, then run the browser suite:

```bash
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npm run test:e2e
```

Run the isolated classroom-hardware proxy only when port 3000 is free. This
command always builds and starts a fresh production server; it will not reuse a
development server.

```bash
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npm run test:performance
```

The proxy forces the `classroom` graphics tier, a 1366 x 768 viewport, 4x CPU
slowdown, and Chromium DevTools' Fast 4G profile. It checks a real evidence
interaction, compressed transfer, a 10-second warm-up, and a 60-second frame and
stall sample. A physical 4 GB integrated-graphics Chromebook check is still
required before 3D can be declared the default classroom route.

The automated suites validate contracts, authorization, moderation adapters, failure handling, source closure, independent-lineage rules, UI integration, and the full deterministic browser path. They do not substitute for a live `OPENAI_API_KEY` smoke test.

## Product Thesis

This is not compelling because students can chat with Louis XVI. It is compelling because flexible AI dialogue is embedded inside an authored evidence system that makes historical reasoning observable, playable, and assessable without allowing the model to determine historical truth.

## Target Experience

- Category: Education
- Target student: Grade 10 World History student studying the French Revolution
- Runtime: 10-15 minutes
- Case: The Flight to Varennes, June 1791
- Core mystery: a bounded temporal fracture appears somewhere in the recognition-to-detention chain; the student compares fixed fictional branch observations with reviewed history to identify the active link among three equally labeled anomaly candidates
- Student goal: identify the altered causal link, support the claim with evidence, explain why the arrest mattered, and avoid single-cause history
- Teacher support: optional course packet alignment for vocabulary, hints, learning objectives, and reporting

## Documentation

- [AGENTS.md](AGENTS.md) - project rules for historical integrity, AI authority, engineering, and parallel agents
- [CODEX_MASTER_BRIEF.md](CODEX_MASTER_BRIEF.md) - controlling instruction brief for the build
- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) - full product, gameplay, and learning specification
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) - archival control-room visual system and accessibility rules
- [docs/WIREFRAMES.md](docs/WIREFRAMES.md) - critical interaction layouts and responsive behavior
- [docs/CONTEXT_AND_CURRICULUM_CANON.md](docs/CONTEXT_AND_CURRICULUM_CANON.md) - novice-safe context and teacher-alignment rules
- [docs/CASE_CANON.md](docs/CASE_CANON.md) - immutable case facts, mystery solution, characters, evidence, and causal graph
- [docs/ANSWERABILITY_MATRIX.md](docs/ANSWERABILITY_MATRIX.md) - where every required conclusion is taught or discovered
- [docs/REPAIR_GATE_TRACEABILITY.md](docs/REPAIR_GATE_TRACEABILITY.md) - deterministic gate-to-source, control, state, and test mapping
- [docs/HISTORICAL_SOURCES.md](docs/HISTORICAL_SOURCES.md) - source ledger and verification gates
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - technical architecture and deterministic/model boundaries
- [docs/AI_CONTRACTS.md](docs/AI_CONTRACTS.md) - structured model contracts and authority limits
- [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) - phases, schedule, testing, and definition of done
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) - three-minute demo storyboard
- [docs/BUILD_LOG.md](docs/BUILD_LOG.md) - Codex collaboration log

## High-Level Architecture

The current implementation uses:

- Next.js
- TypeScript
- Tailwind CSS
- Server-side OpenAI API calls
- GPT-5.6 for selecting constrained character-response units and formative Case Brief classifications
- Zod-validated structured outputs
- Authored case data in JSON
- Deterministic case-state logic
- Local browser persistence
- Vercel deployment

The model never writes visible historical prose, directly changes application state, or affects repair eligibility. It selects IDs and exact student-text spans from strict schemas; the server validates those selections and renders authored policy text. Teacher-packet alignment and teacher-report narration remain planned rather than implemented.

## Privacy and Safety Defaults

- No student accounts for the MVP
- No student names, demographics, or personal profiles
- No student note uploads
- Anonymous local session identifiers
- Teacher reports describe observable reasoning, not personality or ability
- Uploaded teacher materials are treated as untrusted data
- Fictional, reconstructed, verified, contested, and class-provided materials are visibly labeled

## Important Non-Goals

The MVP will not include:

- Multiple playable mysteries
- Automatically generated historical mysteries
- A general teacher authoring platform
- A definitive alternate-history simulation
- Student accounts or LMS integration
- Real-time voice characters
- Open-web research during gameplay
- Vector database search over full textbooks
- Automated high-stakes grading

## Development Authority

`AGENTS.md` and the approved case documents govern implementation. Within the machine-readable package, `solution` is the sole repair authority; `repairGates` is source-linked traceability metadata only. No commit or push is made without explicit user approval.
