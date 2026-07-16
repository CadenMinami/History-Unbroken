# Critical Interaction Wireframes

## Status

The deterministic vertical-slice wireframes remain approved as the complete non-spatial route and the accessible focus-overlay system. The diegetic 3D route below is the approved primary presentation for the next build gate.

## Spatial Route Shell

```text
+--------------------------------------------------------------------------------+
| CASE 01 / VARENNES        objective                    journal  sources  access |
|                                                                                |
|                         third-person reconstructed world                       |
|                                                                                |
|                    [fixed investigator]      [evidence object]                 |
|                                                                                |
|  zone / reconstruction status                         [E] inspect record       |
|  SCHEMATIC TEMPORAL RECONSTRUCTION                    guidance marker          |
+--------------------------------------------------------------------------------+
```

Behavior:

- The canvas is full-bleed and never placed inside a decorative card.
- The HUD stays sparse: current objective, provenance/zone status, interaction prompt, journal, sources, and accessibility controls.
- First discovery requires short travel; discovered zones become available through the journal.
- World interactions resolve through a reviewed manifest to canonical IDs and fail closed on any mismatch.
- The canvas has a semantic DOM loading/status shell and a directly selectable non-spatial route.

## World Focus Overlay

```text
+-------------------------- reconstructed world remains visible ----------------+
| [close]  E3 / DROUET REPORT                  VERIFIED RECORD / PRIMARY         |
|                                                                                |
| readable source excerpt or conversation caption                               |
| provenance, author, date, limits, source link                                 |
|                                                                                |
| [inspect] [pin] [compare] [present to Drouet]                                  |
+--------------------------------------------------------------------------------+
```

Behavior:

- Opening an object pauses or safely contains movement and shifts focus into semantic React DOM.
- The overlay uses the existing evidence, character, comparison, and caseboard components rather than duplicating historical prose in Three.js.
- Closing restores focus and control predictably.
- Generated dialogue is visibly labeled, captioned, and never becomes evidence.
- Keyboard, screen-reader, reduced-motion, and non-spatial paths expose equivalent information and reducer commands.

## Four-Zone Graybox

```text
ARCHIVE  ----short travel----  POST ROAD  ----journal/road----  CIVIC SQUARE
  |                                 |                                 |
 records and fracture          Drouet / route                     civic dossier
  +-------------------------------------------------------------------+
                                    |
                              BRIDGE / REPAIR
```

These are compact temporal-reconstruction zones, not a claim that all stations coexisted at one literal moment or at exact measured positions. Initial implementation contains archive geometry and one evidence interaction only. Road, civic, and bridge expansion remains blocked until the archive performance gate passes.

## Shell

The non-spatial route and spatial focus overlays use one stable investigation shell:

```text
+--------------------------------------------------------------------------------+
| HISTORY UNBROKEN  /  21 JUNE 1791       case progress      support   settings  |
+----------------------+------------------------------------+--------------------+
| destinations         | primary workspace                  | context tray       |
|  route               |                                    | evidence / notes   |
|  witnesses           | route, source, comparison, board,  | changes with task  |
|  archive             | brief, or reconstruction           |                    |
|  comparison          |                                    |                    |
|  caseboard           |                                    |                    |
+----------------------+------------------------------------+--------------------+
```

The left rail changes destinations. The central workspace owns the current task. The right tray holds evidence, source metadata, claims, or open questions. Conversation never replaces this structure.

## 1. Context Primer

```text
+--------------------------------------------------------------------------------+
| FRANCE / 1791                                              1 OF 6              |
|                                                                                |
|  [small route or institution image]     THE KING REMAINS IN OFFICE             |
|                                         France is not yet a republic.           |
|                                         A constitution is being written.        |
|                                                                                |
|  source-backed context note             glossary: constitutional monarchy      |
|                                                       [continue]                |
+--------------------------------------------------------------------------------+
```

Behavior:

- Six visual context steps, each containing one required fact.
- Reduced-reading mode shortens the explanation but never removes the underlying fact.
- Original context citation is always accessible from the source icon.
- Final step states that the student is not expected to know what happened at Varennes.
- No Drouet, bridge, route-correction, or active-anomaly information appears.

## 2. Fracture Opening

```text
+--------------------------------------------------------------------------------+
| 20-21 JUNE 1791 / ROUTE TRACE                                                  |
|                                                                                |
| PARIS ---- SAINTE-MENEHOULD ---- CLERMONT --+-- VERDUN                        |
|                                             |                                  |
|                                             +-- VARENNES ---- [signal lost]    |
|                                                                                |
| archive record: STOPPED AT VARENNES     fractured trace: PASSED THE HALT ZONE |
|                                                                                |
|       [recognition echo]  [route echo]  [authorization echo]                  |
|       FICTIONAL ANOMALY   FICTIONAL...  FICTIONAL...                           |
|                                                                                |
| mission: identify the active fracture and explain why it mattered              |
+--------------------------------------------------------------------------------+
```

Behavior:

- The route is the first-viewport signal.
- All three anomaly candidates share dimensions, position weight, label, and motion.
- The alternate line ends immediately after the bounded divergence.
- Registration slip resolves into a stable workspace; it does not recur constantly.

## 3. Investigation Hub

```text
+----------------------+------------------------------------+--------------------+
| DESTINATIONS         | ROUTE / CURRENT UNDERSTANDING      | OPEN QUESTIONS     |
| > route              |                                    | 3 unresolved       |
|   Drouet             | Paris --- ... --- Sainte-Menehould |                    |
|   Louis              |                    \               | EVIDENCE TRAY       |
|   civic station      |                     Clermont       | [E1] declaration   |
|   Assembly           |                    /        \       | [E3] Drouet report |
|   archive            |              Varennes      Verdun  | [E5] civic record  |
|   comparison         |                                    |                    |
|   caseboard          | supported  contested  unresolved   | [compare selected] |
+----------------------+------------------------------------+--------------------+
```

Behavior:

- The route map visualizes discoveries without automatically drawing causal conclusions.
- Character destinations display knowledge scope, not collectible-clue counts.
- Open questions are actionable links to evidence or comparison views.
- Progress reflects reasoning actions, not completion percentage for every optional conversation.

## 4. Character Interview And Evidence Presentation

```text
+----------------------+------------------------------------+--------------------+
| ALTERED-STATE DROUET | TRANSCRIPT                         | EVIDENCE TRAY       |
| AI DRAMATIZATION     | [FO1 FIXED BRANCH OBSERVATION]     | [E3] historic acct  |
| knowledge: 21 Jun    | Suspected travelers; followed the | [E6A] recognition  |
|                      | Verdun road; no correction arrived.| [E6B] route        |
| topics               |                                    | [E6C] authorization|
| > recognition        | player action:                     |                    |
|   route              | [ask] [present evidence]           | [present selected] |
|   warning            | [challenge claim] [record claim]   |                    |
|                      |                                    | source drawer      |
+----------------------+------------------------------------+--------------------+
```

Behavior:

- The disclosure remains visible: dialogue is generated dramatization, not transcript or evidence.
- FO1 is a separate authored branch-state record. Generated elaboration may not alter it or become evidence.
- Presenting evidence is an explicit command with a selected item.
- Recordable claims resolve to authored claim IDs.
- A model refusal caused by knowledge limits reads as uncertainty, not a locked-game hint.
- Static fallback dialogue preserves the same claim IDs and state transitions.

## 5. Evidence Comparison

```text
+----------------------+----------------------+----------------------+------------+
| FO1 BRANCH RECORD    | E3 DROUET REPORT     | E6A / E6B CANDIDATE  | FINDING    |
| AUTHORED FICTION     | PRIMARY TESTIMONY    | FICTIONAL ANOMALY    |            |
|                      |                      |                      | relation   |
| suspected; stayed on | reported route       | recognition failed / | [supports] |
| Verdun road          | correction near      | correction missing   | [conflicts]|
|                      | Clermont             |                      | [different]|
|                      |                      |                      |            |
| [inspect branch]     | [full excerpt]       | [inspect anomaly]    | [record]   |
+----------------------+----------------------+----------------------+------------+
```

Behavior:

- Source headers remain visible while excerpts scroll.
- The student records a relationship: supports, conflicts, addresses another question, or remains unresolved.
- The system never calls two artifacts independent if both derive from the same source.
- E6A and E6C must be rejected through learner-accessible FO records compared with reviewed historical evidence, not generated character prose.
- A second comparison uses FO2/FO3, E5, and E6C to distinguish a missing warning from a fictional stand-down order.

## 6. Causal Board

```text
+--------------------------------------------------------------------------------+
| CASEBOARD                 evidence tray: [E1] [E3] [E5] [E7]                   |
|                                                                                |
| CONDITIONS       TRIGGER          MECHANISM                     CONSEQUENCE    |
| [constitutional] [suspicion] ---> [route correction] --------> [warning]       |
| [local capacity]                    |                              |             |
|                                     v                              v             |
|                              [redirected pursuit] ---> [collective response]   |
|                                                        /              \        |
|                                      [blocked onward passage] [passport check] |
|                                                                   |            |
|                                                          [guarded detention]   |
|                                                                                |
| relation: enabled / constrained / intensified / contributed to                 |
| selected link: [route correction -> redirected pursuit]                        |
+--------------------------------------------------------------------------------+
```

Behavior:

- Columns have stable widths; nodes do not resize on hover or support-state changes.
- Every link requires a permitted relation and optional evidence pin.
- Dragging has equivalent select-and-place keyboard controls.
- The board does not allow `guaranteed`, `made inevitable`, or sole-cause relationships.
- Blocked onward passage, passport inspection, and guarded detention remain separate nodes. An armed stop is not a deterministic node unless its independent archival support is verified.

## 7. Case Brief

```text
+--------------------------------------------------+-----------------------------+
| CASE BRIEF                                       | REPAIR REQUIREMENTS         |
|                                                  | [x] active anomaly selected |
| active anomaly: [route correction]               | [x] two alternatives rejected|
| required records: [E1] [E2] [E3] [E5] [E7]       | [x] five evidence pins      |
| broader conditions: [constitutional] [local]     | [ ] limited consequence     |
| consequence: [select one bounded claim]           | [x] uncertainty recorded    |
| rejected alternative: [recognition echo]          |                             |
|                                                  | formative argument          |
| argument in your own words                        | feedback unavailable does   |
| [                                                ] | not block repair            |
|                                                  | [return] [review repair]    |
+--------------------------------------------------+-----------------------------+
```

Behavior:

- The right column reports deterministic requirements only.
- The five required records represent three or more independently eligible historical lineages; card count and lineage count are displayed separately where space permits.
- The essay is authentic student work but cannot change repair eligibility.
- Future GPT feedback appears below the essay as formative and can suggest revision without disabling `review repair`.
- Missing requirements direct the student to a reasoning action, not the complete solution.

## 8. Repair And Reconstruction

```text
+--------------------------------------------------------------------------------+
| REPAIR THE ACTIVE LINK                                                         |
|                                                                                |
| announced route: VERDUN ---- X missing correction                             |
|                                      \                                         |
|                                       VARENNES                                 |
|                                                                                |
| [restore correction] -> redirected pursuit -> warning -> collective response  |
|                                                       /                 \       |
|                                     [blocked onward passage] [passport check]  |
|                                                                    |           |
|                                                           [guarded detention]  |
|                                                                                |
| bridge passage: BLOCKED ONWARD ROUTE / not the physical arrest                |
+--------------------------------------------------------------------------------+
```

Behavior:

- The repair is short and tactile, not another form.
- Journey and political-meaning tracks reconstruct in order.
- The counterfactual branch ends in an explicit `UNKNOWN` boundary.
- Source links appear on each reconstructed historical node.
- Reduced motion uses discrete before/after states.
- Blocked onward passage and passport inspection are separate reducer-owned actions that may be restored in either order.
- Requiring both actions is an authored reconstruction of the collective response, not a claim that the sources prove a strict historically necessary pair.
- The two incoming detention links display `contributed to` plus the authored-reconstruction limitation before and after the learner records them.

## 9. Student Debrief

```text
+--------------------------------------------------------------------------------+
| CASE RECONSTRUCTED                                                             |
|                                                                                |
| established             revised                 still uncertain                |
| route correction        warning alone was not   complete private motives       |
| collective detention    sufficient              precise counterfactual future  |
|                                                                                |
| your evidence path      causal board snapshot   formative rubric               |
| [E3] -> [E5] -> [E1]    [open]                  teacher review required         |
|                                                                                |
| [review sources]  [print learning summary]  [finish]                           |
+--------------------------------------------------------------------------------+
```

Behavior:

- Report observable actions and revisions, not personality or ability.
- Separate deterministic completion from future AI-assisted formative rubric feedback.
- State explicitly that teacher review is required before grading use.

## Critical Path

1. Primer.
2. Fracture opening.
3. Guided first source inspection.
4. Open hub with one evidence confrontation.
5. Branch/history comparison eliminating two anomaly candidates, followed by three independent historical evidentiary lines for the restored chain.
6. Causal board construction.
7. Structured Case Brief and optional prose revision.
8. Deterministic repair.
9. Reconstruction and debrief.

Optional conversations and deeper source reading cannot block this path.

## Approval Tests

- The active anomaly is not visually privileged.
- A novice can explain the task after the fracture opening.
- The route map remains central on desktop and tablet.
- Mobile uses task views rather than a compressed dashboard.
- Conversation never becomes the sole source of assessed content.
- Repair requirements are visible without model output.
- The bridge is represented as blocked onward passage, not a literal arrest object.
- Every critical action has keyboard and reduced-motion behavior.
