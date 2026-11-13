# ROUTELESS — Project Specification

**Product:** ROUTELESS — The Last Mile
**Purpose:** Rural student transportation recovery and coordination
**Status:** Deployed and verified — Three.js opening scene, derived network schematic, night/paper operations UI, five scenarios, and the exam-day crisis, published to GitHub Pages by CI
**Nature of the build:** A simulated, local-first decision-support prototype. No live transport data, dispatch, school contact, or authentication exists.

---

## 1. Problem

Rural students depend on a small number of scheduled government buses. When one is cancelled, full, late, broken down, or blocked by a road closure, students have no reliable way to learn what happened or to find approved spare capacity. Schools also lack a single view of which students are stranded and which verified vehicles still have seats.

Bus-tracking products answer "where is the bus?" ROUTELESS answers "the bus failed — what now?"

## 2. Product promise

Turn a student's report into a coordinator-verified disruption, then into a transparent, capacity-respecting recovery plan built only from verified institutional transport. When no safe seat exists, say so and offer an honest school-assistance escalation.

**Non-negotiable safety rules**

- A student report is a signal, never a confirmed incident.
- Only verified, active institution transport can be proposed.
- No overbooking. No invented vehicles or seats.
- No assignment exists without explicit coordinator approval.
- Unserved students must receive a specific reason and an escalation path.
- All demo data is labeled; the app never claims to contact a real school or dispatch a bus.

## 3. Users

### Student (mobile-first)

Wants to know: is my route running, can I report a problem in one or two taps, is there a verified alternative, where and when do I board, and what happens if no vehicle can take me?

### Coordinator

Wants to know: which incidents are reported or confirmed, which students are affected, which verified vehicles have free seats, who can be served before class, and who remains unserved.

The role switch in the header is a **demo view toggle**, not authentication. This is stated in the UI and in the documentation.

## 4. Workflow

```text
Student selects village/student
        │
        ├── sees scheduled service and stop times
        │
        └── one-tap report ──► pending HelpRequest (unverified)
                                   │
Coordinator sees incident queue ◄──┘
        │
        ├── Dismiss ──► incident dismissed, demand no longer counts,
        │               vehicle returns to normal display status
        │
        └── Confirm ──► incident confirmed, vehicle state updated,
                        all requests for that incident count as demand
                                   │
                        Recovery Engine builds a deterministic draft
                                   │
                        Coordinator approves, recomputes, or discards
                                   │
                        Students see proposed, confirmed, or unserved status
                        Unserved students may request school assistance
                                   │
                        Late report after approval ──► supplemental draft
                                   │            (late requests only,
                                   │             leftover capacity only)
                        Coordinator approves the supplement or discards it
                        Approved seats never move
```

## 5. Module status

| Module | Scope | Status |
|---|---|---|
| A — Student interface | Village/student selection, schedule, reporting, request status, pickup card, escalation, approved-plan-aware late-report copy | Implemented |
| B — Coordinator dashboard | Incident queue, verification, demand roster, vehicle inventory, metrics, plan review, scenario switcher | Implemented |
| C — Recovery Engine | Deterministic constraint-aware allocation, approval, and scoped late replanning | Implemented |
| D — Scenario simulator | Breakdown, overcrowding, blocked road, no backup, and exam-day crisis, each a full seed | Implemented and switchable |
| E — Visual layer | Three.js splash, data-driven network schematic, night/paper design tokens, stamp chips, tactical report tiles | Implemented |

## 6. Milestone 1 functional requirements

### 6.1 Shell

- On a browser session's first visit, a full-screen opening scene draws three routes toward campus, breaks one, and draws a mint recovery line. Enter, Esc, or a 6.8-second timer dismisses it; the flag is stored in `sessionStorage`.
- `?intro=1` replays the splash, `?intro=0` hides it, and `?skipIntro=1` bypasses it for demos and headless runs.
- The splash is a modal dialog: `role="dialog"`, `aria-modal`, labelled by the headline, focus on **Enter the demo**, a Tab trap, body scroll lock, and `aria-hidden` on the app behind it. It supplies an SVG fallback and a static final frame under `prefers-reduced-motion`; Three.js is dynamically imported.
- Branded ROUTELESS header with route glyph, name, and "The last mile".
- Sticky night header, demo clock chip (`DEMO 08:00`), Student/Coordinator switch, Reset.
- Top strip: "Simulated demo · No real buses, schools, or student data" (shortened to "Simulated demo · no live data" on mobile).
- Responsive layout: single column on mobile, two-column student layout and 8/4 coordinator layout on desktop.
- Role switch is hidden in the header on mobile and shown as a full-width segmented control beneath it.
- Reset opens a native `<dialog>` confirmation before replacing state.

### 6.2 Student view

- Village selector (A/B/C) and pseudonymous student selector scoped to the village.
- Scheduled service card: vehicle, operator, verified state, stop time, campus time, class start.
- Route rail: village stop → campus, with a dashed danger segment and warning band when the service is disrupted.
- Status strip reflecting `reported`, `confirmed`, `dismissed`, or normal service.
- Five report tiles: bus didn't come (`no_show`), bus was full (`full`), bus is late (`delay`), bus broke down (`breakdown`), road is blocked (`road_block`).
- Reporting creates or updates state; a duplicate report shows a no-duplication notice and changes nothing.
- "Your request" timeline: report received → coordinator review → seat or school help, using the student's own request stage.
- Proposed or confirmed recovery card: vehicle, operator, stop pickup time, campus arrival, accessibility, seat explanation, and an explicit "not held until approved" / "approved by the demo coordinator" note.
- Unserved panel: specific reason plus a Request school assistance action. After escalation it switches to a confirmation that no real school was contacted.
- A scenario ticket card showing derived facts: 12 students on B2, 8 free V1 seats, current report count.
- Honest copy: reports are saved on this device, no school or operator is contacted, no live tracking.

### 6.3 Coordinator view

- Six derived metrics: reports, affected, confirmed incidents, backup seats, placements, unserved, presented in a dark instrument strip with per-cell accent rails.
- A network schematic board derives each village's state from the same metrics helpers as the engine (`usableRescueOptions`, `freeSeats`, `verifiedRescueOptions`): verified seats that reach campus, no verified service, or a blocked corridor. It is labelled "Not GPS", shows no invented links or detours, exposes a text summary via `role="img"`, and scrolls inside its card below 640 px.
- Incident queue with type, vehicle, reporter, time, affected villages, details, status, and Confirm/Dismiss actions; confirmed and reported rows carry a tone rail.
- Confirmed incidents show confirmation time and the consequence ("B2 is marked suspended for planning"; an overcrowding incident says B2 stays in service and offers no recovery capacity).
- Dismissed incidents move to a compact history list.
- Affected demand grouped by village roster: student label, badges (exam, step-free, repeat unserved), report time, and status (`No report`, `Awaiting review`, `Awaiting plan`).
- Transport inventory: verified/unverified chips, derived operating status, departure, campus arrival, free seats, seat meter, notes, a blocked-corridor warning, and a late-arrival warning when campus arrival exceeds the class deadline.
- Recovery plan panel is fully operational: confirmation-gated, draft summary, per-vehicle assignment groups, unserved reasons, approve/recompute/discard, approved lock state, and a late-report callout with a **Plan late requests** action.
- Scenario panel lists all five scenarios as loadable buttons with an `ACTIVE` chip, descriptions, and a confirmation dialog before reseeding.
- Demo boundaries card: schedule-based only, device-local reports, no real dispatch, not authentication.

### 6.4 Recovery engine and approval

- Plans only requests from a **confirmed** incident. An unverified report never allocates a seat.
- Eligible vehicles only: verified, active institution vehicles that serve the student's village, are not blocked by a corridor, offer step-free access when required, and reach campus at or before the student's deadline (class start + regular or exam grace).
- Seats = capacity − occupied − confirmed rescue assignments. Draft assignments do not reserve seats.
- Deterministic priority: exam day first, then more previous unserved days, then fewer viable alternatives, then student ID.
- Each assignment carries an explanation with vehicle, village coverage, pickup and campus times, deadline, seat number, and any priority or accessibility reason.
- Each unserved student carries a specific reason: no verified vehicle, blocked corridor, no step-free vehicle, deadline missed, inactive vehicle, village not served, or capacity exhausted by higher-priority students.
- Approval re-validates incident state, assignment/request membership, every eligibility constraint, unique request/student, and cumulative per-vehicle capacity before mutating. Any failure returns the previous state unchanged.
- An approved plan is final for its own seats. `RUN_RECOVERY` is a no-op once an incident has an approved proposal; the UI locks recompute and shows "Plan approved · seats final".
- A late report stays `pending` and is listed on the approved plan with the student label and report time.
- `RUN_REPLAN` requires a confirmed incident **and** an approved proposal. It replaces only earlier supplemental drafts, scopes the engine to pending late requests plus anything those drafts covered, and stores a `kind: 'replan'` draft with id `prop-{incidentId}-r{n}`. Approved proposals, their assignments, and their requests are never passed to the release step.
- A supplemental draft can be approved with zero seats: an all-unserved outcome is a valid, honest record. Approval still re-checks every constraint and capacity before mutating.
- Discarding a draft returns its covered requests to `pending` and removes its assignments without touching any approved proposal.
- Only an `unserved` request can escalate. Escalation is recorded locally; no real contact occurs. The unserved metric keeps counting escalated students because they still have no seat.

### 6.5 Milestone 3 — switchable scenarios and late replan

- Four scenarios are full seeds of the same roster: breakdown, overcrowding, blocked access road, and no verified backup. Each changes only the incident type/details and the backup van's eligibility. The fifth, `exam_crisis`, is documented in §6.6.
- `LOAD_SCENARIO` is a full reseed that preserves only the active role. It is guarded by a confirmation dialog because it clears reports, drafts, and approved seats.
- `RESET_DEMO` reloads the **active** scenario instead of always restoring breakdown.
- Persistence rejects unknown scenario ids, so `createInitialState(state.scenarioId)` can never receive an unsupported id.
- The scenario ticket on the student view shows the active scenario title and an honest V1 availability value (`0`, `Not verified`, or `Road blocked`) rather than a free-seat number that implies eligibility.
- The run box reports **reachable** spare seats for the incident, and says explicitly that the analysis will still run and mark requests unserved when none can reach the village.
- The coordinator scenario panel shows the active scenario, allows loading another, and states that switching does not edit the current plan.
- Late-report copy distinguishes "no plan yet", "draft under review", and "plan already approved"; it never promises a seat after approval.

### 6.6 Surprise hurdle — exam-day crisis

The fifth scenario, `exam_crisis`, models the exam-day briefing: two government buses unavailable, demand up about 40%, a flooded road to one village, and several students with exams within two hours.

- **Two simultaneous incidents.** `inc-b1-breakdown` (Villages A and B) and `inc-b2-breakdown` (Village C) are both seeded as `reported`. Each is confirmed and planned independently; the recovery panel renders one section per confirmed incident and states that both share one backup fleet.
- **Honest surge.** The seed holds 16 requests (11 on B2, 3 on B1 in Village A, 2 on B1 in Village B). STU-001's report completes the stated 17-student surge; STU-018 is an additional late reporter used to stress the supplemental path. Neither is pre-seeded, and existing requests are not inflated. Five students are marked exam day: STU-003, STU-004, STU-011, STU-014, and STU-016.
- **One verified addition, no invented capacity.** The seed adds V3, an emergency exam-day minibus: verified, active, non-accessible, 14 seats / 6 occupied (8 free), listed for Villages A, B, and C, with corridor `c-east` blocked by the flood. Because Village B uses `c-east`, V3 cannot reach it; V1 serves only Village C. Reachable capacity is therefore 8 seats to Village A and 16 to Village C, and zero to Village B.
- **Flood removes access instead of inventing a detour.** Village B requests are listed unserved with "crosses a blocked corridor". The run box names the reachable and unreachable villages before planning; no alternative road is fabricated.
- **Per-incident plans, shared capacity at approval.** `RUN_RECOVERY` for B1 proposes 3 seats on V3 (STU-014, STU-013, STU-015) and leaves STU-016 and STU-017 unserved. `RUN_RECOVERY` for B2 proposes 12 seats (8 on V1, 4 on V3) with the three Village C exam students first. Drafts hold nothing, so both plans can coexist in draft with an apparent 3 + 12 proposal. Approving either plan re-checks cumulative confirmed seats; the final approved board holds 15 placements, 2 unserved, 0 free on V1, and 1 free on V3 regardless of approval order.
- **Exam priority has limits.** Priority orders each plan, but it cannot invent a route: STU-016 sits an exam and remains unserved because Village B is unreachable.
- **Late report under the crisis.** STU-018 (Village B) reports after approval. `RUN_REPLAN` on B1 creates a supplemental draft with 0 seats and 1 unserved; approving it leaves all 15 confirmed seats byte-identical and raises unserved to 3.
- **Truthful briefing and student facts.** A `ScenarioBriefing` block renders four selected facts (buses out, demand, exams, road) from the scenario catalog with a simulated/demo label. The student ticket is generalized from B2-specific facts to the active route, reachable backup seats for the student's village, exam count, and reports on that route.

## 7. Data model

```ts
type Role = 'student' | 'coordinator'
type IncidentType = 'no_show' | 'full' | 'delay' | 'breakdown' | 'road_block'
type IncidentStatus = 'reported' | 'confirmed' | 'dismissed'
type VehicleStatus = 'active' | 'delayed' | 'cancelled'
type RequestStatus = 'pending' | 'proposed' | 'confirmed' | 'unserved' | 'escalated'
type AssignmentStatus = 'proposed' | 'confirmed' | 'cancelled'
type TransportKind = 'government_bus' | 'institution_vehicle'
type ScenarioId = 'breakdown' | 'overcrowding' | 'road_block' | 'no_backup' | 'exam_crisis'
```

`AppState` contains `schemaVersion`, `scenarioId`, `clockMin`, `role`, `institutionId`, `selectedVillageId`, `selectedStudentId`, and arrays for villages, institutions, students, transport options, incidents, help requests, assignments, and proposals.

A `RecoveryProposal` records `id`, `incidentId`, `createdAtMin`, `status` (`draft | approved | discarded`), an optional `kind` (`initial | replan`; absent on proposals persisted before Milestone 3), the ordered `assignmentIds` it owns, and an `unserved` array of `{ requestId, studentId, reason }`. An `Assignment` records `id`, `requestId`, `studentId`, `transportOptionId`, `status` (`proposed | confirmed | cancelled`), its explanation, and `createdAtMin`.

Entity fields are defined in `src/data/types.ts`. The recovery engine consumes the same entities rather than parallel structures.

### Identity rules

- Students: `stu-001` … `stu-018`, labels `STU-001` … `STU-018`. No real names or contact details.
- Incident: `inc-{transportOptionId}-{type}`.
- Help request: `hr-{studentId}-{incidentId}`.
- Assignment: `asg-{requestId}`.
- Proposal: `prop-{incidentId}` for the initial plan; supplemental proposals use `prop-{incidentId}-r{n}` with `n` incremented per replan. Assignment ids stay `asg-{requestId}`, so a request cannot own two live assignments.
- IDs are deterministic, so repeated actions cannot create parallel duplicates.

## 8. Seed data

- **Villages:** A (`c-north`, 34 min), B (`c-east`, 31 min), C (`c-south`, 38 min).
- **Institution:** Demo District College; class starts 09:00; regular grace 5 min; exam grace 0.
- **B1:** government bus, verified, active, 44 seats / 31 occupied, serves A and B, campus 08:20.
- **B2:** government bus, verified, active, 40 seats / 28 occupied, serves C, campus 08:25 — breakdown incident.
- **V1:** institution van, verified, active, accessible, 12 seats / 4 occupied, serves C, campus 08:52. Free seats = 8.
- **V2:** institution vehicle, **unverified**, 9 seats / 0 occupied, campus 09:05 — visible for context, never eligible.
- **V3 (crisis seed only):** emergency minibus, verified, active, 14 seats / 6 occupied, serves A, B, and C, campus 08:55, corridor `c-east` blocked. Free seats = 8; cannot reach Village B.
- **Students:** 12 on B2 in Village C; 3 each in A and B on B1; STU-018 is the third Village B student added by the crisis seed.
  - STU-003 is on exam day.
  - STU-007 needs a step-free vehicle.
  - STU-004 has 2 previous unserved days; STU-011 has 1.
- **Incident:** B2 disruption, `reported` at 07:58, affected Village C. The incident id and type depend on the active scenario.
- **Requests:** 11 seeded for STU-002…STU-012 at 07:56–07:59. STU-001 has no request, so the demo's first report produces exactly the twelfth.
- **Clock:** fixed demo time 08:00. Not the visitor's real time.

### Scenario seeds

| Scenario | Incident | V1 adjustment | Usable seats |
|---|---|---|---|
| `breakdown` | `inc-b2-breakdown`, `breakdown` | none | 8 |
| `overcrowding` | `inc-b2-full`, `full` | none; B2 stays active | 8 |
| `road_block` | `inc-b2-road_block`, `road_block` | `blockedCorridorIds: ['c-south']` | 0 |
| `no_backup` | `inc-b2-breakdown`, `breakdown` | `verified: false` | 0 |
| `exam_crisis` | `inc-b1-breakdown` + `inc-b2-breakdown`, both `breakdown` | V3 emergency minibus added; V1 unchanged | 8 to Village A, 16 to Village C, 0 to Village B |

The default scenario is `breakdown`. V2 is unverified in every seed. The four original seeds keep the 12-student Village C roster and 11 requests; `exam_crisis` seeds 16 requests across three villages and leaves STU-001 and STU-018 for late reporting.

## 9. State transitions

| Action | Guard | Effect |
|---|---|---|
| `SET_ROLE` | new role differs | switches view only |
| `SELECT_VILLAGE` | village exists | selects village and its first student |
| `SELECT_STUDENT` | student exists | selects student and that student's village |
| `REPORT_PROBLEM` | student and route exist | attaches to the non-dismissed incident for the route, or reopens a dismissed incident of the same type, or creates `inc-{option}-{type}`; deduplicates by student + incident |
| `CONFIRM_INCIDENT` | incident is `reported` | sets `confirmed` + `confirmedAtMin`; breakdown/no-show/road-block → vehicle `cancelled`, delay → `delayed`, full → unchanged |
| `DISMISS_INCIDENT` | incident is `reported` | sets `dismissed`; demands on it stop counting |
| `RUN_RECOVERY` | incident is `confirmed`; no approved proposal exists for it | removes any prior initial plan for the incident, resets its requests to `pending`, builds a deterministic draft for that incident, and stores proposed assignments plus unserved reasons. No-op once any proposal for the incident is approved. Other confirmed incidents are planned separately |
| `RUN_REPLAN` | incident is `confirmed`; at least one proposal is approved; pending late requests exist | replaces only prior `kind: 'replan'` drafts, leaves every approved proposal/assignment confirmed, scopes the engine to pending late requests plus seats they can still use, and stores a supplemental draft `prop-{incidentId}-r{n}`. Never edits approved seats |
| `APPROVE_PROPOSAL` | proposal is `draft`; incident confirmed; every assignment/request valid; all constraints and cumulative capacity re-checked across **all** confirmed seats, including those from other incidents | confirms assignments and requests, marks proposal `approved`; an all-unserved draft is approvable and confirms no seats; any failure is a complete no-op |
| `REJECT_PROPOSAL` | proposal is `draft` | marks it `discarded`, removes its assignments, returns covered requests to `pending`. Rejecting a supplemental draft leaves approved seats untouched |
| `ESCALATE_REQUEST` | request is `unserved` | marks `escalated`; the student remains counted as unserved |
| `LOAD_SCENARIO` | scenario id exists; usually guarded by a confirmation dialog | full reseed of the selected scenario fixture, preserving only `role`; clears reports, drafts, assignments, and selections |
| `RESET_DEMO` | none | replaces state with a fresh seed of the **active** scenario |

A new report after dismissal can reopen a dismissed incident if the reported type matches; otherwise it creates a new incident for the same vehicle. Reopening updates the report time, clears the confirmation time, and preserves existing requests, so a re-report by an already-requesting student cannot inflate demand.

A report filed after approval attaches to the confirmed incident as a `pending` request. `RUN_RECOVERY` will not touch it because an approved plan exists; it waits for `RUN_REPLAN`, which can only allocate seats that are still free.

When two incidents are confirmed (the exam-day crisis), each keeps its own proposal. Drafts are independent and hold nothing. Approval is the atomic point where shared capacity is enforced: approving the second plan re-checks seats already confirmed by the first, so the fleet cannot be overbooked.

## 10. Derived metrics

- `reports` — unique students with a request on a non-dismissed incident.
- `affected` — unique students with a request on a **confirmed** incident. Deduplicated across incidents.
- `confirmedIncidents` — confirmed count over non-dismissed count.
- `freeSeats(vehicle)` — `max(0, capacity − occupiedSeats − confirmed rescue assignments)`.
- `usableRescueOptions(state, villageIds)` — verified, active institution vehicles that serve at least one target village and are not blocked by that village's corridor. The single source of truth for "capacity that can actually reach this incident".
- `backupSeats` — free seats across usable rescue options for confirmed incidents; falls back to all verified rescue options when no incident is confirmed. Road-blocked or unverified capacity contributes zero.
- `confirmedPlacements` — confirmed assignment count.
- `unserved` — requests with status `unserved` or `escalated`. Derived, not a stored counter. Escalation records help requested but does not create a seat.

## 11. Persistence

- Key: `routeless.demo.state.v1`; schema version `1`.
- Written after every state change with try/catch.
- On load: JSON parse, structural validation (schema version, role, `scenarioId` is a known scenario, required arrays, selected IDs exist), otherwise discard and seed.
- An unknown or missing scenario id is rejected rather than coerced, so a stale or hand-edited payload cannot seed an undefined scenario.
- Storage failures degrade to in-memory operation; the footer reports "State saved on this device" or a storage-unavailable message.
- Reset removes reports and selections by replacing the whole state with the active scenario's seed; the persistence effect then writes it.
- Switching scenarios goes through the reducer (`LOAD_SCENARIO`) and is persisted like any other change.
- The splash flag uses a separate sessionStorage key, `routeless.intro.seen`, so showing the intro never touches the demo state and a new browser session replays it.

## 12. Visual system

**Direction — "Dawn dispatch".** The app opens at night on a route lattice, then hands off to a paper operations dossier. The same route-node language recurs in three places: the Three.js splash, the live SVG network board, and the student's vertical route rail. Night means the open decision; paper means the recorded one.

- **Night palette:** `night #061713`, `night-2 #0a241f`, `night-3 #10362f`, mint `#9fe6cc`, gold `#c58a3a`, with paper text at reduced opacities for supporting copy.
- **Paper palette:** paper `#f4f0e6`, paper-2 `#e9e3d4`, surface `#fffdf7`, ink `#14201d`, brand teal `#0e5a54`, deep teal `#07332e`, hairlines `#ded7c7`; warn, danger, and ok keep their soft backgrounds.
- **Type:** Archivo for display headings, Instrument Sans for body copy, IBM Plex Mono for eyebrows, times, seat counts, and stamp chips.
- **Surfaces:** layered paper radial wash plus a faint SVG noise grain; panels use a low shadow with an inset top highlight; dark panels and instrument cells use hairline dividers rather than separate card borders.
- **Stamps:** status chips read as small stamped labels — 5 px radius, 9.5 px mono uppercase, 0.12 em tracking. Metric cells use 27 px mono tabular numerals with a tone rail.
- **Seat meter:** discrete seat squares for vans (≤16 capacity), proportional bar for buses, gradient ticks, and inset shadows.
- **Signature:** the route that breaks and recovers. In the splash it is an animated 3D lattice; in the coordinator board it becomes a derived SVG schematic; in the student card it is the scheduled rail with a dashed danger segment.
- **Student report tiles:** larger tactile targets with an icon plate, title, consequence line, and an arrow that lifts on hover.
- **Splash:** dynamically imported Three.js scene (alpha renderer, DPR capped at 1.75, routes drawn by geometry draw range, ember burst at the break, mint recovery curve, pointer parallax, pause on hidden tab, full geometry/material/texture disposal and `forceContextLoss`). Portrait viewports pull the camera back and centre the campus corridor. `prefers-reduced-motion` renders the final frame once; a static SVG lattice sits behind the canvas as the fallback.
- **Motion:** a short reveal on role change, flowing dashes on a reachable schematic link, pulsing splash beacons, and a progress bar on the splash timer. Reduced motion disables all of it.
- **Accessibility:** visible mint focus ring on night surfaces, modal semantics and focus trap on the splash, keyboard dismissal, 44 px+ primary targets, text summaries for decorative SVG, and no color-only status — every tone is paired with a label.
- **Copy rules:** active voice, sentence case for body copy, mono uppercase eyebrows, no fake live stats, no invented capacity or ETA, no lorem ipsum, and every simulated figure labelled.

## 13. Acceptance criteria — Milestone 1

| Criterion | Verified by |
|---|---|
| App starts and renders without runtime errors | `npm run dev`, headless Chrome run, zero console/page errors |
| Student/Coordinator navigation works | Puppeteer flow and manual screenshots |
| Village selection updates information | A/B switch shows B1; C shows B2 |
| Student can submit a report | Report tile creates state and acknowledgement |
| Repeated reporting does not duplicate | Second tap shows no-duplication notice; request count unchanged |
| Coordinator can confirm or dismiss | Both transitions verified in UI and state |
| State persists after refresh | Request count remains 12 after reload |
| Reset restores seed | 11 reports, incident `reported`, 11 requests |
| 12-student scenario stays consistent | Seed + reducer + metrics tests |
| Demo data clearly identified | Top strip, badges, footer, copy |
| TypeScript build succeeds | `npm run build` |
| No false claims of live integration | UI copy review |

## 14. Acceptance criteria — Milestone 2

| Criterion | Verified by |
|---|---|
| Planning is unavailable until an incident is confirmed | Headless check: "No confirmed disruption" before confirm |
| Twelve affected requests produce 8 proposed seats and 4 unserved | Engine test, reducer test, UI check |
| Priority is exam first, then repeat unserved, then fewest alternatives, then ID | Engine test asserting the exact student order |
| Only verified, active institution vehicles are used | Eligibility tests for unverified, government, inactive, village mismatch, blocked corridor |
| Accessibility and deadlines are enforced | Eligibility tests; STU-007 served by accessible V1; exam deadline checked |
| A draft never deducts capacity | Reducer test + UI check: V1 stays at 8 free |
| Approval confirms 8 seats, leaves 0 free on V1, keeps 4 unserved | Reducer test + UI/state check |
| Approval re-checks capacity and fails safely on stale state | Reducer test: stale capacity approval returns identical state |
| Recompute is idempotent before approval and locked after | Reducer tests |
| Discarding a draft returns all covered requests to pending | Reducer test + UI flow |
| Zero verified capacity yields 0 proposed and 12 unserved with reasons | Engine test |
| Student sees proposed, confirmed, or unserved status with real times | Headless student checks at 1440 px and 375 px |
| Only unserved students can escalate; escalation contacts nobody | UI check + state check; copy review |
| Escalated students remain counted as unserved | Metrics test |
| Reset clears proposals and assignments and releases seats | Headless reset check |
| No console/page errors, no horizontal overflow at 375 px | Headless verification |

## 15. Acceptance criteria — Milestone 3

| Criterion | Verified by |
|---|---|
| Four scenarios are switchable and each fully reseeds the same Village C roster | Headless scenario switches; reducer tests assert cleared incidents/requests/proposals |
| Switching preserves only the coordinator/student view and is guarded by a confirmation dialog | UI check; reducer test |
| Breakdown and overcrowding expose 8 usable V1 seats; overcrowding keeps B2 active | Headless state + inventory check; metric tests |
| Road block removes V1 from usable capacity without inventing a detour | Headless check: V1 verified but access road blocked, 0 usable seats, 11 unserved |
| No-backup scenario exposes one unverified V1 and zero usable seats | Headless ticket shows `Not verified`; 0/11 plan with reasons |
| Backup-seat metric counts only capacity that can reach a confirmed incident | Metric tests (breakdown 8 → road_block 0, no_backup 0) |
| Unknown scenario ids are rejected on load | Persistence test |
| A report filed after approval stays pending and cannot alter approved seats | Headless check: approved proposal/assignment IDs byte-identical |
| `RUN_REPLAN` creates a supplemental draft scoped to late requests only | Reducer test + headless `Plan late requests` flow |
| Rejected supplemental drafts leave approved seats untouched | Reducer test |
| Approving a supplemental plan confirms only what new capacity allows | Headless check: 0 seats / 1 unserved confirmed, merged summary |
| Student copy explains that a late report waits for a supplemental plan | Headless copy check |
| Reset and reload keep the active scenario | Headless reset + reload check |
| No console/page errors, no horizontal overflow at 375 px | Headless verification (60/60 checks) |

## 16. Acceptance criteria — exam-day crisis

| Criterion | Verified by |
|---|---|
| The crisis is a loadable scenario with four briefing facts: buses out, demand, exams, road | `crisis.test.ts` meta test; headless briefing check |
| The seed holds two reported breakdown incidents, 16 requests, and a verified emergency minibus | `crisis.test.ts` seed tests; headless state check |
| Five students are marked exam day and demand is split 5 on B1 / 11 on B2 before the late report | `crisis.test.ts` surge test |
| Confirmation yields 17 affected students, 2 confirmed incidents, and 16 reachable backup seats | `crisis.test.ts`; headless metrics check |
| The minibus is verified and active but cannot reach flooded Village B | Seed test plus headless run-box copy |
| B1's plan proposes 3 seats to Village A and leaves both Village B students unserved with a blocked-corridor reason | Engine test; headless draft checks |
| B2's plan proposes 12 seats, leads with the three Village C exam students, and uses 8 on V1 + 4 on V3 | Engine test; headless draft check |
| Drafts hold nothing across both incidents | Reducer/engine test; headless free-seat check |
| Approving both plans yields 15 placements, 2 unserved, V1 0 free, V3 1 free | Reducer test; headless approval check |
| The shared fleet is never overbooked regardless of approval order | Reducer test pattern; shared-fleet callout; headless capacity check |
| A Village A student sees a confirmed V3 seat; a Village B exam student sees the blocked-corridor reason | `studentView` test; headless student checks |
| A late Village B report produces a 0-seat / 1-unserved supplemental draft and leaves confirmed seats byte-identical | Reducer test; headless late-replan check |
| Approving the supplement reaches 15 placed / 3 unserved | Reducer test; headless metric check |
| The crisis survives reload and reset reseeds the active crisis | Headless reload + reset checks |
| No console/page errors, no horizontal overflow at 375 px | Headless verification (58/58 checks) |

## 17. Acceptance criteria — visual overhaul

| Criterion | Verified by |
|---|---|
| Splash appears on a fresh session and is dismissed by Enter, Esc, its button, or the 6.8 s timer | `intro.test.ts`; 29-check headless visual suite |
| `?intro=1` replays, `?intro=0` hides, `?skipIntro=1` bypasses, and the session flag persists | Unit tests plus headless parameter and reload checks |
| Splash is a modal with focus trap, labelled headline, scroll lock, and the app hidden from assistive tech | Headless semantics, focus, and Tab checks |
| Reduced motion renders the scene statically and still shows the splash | Headless `prefers-reduced-motion` emulation |
| A missing WebGL context falls back to the SVG lattice and still enters the demo | Headless run with WebGL disabled; zero page errors |
| Network schematic statuses are derived, labelled, and invent no link or detour | Headless copy and `aria-label` checks; metrics unit tests |
| Splash and schematic introduce no horizontal page overflow at 375 px; the schematic scrolls inside its card | Headless 375 px measurements |
| All pre-existing flows and safety constraints still behave identically | 105 unit tests; 203 flow assertions; build, typecheck, lint |
| Three.js stays out of the main bundle | Production build output: separate dynamic `introScene` chunk |

## 18. Deployment

- The site is published at https://udbhavnc7.github.io/routeless/ from the public repository `udbhavnc7/routeless`.
- `.github/workflows/deploy.yml` runs on every push to `main` and on manual dispatch: checkout, Node 22 with npm cache, `npm ci`, lint, unit tests, production build with `BASE_PATH=/routeless/`, Pages configuration, artifact upload, and deployment.
- Lint, test, or build failures block deployment. The deploy job receives only `pages: write` and `id-token: write`; repository contents stay read-only.
- Vite's `base` comes from `BASE_PATH`, defaulting to `/` for local development and preview. Asset URLs in the built HTML therefore resolve under the project subpath.
- Pages is enabled once with **GitHub Actions** as the source. The workflow deliberately does not attempt to create the Pages site, because `GITHUB_TOKEN` cannot perform that administrative call; `configure-pages` only reads the existing configuration.
- There is no backend, environment variable, secret, or build-time data source. The deployed build is the same static client used locally, with the same simulated-data disclosures.
- A deployment is verified by HTTP status for the HTML, JS, CSS, and favicon, plus an 11-check headless run against the live URL covering the splash, role switch, schematic, disclosures, and mobile overflow.

## 19. Out of scope for this build

Real authentication, backend, maps, routing or detour search, live feeds, notifications, payments, LLM triage, CSV import/export, revocation or movement of approved seats, cross-incident repacking of approved plans, and cross-device sync.

## 20. Future integration notes

The data layer is intentionally separable: `AppState` and domain helpers have no React or storage dependencies. A real backend could replace `persistence.ts` with an API adapter while keeping the reducer's transitions. Before any pilot: authenticated school roles, server-side capacity transactions, audit logs, consent and minors' data policy, and verified operator onboarding. None of that exists in this prototype.
