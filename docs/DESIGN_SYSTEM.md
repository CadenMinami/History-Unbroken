# Design System

## Direction

**Diegetic historical reconstruction with an archival control-room layer** is the locked visual direction.

The primary route is a compact third-person reconstruction rendered with grounded stylized realism. The fixed investigator moves through authored archive, post-road, civic, and bridge zones; physical evidence objects open the modern investigative workspace as a readable DOM focus overlay. The existing archival control-room system remains the complete non-spatial route and controls documents, comparison, dialogue captions, caseboard, repair explanation, and debrief.

The combined experience should feel precise, active, and source-conscious rather than nostalgic, theatrical, or sepia-toned. The memorable image is the investigator entering a reconstructed place, opening an inspectable record, and seeing its supported links change on the route and causal map.

Temporal corruption appears through registration errors, duplicated timestamps, broken rule lines, and offset archival layers. Do not use neon science-fiction styling, holograms, blurred imagery, glowing orbs, or a definitive alternate-history spectacle.

## Interface Principles

1. The route and causal chain are visually primary.
2. Historical documents remain inspectable objects with provenance, dates, authors, and source status.
3. Conversation is a docked investigation surface, not the application shell.
4. Every meaningful action changes visible state.
5. Verified, contested, reconstructed, dramatized, fictional, and class-provided material remain distinguishable without relying on color alone.
6. The experience favors scanning and repeated action over marketing composition or decorative cards.
7. Three-dimensional travel establishes presence; evidence work remains the main experience.
8. World geometry cannot imply more historical certainty than its visible reconstruction label allows.
9. The non-spatial route is a first-class mode, not an error fallback.

## Spatial Direction

- Camera: medium-distance third person, stable framing, no combat camera behaviors.
- Investigator: one unnamed, period-dressed fixed appearance; no customization system.
- Lighting: late evening with readable silhouettes and practical contrast, not a dark horror scene.
- Travel: short required movement for first discoveries, then journal fast travel between discovered zones.
- Conversations: cinematic framing with persistent captions and typed input; optional voice remains downstream of authorized text.
- Ambient residents: sparse scripted one-line reactions only; they never carry scored facts.
- Exact building, object, road, and bridge placement defaults to `SCHEMATIC RECONSTRUCTION` unless the source ledger authorizes more.
- Documents and long text are never rendered only onto in-world meshes.

## Graybox Gate

Before final art or district expansion, the archive graybox must show a nonblank canvas, stable dimensions, an accessible loading/status shell, one reducer-authorized evidence interaction, and acceptable loading/frame behavior on the target Chromebook proxy. Graybox materials must use multiple restrained material families so the scene remains legible without becoming a one-note brown, beige, or slate environment.

## Color

| Token | Value | Use |
|---|---|---|
| `paper` | `#F4F2EC` | Main document and workspace background |
| `white` | `#FFFEFB` | Raised evidence surfaces and text fields |
| `ink` | `#171A1F` | Primary text and strong rules |
| `graphite` | `#59616A` | Secondary text and inactive controls |
| `line` | `#C9CDD0` | Dividers and structure |
| `archive-blue` | `#285A78` | Navigation, established facts, active focus |
| `correction-red` | `#B74335` | Temporal anomalies, contradictions, destructive or corrective state |
| `evidence-green` | `#356A53` | Corroborated and repair-eligible state |
| `ochre` | `#A97820` | Contested interpretation and caution |

Rules:

- Do not use gradients.
- Do not let warm paper tones dominate every surface; balance them with white, ink, blue, red, and green.
- Every semantic color must also have an icon, text label, line style, or shape.
- Maintain WCAG-oriented contrast and verify actual rendered combinations.

## Typography

| Role | Typeface | Notes |
|---|---|---|
| UI and controls | `IBM Plex Sans` | Compact, neutral, and work-focused |
| Historical excerpts | `Newsreader` | Distinguishes source material from interface narration |
| Metadata and IDs | `IBM Plex Mono` | Dates, source IDs, provenance, and route timing bands |

Rules:

- Letter spacing is `0`.
- Do not scale font size with viewport width.
- Historical excerpts use comfortable line height and never imitation handwriting.
- Compact panels use small, tight headings rather than display-scale type.

## Shape And Structure

- Border radius: `0-6px`; evidence sheets may use `2px`, tool panels `6px`.
- Use one-pixel rules, tab strips, document edges, and map tracks instead of floating card sections.
- Do not nest cards inside cards.
- Use fixed icon-button dimensions and stable grid tracks so state changes do not shift layout.
- Use Lucide icons for familiar controls: search, compare, pin, notebook, map, source, close, expand, volume, and settings.
- Unfamiliar icons require tooltips.

## Provenance Language

| Category | Icon/shape | Treatment |
|---|---|---|
| Verified record | document with check | blue rule and explicit `VERIFIED RECORD` label |
| Contested interpretation | split arrows | ochre dashed rule and `CONTESTED` label |
| Reconstruction | drafting compass | graphite dot-dash rule and `RECONSTRUCTION` label |
| Dramatized dialogue | quote bubble | outlined label stating `AI DRAMATIZATION` |
| Fictional temporal anomaly | broken clock | red double rule and `FICTIONAL ANOMALY` label |
| Fictional branch observation | split timeline | red double rule and `AUTHORED BRANCH OBSERVATION` label |
| Class material | book open | blue-gray label stating `CLASS MATERIAL` |

The anomaly candidates use identical labels, dimensions, ordering weight, and visual intensity. Nothing in their presentation may reveal the active fracture. Branch observations share the fiction treatment but use an explicit sublabel so students cannot mistake an authored alternate-state observation for a historical source.

## Motion

- One high-impact fracture sequence uses brief two-axis registration slip and duplicated archival rules.
- Evidence comparison uses restrained line drawing and pin placement.
- Repair uses a single route correction followed by ordered state reconstruction.
- Do not continuously animate document textures or maps.
- Reduced motion replaces all movement with explicit before/after steps.

## Visual Assets

The application should use:

- reviewed document scans or public-domain facsimiles;
- a source-backed schematic route map;
- historically appropriate portraits when character identity matters;
- paper and print texture used sparingly at low contrast.
- licensed, modified, custom, or generated 3D assets recorded in an asset ledger with provenance and usage rights;
- authored graybox geometry before any paid or high-detail asset is approved.

Primary evidence must remain legible. Do not use dark overlays, heavy crops, atmospheric stock photography, or generated images as substitutes for inspectable historical material.

## Responsive Layout

### Desktop, 1280px and wider

- top command bar: `56px`
- left navigation rail: `224px`
- central route or evidence workspace: `minmax(560px, 1fr)`
- right context tray: `320px`

### Tablet, 768-1279px

- collapsible `64px` icon rail
- central workspace remains primary
- context tray becomes a reversible side sheet

### Mobile, below 768px

- no compressed three-column dashboard
- use full-width task views with a persistent bottom tab bar
- route map occupies a stable `42-48vh` region when active
- evidence comparison becomes vertically stacked with sticky source headers
- caseboard offers ordered keyboard/touch controls rather than requiring free drag

## Accessibility

- Complete keyboard path for every action.
- Visible focus with a two-pixel blue outline and offset.
- Color-independent provenance and support states.
- Reduced-reading excerpts remain linked to original text.
- Reduced motion preserves sequence and causality.
- Text-to-speech controls use familiar icons with labels.
- Route and causal links have screen-reader descriptions expressing source, relation, and support state.
- No timed decisions.

## Non-Goals

- No parchment fantasy interface.
- No decorative wax seals or quills as primary controls.
- No dark neon control room.
- No oversized marketing hero.
- No card grid as the primary investigation model.
- No character portrait dominating the evidence workspace.
- No animation that implies the counterfactual future is historically knowable.
- No Red Dead-scale open world, combat, stealth, survival, or unrestricted horse riding.
- No photorealism requirement or downloadable desktop-only build.
- No separate Unity or Babylon runtime alongside the React application.
