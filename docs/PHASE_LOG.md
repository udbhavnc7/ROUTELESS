# Phase Log

Chronological record of what was implemented across Milestones 1–3 and the exam-day crisis surprise hurdle, and what was actually verified.

Environment: Windows 11, Git Bash, Node.js/npm, Chrome headless for UI verification.

---

## Phase 1 — Project foundation

**Completed**

- Initialized Vite + React + TypeScript in the workspace without overwriting the attached brief files.
- Added Tailwind CSS v4 via `@tailwindcss/vite`, Lucide React, and Vitest.
- Added `dev`, `build`, `test`, `test:watch`, `preview`, and `lint` scripts.
- Added self-hosted fonts: Archivo Variable, Instrument Sans Variable, IBM Plex Mono.
- Replaced the default Vite screen with the ROUTELESS shell: top simulated-demo strip, branded header, demo clock, role switch, reset action, footer storage status.
- Defined the visual system in `src/index.css` using `@theme` tokens, focus-visible styling, dialog backdrop, reduced-motion handling, and the ticket-notch treatment.

**Files**

`index.html`, `public/favicon.svg`, `src/index.css`, `src/main.tsx`, `src/App.tsx`, `src/lib/cn.ts`, `src/components/AppHeader.tsx`, `BrandMark.tsx`, `Button.tsx`, `ConfirmDialog.tsx`, `RoleSwitch.tsx`, `PageHeader.tsx`, `Panel.tsx`, `StatusChip.tsx`.

**Verification**

- `npm run build` succeeded after fixing one unused-import error.
- Header and shell rendered in desktop and mobile screenshots.

---

## Phase 2 — Typed data and seeded scenario

**Completed**

- Domain types for village, institution, student, transport option, incident, help request, assignment, recovery proposal, scenario, and `AppState`.
- Deterministic ID builders and 24-hour demo time formatting.
- Seed with three villages, one institution, 18 pseudonymous students, four transport options, one reported B2 breakdown, and eleven pre-seeded requests.
- STU-001 intentionally has no request; the first student report becomes the twelfth without double-counting.
- Scenario catalog labels the breakdown as available and the other three as planned.

**Files**

`src/data/types.ts`, `demoFixtures.ts`, `scenarios.ts`, `labels.ts`, `schema.ts`, `src/domain/ids.ts`, `src/domain/time.ts`.

**Verification**

- Seed inspection and unit assertions: V1 has 8 free seats; 11 requests; incident is `reported`; B2 is active until confirmation.

---

## Phase 3 — Canonical store and persistence

**Completed**

- `useReducer` transitions for role, village, student, reporting, confirmation, dismissal, escalation, and reset.
- Context provider with lazy hydration from `localStorage`.
- Versioned persistence with structural validation, stale-schema rejection, and try/catch guards on read, write, and clear.
- Storage status exposed to the footer.

**Files**

`src/state/reducer.ts`, `store.tsx`, `persistence.ts`.

**Verification**

- Persistence tests: valid seed accepted; null, arrays, unrelated objects, stale schema, missing selected student, and missing arrays rejected.
- Reducer tests: one request, duplicate prevented, no auto-confirm, reset equality.

---

## Phase 4 — Student journey

**Completed**

- Student and village selectors.
- Scheduled service card with operator verification, stop time, campus time, and class start.
- `RouteRail` with dashed disruption segment and warning band.
- Status strip for reported, confirmed, dismissed, and normal service.
- Five one-tap report tiles and a no-duplication notice.
- Request timeline derived from the student's own request stage, not the route's incident.
- Scenario ticket card with derived counts (12 on B2, 8 V1 free seats, current reports).
- Conditional school-assistance panel wired to the `escalated` state, not shown until a request is unserved.

**Files**

`src/pages/StudentHome.tsx`, `src/components/RouteRail.tsx`.

**Verification**

- Headless flow: report creates the 12th request, repeated report shows "Nothing was duplicated", count stays 12.
- Village A/B switch shows B1; Village C shows B2.
- Stage chip shows "No report yet" for a student without a request even when the route has a reported incident.

---

## Phase 5 — Coordinator foundation

**Completed**

- Six metric tiles derived from state.
- Incident queue with Confirm/Dismiss, status chips, confirmation consequence, and dismissed history.
- Demand roster grouped by village with exam, accessibility, and repeat-unserved badges.
- Transport inventory with derived operating status, seat meters, free seats, verification badges, and late-arrival warnings.
- Disabled recovery-analysis placeholder listing future constraints.
- Scenario roadmap and demo-boundary card.

**Files**

`src/pages/CoordinatorDashboard.tsx`, `src/components/SeatMeter.tsx`.

**Verification**

- Confirm sets incident to `confirmed`, affected to 12, and B2 to `SUSPENDED` / `cancelled`.
- Dismiss returns affected to 0 and B2 to `OPERATING`, and marks the incident `dismissed` in state.
- Recovery button is natively disabled and labeled as a placeholder.

---

## Phase 6 — QA, fixes, and documentation

**Fixes during QA**

1. Removed an unused label import that broke `tsc -b`.
2. Fixed student stage derivation: a route-level incident no longer marks an unreported student as having reported.
3. Added `proposed` and `unserved` stages to the student chip map.
4. Guarded timeline step two so it no longer says "Waiting for the demo coordinator" when the selected student has no request.
5. Made the report section copy respond to incident state (unreported, reported, confirmed).
6. After confirmation, a new report now says the request joined a confirmed disruption and that no seat is held until approval, instead of claiming a coordinator still needs to review it.
7. Replaced student-facing "not part of this milestone" copy with "No alternative seat has been assigned in this demo."
8. Split the store context/hook into `src/state/context.ts` so `store.tsx` only exports a component (clean Fast Refresh).
9. Moved storage status to a small external store read with `useSyncExternalStore`, removing a setState-in-effect warning without weakening persistence.
10. Keyed the student report notice to the selected student instead of clearing it in an effect, so switching profiles can never show a stale notice.

**Commands and actual results**

| Command | Result |
|---|---|
| `npm run test` | 3 files, 24 tests passed |
| `npm run build` | `tsc -b` and `vite build` succeeded; main JS 279.42 kB (84.79 kB gzip), CSS 36.34 kB (7.35 kB gzip) |
| `npm run lint` | 0 warnings, 0 errors on 32 files |
| `node .screenshots/verify.mjs` | 32/32 interaction checks passed; zero console/page errors |
| Mobile viewport check | 375 px: `scrollWidth === clientWidth === 375`; no horizontal overflow |
| Reload check | 12 requests persisted after refresh |
| Reset check | Restored 11 requests, `reported` incident, 12-student roster |
| Dismiss/reopen check | Dismissed incident returned to 0 affected; a fresh breakdown report reopened it with 12 requests and one request per student |

**Verification method**

Headless system Chrome driven by `puppeteer-core` (installed with `--no-save`; not part of project dependencies). Screenshots were reviewed at 1440 px and 375/390 px.

---

## Phase 7 — Deterministic recovery engine

**Completed**

- `eligibility.ts`: pure hard-constraint evaluation per student and vehicle, with ordered rejection codes: institution vehicle, verified, active, village served, corridor open, accessibility, deadline, seats left.
- `recoveryEngine.ts`: deterministic plan builder. Only confirmed incidents; requests in `pending | proposed | unserved`; priority by exam day, previous unserved days, fewest viable alternatives, then student ID.
- Seats are initialized from confirmed free seats and decremented locally per run. Each assignment receives a human-readable explanation with vehicle, village, pickup/campus times, deadline, seat number, repeat priority, and accessibility.
- Every unserved student receives a reason; capacity exhaustion now reads remaining seats from the same local run, so it correctly says higher-priority students consumed them.

**Tests written first (RED)** — `eligibility.test.ts` (10) and `recoveryEngine.test.ts` (11), covering every rejection, exact priority order, explanations, determinism, reduced capacity, and zero verified capacity (0/12).

**Files**

`src/domain/eligibility.ts`, `src/domain/recoveryEngine.ts`, `src/tests/eligibility.test.ts`, `src/tests/recoveryEngine.test.ts`, `src/tests/helpers.ts`.

**Verification**

- 21 engine/eligibility tests pass.
- The 12-request scenario produces exactly 8 assignments (`stu-003, stu-004, stu-011, stu-001, stu-002, stu-005, stu-006, stu-007`) and 4 unserved (`stu-008, stu-009, stu-010, stu-012`).
- Zero verified capacity produces 0 assignments and 12 reasons referencing no verified vehicle.

---

## Phase 8 — Approval reducer

**Completed**

- `RUN_RECOVERY`: confirmed incidents only; refuses when an approved plan exists; removes prior draft/discarded plans and their assignments; resets covered requests to pending; stores a new draft proposal.
- `APPROVE_PROPOSAL`: validates proposal status, incident confirmation, every assignment and request, uniqueness, current eligibility, and cumulative per-vehicle capacity. Any failure returns the previous state unchanged.
- `REJECT_PROPOSAL`: discards the draft, removes its assignments, returns covered requests to pending.
- `ESCALATE_REQUEST` is now reachable from the student UI; escalated students remain counted as unserved.

**Tests written first (RED)** — `recoveryReducer.test.ts` (11): gating, draft shape, capacity invariance, idempotent recompute, approval, second approval no-op, stale-capacity failure, rejection, run-after-approval block, replan after rejection, unknown IDs. Added a metrics test proving escalation does not reduce the unserved count.

**Files**

`src/state/reducer.ts`, `src/domain/metrics.ts`, `src/tests/recoveryReducer.test.ts`, `src/tests/metrics.test.ts`, `src/tests/helpers.ts`.

**Verification**

- 57 tests across 6 files pass.
- Draft leaves V1 at 8 free; approval confirms 8, leaves 0 free, and reports 4 unserved.
- A stale approval returns the identical state object (no partial mutation).

---

## Phase 9 — Proposal review UI, student outcomes, and QA

**Completed**

- Full-width **Recovery plan** panel on the coordinator board:
  - Gated empty state before confirmation.
  - Run action with affected count, verified spare-seat count, and priority explanation.
  - Draft: 8 proposed / 4 unserved / source count, assignments grouped by vehicle with student badges, stop and campus times, and explanations; unserved list with reasons; Approve / Recompute / Discard.
  - Approved: confirmed counts, grouped confirmed seats, unserved list, locked recompute, and capacity-deduction copy.
  - Discarded: requests back to pending with a re-run action.
- Student view: proposed and confirmed pickup cards (vehicle, operator, stop time, campus time, explanation, accessibility, approval state), specific unserved reason, and an honest post-escalation confirmation.
- Coordinator header copy updated from "allocation is next milestone" to the active approval workflow; obsolete placeholder removed.
- Student status strip and timeline now reflect proposed, confirmed, unserved, and escalated states with real times.

**Fixes during QA**

1. Unserved capacity reasons used free seats rather than the run's remaining seats, producing "no remaining verified seats" instead of "allocated to higher-priority students"; passed the local remaining map into the reason builder and changed the test to assert the stronger copy.
2. PlanStat grammar: "1 vehicles used" → singular when one vehicle.
3. Escalation initially reduced the unserved metric to 3 while the plan still reported 4 without seats; the metric now counts `unserved` and `escalated`.

**Files**

`src/components/RecoveryPanel.tsx`, `src/pages/CoordinatorDashboard.tsx`, `src/pages/StudentHome.tsx`, `src/domain/studentView.ts`, `src/tests/helpers.ts`, `.screenshots/verify-m2.mjs`.

**Commands and actual results**

| Command | Result |
|---|---|
| `npm run test` | 6 files, 57 tests passed |
| `npm run build` | `tsc -b` and `vite build` succeeded |
| `npm run lint` | 0 warnings, 0 errors on 39 files |
| `node .screenshots/verify-m2.mjs` | 53/53 interaction checks passed; zero console/page errors |
| `node .screenshots/verify.mjs` | 32/32 Milestone 1 regression checks passed |
| Mobile viewport check | 375 px: `scrollWidth === clientWidth === 375` on coordinator and student views |
| Reset check | Restored 11 requests, cleared proposals/assignments, released V1 to 8 free seats |

**Verification method**

Headless system Chrome driven by `puppeteer-core` (installed with `--no-save`; not part of project dependencies). Screenshots reviewed at 1440 px and 375 px: draft, approved, student unserved, and student confirmed.

---

## Milestone 2 exit state

**Working**

- Everything in Milestone 1 plus deterministic 12 → 8 → 4 planning, approval with atomic re-checks, rejection/replan, confirmed pickup details, specific unserved reasons, and honest escalation.
- Persistence covers proposals and assignments; reset clears them.

**Deliberately not working yet**

- Other switchable scenarios, late-report replanning after approval, real dispatch/contact, deployment.

**Outstanding for later milestones**

- Scenario fixtures for overcrowding, blocked road, and zero backup (engine behavior already tested).
- Late-report/replan flow that never silently changes approved seats.
- Accessibility and interaction polish pass; public deployment and repository (Milestones 6–7).

---

## Phase 10 — Switchable scenario fixtures

**Completed**

- `demoFixtures.ts` now builds four scenario seeds: `breakdown`, `overcrowding`, `road_block`, and `no_backup`. Each reseeds the same Village C roster, B1/B2/V1/V2 fleet, 11 requests (STU-002…STU-012), and STU-001 unreported.
- `overcrowding` uses `inc-b2-full` and keeps B2 active; `road_block` keeps V1 verified but adds `blockedCorridorIds: ['c-south']`; `no_backup` marks V1 unverified. The scenario table in the spec documents each adjustment and its usable capacity (8, 8, 0, 0).
- `scenarios.ts` exports the catalog, seed lookup, and `isScenarioId` guard; the old "planned/NEXT" labels were removed.
- `LOAD_SCENARIO` performs a full reseed preserving only `role`; `RESET_DEMO` reloads the active scenario.
- Persistence validates `scenarioId` against the catalog and rejects unknown ids instead of coercing them.
- `dashboardMetrics.backupSeats` was scoped to capacity that can reach a confirmed incident (`usableRescueOptions`), so the dashboard, run box, and engine agree.

**Tests written first (RED)** — `scenarios.test.ts` (12): seed identity per scenario, roster consistency, request counts, capacity differences, `LOAD_SCENARIO` clearing reports/drafts/assignments, role preservation, reset behavior, unknown-id rejection in persistence. Two `metrics.test.ts` additions: reachable backup seats and unverified-only backup.

**Files**

`src/data/demoFixtures.ts`, `src/data/scenarios.ts`, `src/state/reducer.ts`, `src/state/persistence.ts`, `src/domain/metrics.ts`, `src/tests/scenarios.test.ts`, `src/tests/metrics.test.ts`.

**Verification**

- Red observed for `road_block` backup seats (8 instead of 0) before the reachability change.
- All four seeds produce the expected incident, vehicle status, and usable-capacity profile.

---

## Phase 11 — Late-report replan without moving approved seats

**Completed**

- `RUN_RECOVERY` is a no-op when any proposal for the incident is approved.
- `RUN_REPLAN` requires a confirmed incident, at least one approved proposal, and pending late requests. It replaces only prior `kind: 'replan'` drafts, scopes the engine to pending late requests, and stores `prop-{incidentId}-r{n}` with `kind: 'replan'`.
- Approved proposals, their assignments, and confirmed requests are never edited by a replan. Supplemental approval re-runs the same atomic constraint and capacity checks. An all-unserved supplemental draft is approvable and confirms zero seats.
- Rejecting a supplemental draft returns only its covered late requests to `pending`, leaving approved seats untouched.
- Plan state (`none | draft | approved`) now drives honest student copy for late reporters: the report waits for a supplemental plan that only uses seats still free.

**Tests written first (RED)** — `replan.test.ts` (12): block initial recovery after approval, supplemental draft shape and id, approved-state invariance, scope limited to late requests, replan idempotence, reject leaves approved seats, approve confirms only available seats, all-unserved approval, no late requests no-op, unconfirmed incident block, second supplemental numbering.

**Files**

`src/state/reducer.ts`, `src/domain/recoveryEngine.ts`, `src/domain/studentView.ts`, `src/domain/metrics.ts`, `src/tests/replan.test.ts`, `src/tests/helpers.ts`.

**Verification**

- Approved proposal and assignment IDs are byte-identical before and after a replan.
- With 11 requests the initial plan is 8/3; a late STU-001 report on a full fleet produces a supplemental draft with 0 seats and 1 unserved reason.

---

## Phase 12 — Scenario switcher, replan UI, and QA

**Completed**

- Coordinator scenario panel: four clickable cards with `ACTIVE`/`LOAD` chips, `aria-pressed`, and a confirmation dialog that warns the switch clears reports, drafts, and approved seats. The dialog keeps the coordinator view; Reset returns to the student view.
- Recovery panel handles initial drafts, approved plans, supplemental drafts, and late-pending callouts, with merged confirmed rows across proposals and a "Includes N supplemental plan(s)" summary.
- Blocked-corridor inventory warning ("access road blocked… not eligible for recovery"); the duplicate vehicle note is suppressed in that state.
- Student view: scenario-aware ticket heading and facts (`V1 availability`: seats / `Not verified` / `Road blocked`), type-aware confirmed headline, and late-report copy in the report notice, timeline, and recovery summary.
- Header reset dialog names the active scenario.

**Fixes during QA**

1. Scenario-switch check failed only because Tailwind uppercases `ACTIVE` in `innerText`; the assertion now compares lowercase text.
2. Road-block view showed both the vehicle note and the new blocked-corridor warning; the note is hidden when a blocked warning exists.
3. Dashboard reported 8 backup seats in the road-block scenario; the metric now counts reachable capacity only (TDD-first).

**Files**

`src/components/RecoveryPanel.tsx`, `src/components/AppHeader.tsx`, `src/pages/CoordinatorDashboard.tsx`, `src/pages/StudentHome.tsx`, `src/tests/metrics.test.ts`, `.screenshots/verify-m3.mjs`.

**Commands and actual results**

| Command | Result |
|---|---|
| `npx vitest run` | 8 files, 85 tests passed |
| `npx tsc -b` | clean |
| `npm run lint` | 0 warnings, 0 errors on 41 files |
| `npm run build` | `tsc -b` and `vite build` succeeded (JS ~308.55 kB, CSS ~37.96 kB) |
| `node .screenshots/verify-m3.mjs` | 60/60 interaction checks passed; zero console/page errors |
| Mobile viewport check | 375 px: no horizontal overflow on coordinator and student views |

**Verification method**

Headless system Chrome driven by `puppeteer-core` (`--no-save`, not a project dependency). Screenshots 16–21 reviewed at 1440 px and 375 px: supplemental draft, approved merge, road-block inventory, no-backup ticket, overcrowding plan, mobile coordinator view.

---

## Milestone 3 exit state

**Working**

- Everything in Milestones 1–2 plus four switchable scenarios, reachable-capacity metrics, and a late-report supplemental replan that never edits approved seats.
- Scenario switches and resets persist; reload restores the active scenario.

**Deliberately not working yet**

- Moving or revoking an approved seat, multi-incident planning in one showcase, real dispatch/contact, deployment.

**Outstanding for later milestones**

- Optional revocation/transfer flow with explicit audit copy.
- Accessibility and interaction polish pass; public deployment and repository (Milestones 6–7).

---

## Phase 13 — Exam-day crisis seed and briefing

**Context**

The attached Surprise Hurdle brief describes two government buses unavailable, a 40% demand surge, a flooded road between villages, several students with exams within two hours, and a 100-minute working-solution budget. The response had to add genuine constrained capacity, never invent a route, and keep every allocation deterministic and approvable.

**Completed**

- Added `exam_crisis` to `ScenarioId` and the scenario catalog, with an optional `briefing` array of `{ label, value, detail }` four facts: buses out (B1 + B2), demand (17 students, about 40% above the usual 12), exams (5 at 09:00), and road (Village B flooded, no verified detour).
- Refactored the seed builder to support multiple requested incidents (`SeedIncident[]`), an optional emergency minibus, a crisis exam roster, and network-wide demand.
- Crisis seed: two `reported` breakdown incidents (`inc-b1-breakdown` for Villages A and B, `inc-b2-breakdown` for Village C), 16 requests split 5 on B1 and 11 on B2, and STU-001 plus STU-018 left unreported so 17 demand is reached by reporting.
- Added V3, a verified emergency exam-day minibus: 14 seats / 6 occupied, serves A/B/C, campus 08:55, corridor `c-east` blocked. Reachable capacity is 8 to Village A, 16 to Village C, and 0 to Village B.
- Marked STU-003, STU-004, STU-011, STU-014, and STU-016 as exam day; existing accessibility and repeat-unserved flags remain.
- Added `ScenarioBriefing`, a warning-toned four-column fact block shown on both views for any scenario that supplies a briefing.

**Tests written first (RED)** — `crisis.test.ts` (12): catalog briefing, two-incident seed and request split, exam roster, V3 eligibility and blocked corridor, 17 affected after confirmation, B1 and B2 plans, draft invariance, approved shared-fleet totals, student outcomes, late Village B replan, and crisis load.

**Files**

`src/data/types.ts`, `src/data/scenarios.ts`, `src/data/demoFixtures.ts`, `src/components/ScenarioBriefing.tsx`, `src/pages/StudentHome.tsx`, `src/pages/CoordinatorDashboard.tsx`, `src/tests/crisis.test.ts`.

**Verification**

- RED observed first: the placeholder crisis seed produced 11 failures (one incident, 11 requests, no V3). After the fixture refactor, 97/97 tests passed.
- One expectation was corrected after RED: exam priority is followed by previous-unserved days, so Village C leads with STU-004, STU-011, STU-003, matching decision D18.

---

## Phase 14 — Multi-incident planning and shared capacity

**Completed**

- Kept the reducer's per-incident proposal model: each confirmed incident runs and approves its own plan.
- Relied on approval-time capacity re-validation across all confirmed seats, so the second plan cannot overbook seats confirmed by the first.
- Added a shared-fleet callout to the recovery panel when more than one incident is confirmed, explaining separate plans and cumulative approval checks.
- Expanded the run box from one village to a per-village reachability summary: reachable seat count and served village names, plus explicit danger lines for blocked and unserved villages. No detour is suggested.
- Filtered demand-group requests through the roster ids so Village A's group shows only its own reports when demand spans multiple villages.

**Verification**

- Engine outcome: B1 proposes 3 seats on V3 and 2 unserved; B2 proposes 12 seats (8 V1 + 4 V3) and 0 unserved. Drafts hold nothing.
- Approval outcome: 15 placements, 2 unserved, V1 0 free, V3 1 free. Approving in either order produces the same totals.
- STU-013 is confirmed on V3; STU-016 (exam day, Village B) is unserved with the blocked-corridor reason.
- A late STU-018 report produces a 0-seat / 1-unserved supplemental draft; approving it raises unserved to 3 and leaves the 15 confirmed seats unchanged.

---

## Phase 15 — Crisis UI, student facts, and QA

**Completed**

- Crisis briefing rendered on both coordinator and student views with a simulated label and no live-feed claims.
- Student scenario ticket generalized from B2-specific facts: demo clock, class start, students on the active route, reachable verified seats for the selected village, exams today, and reports on the active route. Verified-backup copy now pluralizes ("1 seat reaches A", "0 seats reach B").
- Coordinator metrics, incident queue, demand roster, inventory, and recovery panel all render two confirmed incidents correctly.
- Updated README, project spec, decisions, and prompt iterations for the crisis.

**Fixes during QA**

1. Demand roster grouped requests by incident only; a multi-village incident could show Village B reports under Village A. Filtered by roster ids.
2. Student backup copy read "1 seats reach A"; corrected to singular/plural.
3. Headless verification initially failed because it expected V1 to serve Village A; V1 serves Village C only, so B1 correctly sees 8 reachable seats on V3.
4. The crisis verification initially omitted STU-001's report, producing 11 B2 requests instead of 12; the flow now reports as STU-001 first.
5. Student selection in the headless script must switch the demo village first because the selector is scoped to the active village.

**Commands and actual results**

| Command | Result |
|---|---|
| `npx vitest run` | 9 files, 97 tests passed |
| `npx tsc -b` | clean |
| `npm run lint` | 0 warnings, 0 errors on 43 files |
| `npm run build` | `tsc -b` and `vite build` succeeded; JS 313.40 kB (92.56 kB gzip), CSS 38.50 kB (7.57 kB gzip) |
| `node .screenshots/verify-m4.mjs` | 58/58 interaction checks passed; zero console/page errors |
| Mobile viewport check | 375 px: `scrollWidth === clientWidth === 375` on coordinator and student crisis views |
| Reload check | Crisis scenario, 15 confirmed seats, and 3 approved proposals persisted |
| Reset check | Reseeded the active crisis scenario: 16 requests, no assignments, minibus restored |

**Verification method**

Headless system Chrome driven by `puppeteer-core` (`--no-save`, not a project dependency). Screenshots 22–26 reviewed: crisis briefing, both approved plans, Village B unserved student, mobile crisis dashboard, mobile crisis student view.

---

## Surprise hurdle exit state

**Working**

- Everything in Milestones 1–3 plus a five-scenario catalog, the exam-day crisis with two incidents, a verified emergency minibus, per-village reachability, shared-capacity approval, and late-report handling inside the crisis.
- The crisis produces 15 placements and 2 unserved (3 after the late Village B report) without inventing capacity, a route, or an approval.

**Deliberately not working yet**

- Cross-incident repacking of approved plans, detour search, live feeds, real dispatch/contact, deployment.

**Outstanding for later milestones**

- Deployment and public repository.
- Accessibility and interaction polish across both views.
- Optional coordinator review flow for changed crisis conditions, still with explicit approval.

---

## Phase 16 — Splash, schematic, and the visual overhaul

**Completed**

- Wrote `src/tests/intro.test.ts` first (8 tests) for splash gating: first visit, seen flag, `skipIntro=1`, `intro=0`, `intro=1`, unrelated parameters, a safe `markIntroSeen` when storage throws, and a duration inside the 5–9 s band. RED failed on the missing `../lib/intro` module; `src/lib/intro.ts` then made all 8 green.
- Built the Three.js opening scene in `src/three/introScene.ts`: a dark ground grid, three villages and a gold campus beacon, Catmull-Rom routes that draw in sequence, a break flash with an X and ember burst, a mint recovery curve, travelling bus markers, drifting dust, pointer parallax, and a camera push-in. Reduced motion renders the final frame once. The scene disposes every tracked GPU resource and forces context loss on unmount.
- Built `IntroSplash.tsx`: modal semantics, focus on **Enter the demo**, Enter/Esc dismissal, a Tab trap, body scroll lock, a 6.8 s timer with progress bar, an always-present SVG lattice fallback, and a dynamic import so Three.js lands in its own chunk. Replays are controlled with `?intro=1`, `?intro=0`, and `?skipIntro=1`; the flag is sessionStorage.
- Built `NetworkSchematic.tsx`: a data-driven SVG board derived from `usableRescueOptions`, `freeSeats`, and `verifiedRescueOptions`, with per-village tones, corridor X marks, a campus diamond, a three-cell status strip, a legend, and a `role="img"` text summary. It states "Not GPS" and never draws an invented link.
- Rebuilt the visual system around the "Dawn dispatch" direction: night shell and masthead, paper operations canvas with grain, new night/mint/gold/paper tokens, stamp chips, panel shadows, instrument metrics, tactile report tiles, a dark scenario card for the active seed, a dark demo-boundaries card, and a restyled confirm dialog.
- Rewired both pages: the student service card now opens on a dark night header and stacks its chips on mobile; the coordinator adds the operations instrument strip, schematic, tone-railed incident rows, and scenario/demand/inventory refinements.
- Kept every functional flow, tested copy string, and safety disclosure intact. Mobile adjustments: shortened demo strip, stacked panel headers, stacked hero chips, and an internally scrollable schematic with a swipe hint.

**Fixes during QA**

1. The portrait Three.js camera framed the lattice too tightly, cutting the campus; portrait now pulls back and centres the campus corridor.
2. `min-w-[520px]` on the schematic would have enlarged the document on mobile if placed outside a scroll container; it sits inside `overflow-x-auto`, verified at 375 px.
3. Two headless flow scripts carried pre-overhaul copy assertions (`verified vehicles`, `recompute locked`, `4 students remain unserved`, `V1 AVAILABILITY / Not verified`, `no verified spare seat can reach this village`). They were updated to the current honest copy without weakening intent; the no-backup ticket also gained a clearer `None verified` value.
4. An unused `dashed` local in the schematic failed strict TypeScript; removed.
5. The splash's auto-dismiss made an early screenshot script report `canvas: null`; the timing was the cause, not the scene. The final visual suite waits deliberately and checks all three exit paths.
6. The crisis flow still asserted the old zero-backup copy (`0 seats reach B`); it now checks the ticket's `Verified backup / None verified` row. The 58 assertions and their intent are unchanged.

**Commands and actual results**

| Command | Result |
|---|---|
| `npx vitest run` | 10 files, 105 tests passed (8 new splash-gating tests) |
| `npx tsc -b` | clean |
| `npm run lint` | 0 warnings, 0 errors on 48 files |
| `npm run build` | succeeded; main JS 338.55 kB (99.44 kB gzip), splash chunk 555.46 kB (138.22 kB gzip), CSS 70.10 kB (11.96 kB gzip) |
| `node .screenshots/verify.mjs` | 32/32 checks passed |
| `node .screenshots/verify-m2.mjs` | 53/53 checks passed |
| `node .screenshots/verify-m3.mjs` | 60/60 checks passed |
| `node .screenshots/verify-m4.mjs` | 58/58 checks passed |
| `node .screenshots/verify-visual.mjs` | 29/29 checks passed, including WebGL-disabled fallback |
| Mobile 375 px | document `scrollWidth === clientWidth === 375` on splash and both views; schematic scrolls internally (536 vs 341) |
| Console/page errors | zero across all five scripts |

**Verification method**

System Chrome driven by `puppeteer-core` (`--no-save`). The visual suite covers first-visit gating, modal semantics, focus, Tab trapping, Enter/Esc, auto-dismiss, all three URL parameters, session persistence, reduced motion, missing WebGL, schematic summaries, and mobile overflow. Screenshots reviewed: `intro-desktop.png`, `intro-mobile.png`, `10-student-desktop.png`, `11-coordinator-desktop.png`, `12-coordinator-plan.png`, `13-coordinator-mobile.png`, `14-coordinator-network.png`, `15-intro-mobile.png`, `16-coordinator-mobile-network.png`.

**Deliberately not changed**

- No new data source, vehicle, seat, route, or ETA was introduced. The schematic reads engine helpers; the splash reads nothing.
- No dispatch, contact, authentication, or deployment behavior was added.
- No approved-seat behavior was touched; all recovery constraints and late-replan rules remain as verified in Phases 8–15.
