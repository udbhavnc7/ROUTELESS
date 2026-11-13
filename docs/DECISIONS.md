# Decisions

Important technical and product choices, with the reasoning behind them. Scope is Milestones 1–3 and the exam-day crisis surprise hurdle unless stated otherwise.

---

## D1 — React Context + `useReducer`, not Zustand

**Decision:** One provider holds a single `AppState` and dispatches typed actions.

**Why:** The whole demo is a single canonical state machine with a small number of transitions. Context plus reducer needs no dependency, keeps every mutation in one testable function, and makes reset a simple replacement. Zustand would also work, but adding a library would not reduce complexity here.

**Consequence:** Selectors live in `src/domain/metrics.ts` and `studentView.ts`; components never hold copies of domain data.

## D2 — Derive metrics, never store counters

**Decision:** Reports, affected counts, free seats, and status chips are recomputed from incidents, requests, and assignments.

**Why:** Stored counters drift after dismiss, reset, or duplicate reports. Derivation keeps the same number visible in the header, metric tiles, ticket card, and tests.

**Consequence:** Affected demand deduplicates by student across confirmed incidents. Free seats subtract confirmed rescue assignments, so approval cannot silently overbook.

## D3 — Versioned `localStorage` with strict validation

**Decision:** Persist to `routeless.demo.state.v1` with `schemaVersion: 1`; validate structure and selected IDs on load; discard invalid data and seed.

**Why:** A demo that crashes on stale or corrupted storage is worse than one that resets. Versioning lets a future schema change invalidate old state without migrations.

**Consequence:** Storage access is wrapped in try/catch; the footer shows whether saving is available. This is per-device persistence, not delivery to anyone.

## D4 — Deterministic IDs

**Decision:** Incident IDs are `inc-{optionId}-{type}`; request IDs are `hr-{studentId}-{incidentId}`.

**Why:** Idempotency is a core safety property. Repeated taps and re-reports must not create parallel demand. Deterministic IDs make duplicates impossible at the data layer, independent of UI disabling.

**Consequence:** A student can have one request per incident. A different incident type for the same bus creates a distinct incident and therefore a distinct request.

## D5 — Eleven seeded requests, STU-001 unreported

**Decision:** Seed 11 of 12 affected students as already reported; leave STU-001 without a request.

**Why:** The showcase must show a student creating a report and the coordinator seeing twelve affected students without double-counting. Seeding all 12 would make the demo report look like it added a thirteenth; seeding zero would make "11 reports" look inconsistent with "12 affected". This split demonstrates the intended behavior honestly.

**Consequence:** Reports metric starts at 11 and becomes 12 after STU-001 reports. Affected is 0 until confirmation, then 12.

## D6 — A report takes the route's open incident type

**Decision:** If a non-dismissed incident exists for the student's route, any report attaches to it regardless of the tapped tile. If all matching incidents are dismissed, a same-type report reopens one; a different type creates a new incident.

**Why:** In this demo, one disrupted bus should produce one operational incident, not one per student's wording. Coordinator verification is per incident. After dismissal, a genuinely different signal ("it's full now") deserves a new incident; a repeat of the same claim reopens the existing one.

**Consequence:** Tapping "Bus was full" while a breakdown is already reported adds a request to the breakdown incident. The UI does not claim the incident type changed. This is a simplification appropriate for Milestone 1 and should be revisited if triage becomes more granular.

## D7 — Confirmation changes vehicle state; dismissal does not

**Decision:** Confirming a breakdown, no-show, or road block sets the vehicle to `cancelled`; delay sets `delayed`; full leaves the vehicle unchanged. Dismissal leaves the vehicle as-is.

**Why:** The fleet display must agree with the operational record. A confirmed breakdown cannot leave the bus labeled "operating". A dismissed report should not have side effects. `displayVehicleStatus` also recomputes from confirmed incidents, so a restored state cannot disagree with itself.

## D8 — Student stage follows the student's own request

**Decision:** `getStudentSituation` derives `stage` only when a request exists. Without a request, the stage is `scheduled` even if the route has a reported incident.

**Why:** An incident on the route is not the student's report. Conflating them produced a misleading timeline where an unreported student appeared to be waiting for review. The status card still shows route-level incident information separately.

## D9 — No recovery engine, and no fake button

**Decision:** Milestone 1 shows a disabled "Run recovery analysis" button labeled as a placeholder, plus the constraints it will enforce.

**Why:** The brief explicitly forbids a working-looking recovery control without functionality. A disabled control with clear roadmap copy is more honest than a button that opens a "coming soon" modal or, worse, fabricated allocations.

**Consequence:** Placements and unserved metrics are zero. No prose claims 8 assignments or 4 unserved students exist yet.

**Superseded in Milestone 2:** The placeholder is replaced by the deterministic engine and approval UI. The original principle still holds: the control is enabled only when a confirmed incident can actually be planned.

## D10 — Fixed 08:00 demo clock

**Decision:** The app displays a simulated 08:00 clock and never reads the visitor's real time.

**Why:** The showcase must produce the same 12 → 8 → 4 reasoning regardless of when judges open it. Real time would make the class deadline meaningless.

**Consequence:** All times are schedule-based demo labels. The header explicitly says "Demo 08:00" with a tooltip that it is not live time.

## D11 — No router

**Decision:** Views are switched by `role` in state rather than URL routes.

**Why:** Two views, one shared state, no deep linking requirement. A router would add surface area without demo value. State already survives refresh, so the selected role persists.

**Consequence:** The URL does not encode the view. If public sharing of a specific view is needed later, a hash or query can be added without changing the state model.

## D12 — Visual direction: printed timetable, not admin template

**Decision:** Warm paper background, deep teal/navy brand, mono eyebrows and times, a route rail with a broken dashed segment, ticket-stub scenario card, and discrete seat meters.

**Why:** The subject is rural scheduled transport. Timetables, tickets, and route lines are native artifacts of that world, and they encode real information (stops, times, breakage, seats). This avoids the generic dashboard look and keeps the disruption legible at a glance.

**Consequence:** Amber is reserved for unverified/pending, red for confirmed disruption, green for verified/operating. Color always appears with a text label, not alone.

## D13 — Self-hosted fonts

**Decision:** Bundle Archivo, Instrument Sans, and IBM Plex Mono via Fontsource rather than loading Google Fonts at runtime.

**Why:** Reliable offline demo and no third-party request or layout shift. Cost: several font subsets in the build. This can be trimmed later by importing only the Latin subsets.

## D14 — Headless Chrome verification as a supplement, not a dependency

**Decision:** Use `puppeteer-core` with the system Chrome installed with `--no-save` for interaction checks and screenshots.

**Why:** The in-app browser viewport was unavailable in this environment. Headless verification still exercises real DOM, events, storage, and layout at 375 px. It is not committed as a project dependency and is excluded from the repo.

**Consequence:** The repo's test command remains Vitest only. The verification script is temporary QA evidence, not part of the product.

## D15 — Recovery engine is a deterministic heuristic, not ML

**Decision (Milestone 2):** Eligibility and allocation are pure, tested constraint functions with explicit reason codes.

**Why:** The product cannot invent capacity or authorize a ride. Determinism is required for fairness, auditability, and tests. An LLM may later interpret free-text incident descriptions, but it will never validate a vehicle, count seats, or approve an assignment.

**Consequence:** Any future "AI" framing must be accurate: AI-assisted tooling around a deterministic safety core, not a predictive model trained on real transport data.

## D16 — A draft reserves nothing; approval is the only reservation

**Decision:** `freeSeats` subtracts only `confirmed` rescue assignments. A draft proposal stores proposed assignments and request statuses but leaves capacity untouched.

**Why:** If a draft silently held seats, recomputing or discarding would strand capacity and the inventory would disagree with the plan. Keeping drafts free makes the safety property visible: "8 free · not held" beside "8 proposed".

**Consequence:** Approval must check capacity again. The same state can produce an identical recomputed draft (`RUN_RECOVERY` is idempotent) without double-counting.

## D17 — Approval re-validates atomically

**Decision:** `APPROVE_PROPOSAL` re-checks proposal status, incident confirmation, assignment/request membership, uniqueness, every eligibility constraint, and cumulative per-vehicle capacity. Any failure returns the previous state object unchanged.

**Why:** A plan computed at 08:00 may be approved after state has changed. Partial confirmation would be worse than failure: some students would believe they have seats while the plan is invalid. Returning the same reference also makes "no mutation" testable.

**Consequence:** Stale capacity, a dismissed incident, or a manually corrupted state cannot produce confirmed overbooking. There is no partial approval path.

## D18 — Priority is explicit and stable

**Decision:** Order requests by exam day, then previous unserved days (descending), then fewest viable alternatives, then student ID.

**Why:** Exam day has zero grace; repeated unserved days represent accumulated unfairness; students with fewer alternatives are harder to serve; student ID is an arbitrary but stable final tie-break. The result must be the same for the same input, which tests assert exactly.

**Consequence:** The seeded plan is always 8 seats to STU-003, STU-004, STU-011, STU-001, STU-002, STU-005, STU-006, STU-007, and 4 unserved students. Changing the order is a product decision, not an implementation detail.

## D19 — Unserved means no seat, even after escalation

**Decision:** `ESCALATE_REQUEST` changes a request to `escalated`, but the dashboard's unserved metric counts both `unserved` and `escalated`.

**Why:** Asking the school for help does not produce a seat. Counting escalation as "no longer unserved" would make the board look better while the student is still stranded. The request chip still distinguishes "Help requested" from plain "Unserved".

**Consequence:** The plan panel and metric both report 4 students without seats after approval, even if one escalates.

## D20 — Approved seats are final; late reports get a supplemental plan

**Decision (revised in Milestone 3):** Once any proposal for an incident is approved, `RUN_RECOVERY` is a no-op and its seats are immutable. A report filed after approval stays `pending` until the coordinator explicitly runs `RUN_REPLAN`. That action creates a separate supplemental draft (`kind: 'replan'`, `prop-{incidentId}-r{n}`) scoped to late requests and to seats that are still free. It never edits an approved proposal, assignment, or confirmed request.

**Why (Milestone 2, still true):** Recomputing the initial plan could silently revoke confirmed seats, and the demo has no notification workflow to explain a revoked seat. Keeping approved seats frozen is the only honest option.

**Why the revision:** Freezing everything forced a reset to demonstrate a late report, which hid the harder and more realistic question — what happens when someone reports after the vans are gone? The answer must be visible and safe: the late reporter can only receive capacity that no approved seat uses, and if none exists they are told so.

**Consequence:** "Plan approved · seats final" still locks recompute. A separate "Plan late requests" action appears only when pending late requests exist. Approving a supplemental plan can confirm zero seats and one unserved reason; that is a valid, honest outcome. Moving or revoking an approved seat remains out of scope.

## D21 — A scenario switch is a full reseed, not a partial patch

**Decision:** `LOAD_SCENARIO` builds the selected scenario's seed from scratch and preserves only `role`. Reports, incidents, proposals, assignments, and village/student selections are replaced.

**Why:** Scenarios differ in incident type, vehicle state, corridor blocking, and verification. Patching a live state would leave proposals and assignments referring to entities that no longer mean the same thing — for example a confirmed seat on a van that the new scenario marks unverified. A reseed is the only state that is guaranteed internally consistent.

**Consequence:** Switching scenarios is destructive, so the UI requires confirmation and names the active scenario in both the switch dialog and the reset dialog. Reset reloads the active scenario rather than always returning to breakdown.

## D22 — A blocked road removes capacity; it never invents a detour

**Decision:** In the `road_block` scenario, V1 stays verified and active but carries `blockedCorridorIds: ['c-south']`. It is excluded from usable recovery capacity instead of receiving an estimated alternate route or adjusted travel time.

**Why:** The demo has no routing data. Fabricating a detour or a new ETA would be invented capacity, which the governance rules forbid. Reporting "0 usable seats" is the honest output; the engine's existing corridor constraint already models this case.

**Consequence:** The inventory shows "access road blocked — not eligible for recovery, even when verified", the dashboard backup metric reads 0, and the plan returns 11 unserved students with a blocked-corridor reason.

## D23 — Backup seats mean reachable seats

**Decision:** `backupSeats` counts free seats on verified, active institution vehicles that serve a confirmed incident's village and are not blocked from it (`usableRescueOptions`). With no confirmed incident it falls back to all verified rescue capacity.

**Why:** Counting the whole verified fleet made the headline metric say 8 while the plan could allocate 0 in the road-block scenario. A staff member reading "8 backup seats" beside "11 unserved" would rightly distrust the board. The metric must use the same reachability rule as the engine.

**Consequence:** The metric now drops when a corridor is blocked or the van is unverified. Tests cover breakdown 8 → road block 0 → no backup 0. A future second incident village would make this a per-incident union, not a single fleet total.

## D24 — Unknown scenario ids are rejected, not defaulted

**Decision:** Persistence validation requires `scenarioId` to pass `isScenarioId`. A payload with a missing or unknown scenario is discarded and reseeded.

**Why:** Silently coercing an unknown id to `breakdown` would make a corrupted or hand-edited payload look valid while changing what the demo claims to show. Rejection keeps `createInitialState(scenarioId)` total and prevents a crash from an undefined seed.

**Consequence:** Adding a scenario requires a fixture plus a catalog entry; an old payload referencing a removed scenario is reset rather than half-loaded.

## D25 — Two incidents, one fleet: plan per incident, enforce capacity at approval

**Decision:** The exam-day crisis seeds two confirmed-capable breakdown incidents (B1 and B2). Each gets its own deterministic proposal. Drafts are computed independently against currently free capacity. `APPROVE_PROPOSAL` re-validates capacity across all confirmed seats from every incident before confirming.

**Why:** The hurdle asks for a working plan inside 100 minutes, not a global optimizer. Per-incident plans keep the existing auditable model, let the coordinator handle one bus at a time, and still make overbooking impossible. A cross-incident repacker would be harder to explain and would risk moving already-approved seats.

**Consequence:** Drafts can appear to promise 3 + 12 seats from a 16-seat pool because drafts hold nothing. Approval is the safe point: B1 takes 3 on V3, B2 takes 8 on V1 and 4 on V3, leaving 15 placed, 2 unserved, V1 0 free, V3 1 free. Approving in either order yields the same totals. Repacking approved plans remains out of scope.

## D26 — The flood removes access instead of creating a detour

**Decision:** Village B's corridor (`c-east`) is blocked, and the emergency minibus V3 carries `blockedCorridorIds: ['c-east']`. Village B therefore has zero reachable verified capacity. The run box names the blocked village and says no detour is invented.

**Why:** This is the same principle as D22 extended to the crisis. The brief mentions a flooded road; the safe response is to remove that stop from the reachable set, not to invent an alternate road, travel time, or pickup point. Exam priority cannot override a physical access constraint.

**Consequence:** STU-016 sits an exam and is still unserved with a blocked-corridor reason, while Village A and C students are served. A late Village B report (STU-018) also receives a 0-seat supplemental draft.

## D27 — Model the 40% surge with seeded demand, not a forecast

**Decision:** The usual load is 12 students. The crisis seeds 16 requests across three villages and leaves STU-001 and STU-018 unreported. STU-001's report completes the stated surge of 17 (about 40% above 12). STU-018 is an additional late reporter beyond that count, used to test what happens when a student reports after approval.

**Why:** A literal 40% would be 16.8 students, so 17 is the smallest honest integer. The demo has no forecasting model and should not imply one. Seeding most reports keeps the coordinator flow immediate; leaving two students unreported demonstrates both the ordinary report and a late report under crisis conditions.

**Consequence:** After confirmation and STU-001's report the board shows 17 affected students. STU-018's later report raises requests to 18 and, after the supplemental plan, unserved to 3. Documentation states the arithmetic and the approximation.

## D28 — Exam priority orders a plan; it cannot create eligibility

**Decision:** The crisis marks five students as exam day and keeps the existing priority rule (exam, repeat unserved days, fewest alternatives, ID). Eligibility is still evaluated first; a blocked corridor or missing verification removes a vehicle regardless of the student's exam.

**Why:** Priority is a fairness ordering, not a way to bypass safety constraints. Letting exam status override a blocked road would produce an assignment the vehicle cannot physically serve, which is exactly the kind of invented capacity the build forbids.

**Consequence:** Village C's plan leads with STU-004, STU-011, then STU-003 (exam break, then repeat-unserved days). STU-016 remains unserved despite their exam because Village B is unreachable.

## D29 — The splash is a session-scoped invitation, not a gate

**Decision:** The opening scene shows on a browser session's first visit, auto-dismisses after 6.8 seconds, and can be skipped with Enter, Esc, or its button. The seen flag lives in `sessionStorage` (`routeless.intro.seen`), separate from demo state. `?intro=1` replays, `?intro=0` hides, and `?skipIntro=1` bypasses.

**Why:** A splash that requires a click adds friction to every judge run, while one that never goes away hides the product. A timer plus keyboard dismissal gives the scene room to land and keeps the demo immediate. Session scope means a refresh during a demo does not replay the intro, but a new session can see it again.

**Consequence:** The splash is presentation only — it reads no demo data, changes no state, and cannot affect a plan. Headless flow scripts use `?skipIntro=1`; the visual suite tests all three parameters and the session flag. Broken or unavailable storage falls back to showing the intro.

## D30 — Three.js is decorative, lazy, and replaceable

**Decision:** The splash scene is a raw Three.js module (`src/three/introScene.ts`) loaded with a dynamic import, rendered into an alpha canvas over an SVG lattice. A static SVG fallback is always present behind the canvas. `prefers-reduced-motion` renders the final frame once. The renderer caps DPR at 1.75, pauses on a hidden tab, and disposes every tracked geometry, material, texture, and the context on unmount.

**Why:** The visual brief asked for a 3D opening, but the product must still work on a machine without a usable WebGL context or with reduced motion. Keeping Three.js in its own chunk protects the main bundle, and a decorative scene must never be able to block the actual demo.

**Consequence:** Production output has a separate `introScene` chunk (555 kB minified / 138 kB gzip) beside a 339 kB main bundle (99 kB gzip). If the chunk fails to load or the context throws, the splash still renders its SVG and the Enter action works. No Three.js object is ever used as a data source.

## D31 — The network schematic is derived, never a second data model

**Decision:** The coordinator schematic computes each village's state from the same helpers as the engine: `usableRescueOptions`, `freeSeats`, and `verifiedRescueOptions`, plus the confirmed incident list. It renders four states — verified seats reachable, no verified service, verified but no seat, and blocked corridor — and states "Not GPS" on the panel.

**Why:** A decorative map that disagrees with the plan would undermine the product's central claim of honest capacity. Deriving the display from the engine means the board, the metrics strip, and the draft cannot tell different stories.

**Consequence:** When a corridor is blocked, the schematic draws a dashed red link with an X and says the access road is blocked; it never invents a detour. When no verified vehicle serves a village, the link is dotted grey. The panel exposes a text summary through `role="img"` for assistive tech.

## D32 — Mobile keeps the schematic legible by scrolling it inside the card

**Decision:** Below 640 px the schematic keeps a 520 px minimum width inside an `overflow-x-auto` card and shows a one-line swipe hint, instead of scaling the 680-unit SVG down to phone width.

**Why:** Scaling the whole drawing made its mono labels roughly 5 px tall — technically present, practically unreadable. An internal scroll preserves the data and leaves page-level layout untouched, so the app still has no horizontal document overflow at 375 px.

**Consequence:** The board is the only horizontally scrollable region on mobile. Its scroll container is measured in the visual suite (`scrollWidth` 536 vs `clientWidth` 341 at 375 px) while the document remains 375/375.

## D33 — Restyle through tokens; preserve tested copy and DOM order

**Decision:** The visual overhaul uses the night/paper token set in `index.css` (`night`, `night-2`, `night-3`, `mint`, `gold`, `paper-2`, `brand-deep`, panel shadows) and restyled primitives (`Button`, `StatusChip`, `Panel`, `PageHeader`, `SeatMeter`, `RoleSwitch`, `BrandMark`). Existing functional copy, labels, button names, and `dt → dd → p` metric order were kept unless a change improved honesty.

**Why:** The headless flows assert rendered copy and element adjacency, and more importantly the copy is part of the product's safety story. A redesign that renames "Confirm disruption" or drops "No real dispatch" would be a regression even if it looked better. Tokens keep the two roles visually related without duplicating one-off classes.

**Consequence:** Two stale assertions were updated only where the honest copy had legitimately changed: the backup metric hint now reads "reachable verified seats", the approved-plan lock reads "Plan approved · seats final", the student ticket says "None verified" instead of naming V1, and the blocked-plan line names the actual village. No functional flow or safety rule changed.

## D34 — Deploy from CI to GitHub Pages, with the base path injected

**Decision:** Publish `dist/` to GitHub Pages from a workflow on every push to `main`. The build takes `BASE_PATH` from the workflow (`/<repository>/`) and Vite defaults to `/` otherwise. Lint, the unit suite, and the production build must pass before the artifact is uploaded.

**Why:** The demo is a static client with no secrets or backend, so Pages is the smallest honest deployment: no extra account, no server, no runtime configuration. Injecting the base path keeps local URLs unchanged while making project-site asset URLs correct, and deriving it from `github.event.repository.name` avoids hardcoding a repository name in two places. Gating on lint and tests means the public URL cannot advance past a broken build.

**Why the workflow does not enable Pages:** `GITHUB_TOKEN` cannot create a Pages site; `configure-pages` documents that `enablement: true` needs a different token. Attempting it produced `Resource not accessible by integration`. Pages is therefore enabled once with an authenticated account and the workflow only reads that configuration. Granting repository administration to a deploy workflow would be a larger permission than publishing requires.

**Consequence:** Repository contents stay read-only for the build job; only the isolated deploy job gets `pages: write` and `id-token: write`. A renamed repository changes the base path on the next run, but the existing Pages URL would change with it unless a custom domain is configured. The README and spec now name the live URL and describe the static, simulated nature of the hosted build.
