# Prompt Iterations

This project was built from the attached ROUTELESS master build prompt and the three-hour blueprint, followed by three continuation requests: "Okay, now continue with the next phase." (Milestone 2), "start Milestone 3 with switchable scenarios and late-report replan", and "Also continue the next process" with the attached Surprise Hurdle exam-day crisis PDF. The record below captures the initial instructions, the implementation decisions they forced, and the corrections that were actually made during the build.

---

## Initial build prompt (summary)

**Source:** Attached "ROUTELESS — Master Build Prompt for Qoder" plus `ROUTELESS_3Hour_Blueprint_and_AI_Prompts.md`.

Key constraints that shaped the build:

- Build a real, runnable Milestone 1, not a proposal.
- React + Vite + TypeScript + Tailwind, Lucide React, Vitest, localStorage persistence.
- Modules A–D, with the Recovery Engine explicitly deferred.
- Student reporting must create real state; reports stay unverified; duplicates forbidden.
- Coordinator must confirm or dismiss; affected demand must be visible.
- 12 Village C students; 8 free V1 seats; demo clock 08:00; class 09:00.
- Label all data as simulated; no live feeds, dispatch, SMS, or school contact.
- Do not show a working-looking recovery button before the engine exists.
- Verify with real commands; report actual results; stop after Milestone 1.

**What the prompt got right:** The scope was unusually precise. The 12/8/4 scenario, the "report is not an incident" rule, the stable demo clock, and the prohibition on a fake recovery button directly determined the seed, reducer, and placeholder UI. The requirement to preserve working functionality between milestones justified a small, well-typed state machine rather than building every screen at once.

**Where implementation judgment was still required:** The prompt did not specify how seeded demand should coexist with a new student report, how dismissal should affect vehicle status, or what the student should see when the route is disrupted but they have not reported. Those required explicit decisions and tests (D5, D6, D7, D8 in `DECISIONS.md`).

---

## Iteration 1 — Seed demand without double-counting

**Problem:** If all 12 affected students were seeded with requests, the demo's "report a problem" step would appear to create a 13th student. If none were seeded, the coordinator board would show 0 reports while the scenario claims a disruption.

**Change:** Seeded 11 requests (STU-002…STU-012) and left STU-001 without one. The first report creates the twelfth. Affected demand deduplicates by student, so even a duplicate request could never inflate the count.

**Verification:** `report count 11 → 12`, request array `11 → 12`, repeated report leaves 12.

---

## Iteration 2 — Student stage bug

**Problem:** `getStudentSituation` fell back to the route's incident when a student had no request, so STU-001 displayed "Unverified report" before reporting anything. The timeline implied the student had acted.

**Change:** Derive `stage` only inside `if (request)`. Without a request, the stage is `scheduled` and the chip reads "No report yet". Route-level disruption remains visible in the separate service status card.

**Verification:** Reducer test `student stage transitions` and a headless check that an unreported student shows no report yet while B2 shows an unverified report.

---

## Iteration 3 — Timeline copy assumed a report

**Problem:** Step two said "Waiting for the demo coordinator…" even when the student had no request.

**Change:** Step two now branches on `!request`: "A coordinator verifies reports before any seat is planned."

**Verification:** Desktop and mobile screenshots of the seeded state.

---

## Iteration 4 — Reporting after confirmation

**Problem:** After the coordinator confirmed the incident, a student's first report still produced "A coordinator still needs to review it." The incident was already confirmed; the request was only awaiting planning. The surrounding report section also still said "It does not confirm an incident", which read as if nothing had happened.

**Change:**

- Notice now says the request joined **the confirmed disruption** and that no seat is held until a plan is approved.
- Section subtitle branches: unreported → one tap creates a report; reported → add your own report; confirmed → add your request to this confirmed disruption.
- Student status strip changed "Seat allocation is not part of this milestone" to "No alternative seat has been assigned in this demo", removing internal roadmap language from a student-facing screen.

**Verification:** Headless flow: confirm → report → count 12 → reload → count 12.

---

## Iteration 5 — Dismissal and re-report semantics

**Problem:** A dismissed incident disappears from the active board. What should happen when a student reports again?

**Change:** A same-type report reopens the dismissed incident with a stable ID and a fresh report time. A different type creates a new incident for the same vehicle. Existing requests are preserved, so an already-requesting student cannot inflate demand by re-reporting.

**Verification:** Dismiss → 0 affected, B2 operating → STU-002 sees "reviewed and dismissed" → STU-001 reports breakdown → incident `reported`, 12 requests, exactly one request for STU-001.

---

## Iteration 6 — QA harness selector corrections

**Problem:** The first interaction script used case-sensitive text matches. Status chips and eyebrows render uppercase via CSS, so `innerText` returned `UNVERIFIED REPORT` and `MILESTONE 2 · PLACEHOLDER`, producing false failures. Metric assertions also assumed no blank line between a number and its label.

**Change:** Normalized copy checks to case-insensitive and allowed whitespace in metric regexes. Re-ran against the real app.

**Result:** 32/32 checks passed, zero console/page errors.

**Note:** These were test-harness corrections, not product defects. No product copy was changed to satisfy the harness.

---

## Milestone 2 — one continuation request

**Prompt:** "Okay, now continue with the next phase."

The README already defined Milestone 2 precisely: pure eligibility and engine modules, drafts that never reserve seats, deterministic priority with reasons, atomic approval, proposal review UI, student proposed/assigned/unserved states, and acceptance tests for 12 → 8 → 4, idempotency, no overbooking, and 0/12 with no backup. The implementation followed that scope rather than expanding it.

### Iteration 7 — Test-first engine

**Approach:** Write eligibility and engine tests first, watch them fail, then implement. The eligibility suite covers institution ownership, verification, operating state, village coverage, blocked corridors, accessibility, exam vs regular deadlines, and exhausted seats. The engine suite asserts the exact student order, explanations, determinism, reduced capacity, and zero verified capacity.

**Result:** 21 new tests, all green after implementation. The zero-backup case produces 0 assignments and 12 specific reasons, not a fabricated plan.

### Iteration 8 — Approval must fail safely

**Problem:** A draft can be approved after state changes. Confirming some seats and rejecting others would leave students believing they have seats in an invalid plan.

**Change:** `APPROVE_PROPOSAL` validates every assignment, request, uniqueness, constraint, and cumulative per-vehicle capacity before producing new state. Any failure returns the previous state object. Tests assert reference equality, proving no partial mutation.

**Result:** Stale-capacity and malformed approvals are complete no-ops.

### Iteration 9 — Unserved reasons were weaker than the UI needed

**Problem:** Capacity exhaustion reasons were computed from `freeSeats`, which ignores draft allocations. Every unserved student saw "V1 has no remaining verified seats" rather than an explanation that higher-priority students used them.

**Change:** Pass the run's remaining-seat map into the reason builder. The engine test was tightened from `/seats/i` to `/higher-priority/i` and watched failing first.

**Result:** Unserved students now see "V1's verified seats are all allocated to higher-priority students."

### Iteration 10 — Escalation must not erase the problem

**Problem:** After a student requested school assistance, the dashboard's unserved metric dropped from 4 to 3 while the plan panel still said four students had no seat.

**Change:** The unserved metric now counts both `unserved` and `escalated`. A test was added first and failed at 3, then passed at 4.

**Result:** The board stays honest: requesting help does not create a seat.

### Milestone 2 verification

| Check | Result |
|---|---|
| `npm run test` | 6 files, 57 tests passed |
| `npm run build` | succeeded |
| `npm run lint` | 0 warnings, 0 errors on 39 files |
| Milestone 2 headless flow | 53/53 checks, zero console errors |
| Milestone 1 regression flow | 32/32 checks |
| Mobile 375 px | no horizontal overflow on either view |

---

## Milestone 3 — switchable scenarios and late-report replan

**Prompt:** "start Milestone 3 with switchable scenarios and late-report replan"

That matched the README's recommended Milestone 3 scope, so no scope negotiation was needed. Two constraints from the master brief carried the most weight: never invent capacity, and never silently change an approved seat. The first shaped the road-block/no-backup seeds; the second shaped the replan reducer.

### Iteration 11 — Scenarios as full reseeds, not patches

**Problem:** Scenario differences touch incident type, vehicle state, corridor blocking, and verification. Patching a live state would leave approved assignments pointing at a van the new scenario marks unverified.

**Change:** `LOAD_SCENARIO` builds the selected fixture from scratch and preserves only `role`. Persistence validates the scenario id and rejects unknown values instead of defaulting. Reset reloads the active scenario.

**Result:** 12 new scenario tests; switching clears reports, drafts, and approved seats, and the confirmation dialog says so before it happens.

### Iteration 12 — The metric contradicted the plan

**Problem:** In the road-block scenario the dashboard still reported "8 backup seats" because the metric counted the whole verified fleet, while the engine correctly allocated 0. A judge looking at both numbers would conclude one of them was fabricated.

**Change:** Added `usableRescueOptions` and scoped `backupSeats` to vehicles that can actually reach a confirmed incident's village. Wrote two metric tests first and watched the road-block test fail at 8 before implementing.

**Result:** Breakdown 8 → road block 0 → no backup 0. Dashboard, run box, and engine now use one reachability rule.

### Iteration 13 — Late reports need their own path

**Problem:** D20 froze the plan, so a report after approval stayed pending until a reset. Honest, but it dodged the realistic question and made the late report feel broken.

**Change:** `RUN_REPLAN` creates a supplemental draft scoped to pending late requests and seats still free. It replaces only prior supplemental drafts; approved proposals, assignments, and confirmed requests are never touched. Approval reuses the same atomic checks, and an all-unserved draft is a valid outcome. Student copy explains the wait instead of implying a seat.

**Result:** 12 replan tests. Headless flow proves approved IDs are byte-identical after a replan, and a late report on a full fleet approves as 0 seats / 1 unserved.

### Iteration 14 — QA corrections

1. Scenario switch check compared `innerText` to `ACTIVE`, but Tailwind uppercases it — the check was normalized, not the product.
2. The road-block inventory rendered both V1's note and the blocked-corridor warning; the note is now suppressed.
3. Switching the scenario card needed a distinct `aria-pressed` state so keyboard and screen-reader users can tell the active fixture.

### Milestone 3 verification

| Check | Result |
|---|---|
| `npx vitest run` | 8 files, 85 tests passed |
| `npx tsc -b` | clean |
| `npm run build` | succeeded |
| `npm run lint` | 0 warnings, 0 errors on 41 files |
| Milestone 3 headless flow | 60/60 checks, zero console/page errors |
| Mobile 375 px | no horizontal overflow on either view |

---

## Surprise hurdle — the exam-day crisis

**Prompt:** "Also continue the next process" with `Surprise_Hurdle_PromptBattle_Aerophilia2K26.pdf`.

**Brief:** Two government buses are unavailable, demand rises about 40%, a major road between two villages is blocked by flooding, and several students have exams within two hours. The team has 100 minutes to reallocate buses, suggest alternative routes, prioritize exam students, use resources efficiently, and minimize students who cannot reach their institution on time.

**Reading of the brief:** The PDF asks for an alternative-route suggestion. Because the demo has no routing or map engine, the safe interpretation is to show the access constraint honestly and keep every allocation on verified capacity. Inventing a detour, a new travel time, or an extra bus would violate the build's core governance rules and would make the demo less trustworthy under judging.

### Iteration 15 — A crisis with real capacity and no invented route

**Change:** Added `exam_crisis` with two simultaneous breakdown incidents, 16 seeded requests across three villages, five exam students, and one verified emergency minibus (V3, 8 free seats). The flooded Village B corridor blocks V3 from that stop, so reachable capacity is 8 to Village A, 16 to Village C, and 0 to Village B.

**TDD evidence:** `crisis.test.ts` failed 11 ways against the placeholder seed (one incident, 11 requests, no V3). After the fixture refactor, the full suite passed 97/97. One expected exam order was corrected to match D18 (exam, then previous unserved days, then ID).

**Result:** Village B students are unserved with a blocked-corridor reason. No detour is suggested anywhere in the UI or copy.

### Iteration 16 — Two plans, one fleet

**Problem:** Both incidents draw from the same two verified vehicles. Computing B2's draft before B1 is approved sees 16 free seats; approving B1 first consumes 3. A naive second approval would overbook V3.

**Change:** Kept per-incident proposals with independent drafts, and relied on `APPROVE_PROPOSAL` to re-check capacity across all confirmed seats. Added a shared-fleet callout to the recovery panel and per-village reachability lines to the run box.

**Result:** B1 proposes 3 / 2 unserved; B2 proposes 12 / 0. Approval produces 15 placed, 2 unserved, V1 0 free, V3 1 free in either order. A test and the headless flow both assert the totals.

### Iteration 17 — The 40% surge without a forecast

**Change:** Seeded 16 requests and left STU-001 and STU-018 unreported. STU-001's report completes the stated 17 (about 40% above 12); STU-018 is the late reporter used to stress the supplemental path inside the crisis.

**Result:** 17 affected after confirmation; STU-018's late report adds an 18th request, produces a 0-seat / 1-unserved supplemental draft, and leaves all 15 confirmed seats byte-identical.

### Iteration 18 — QA corrections

1. The demand roster filtered requests by incident, so a multi-village incident could show Village B reports under Village A. Now filtered by roster ids.
2. The student backup line read "1 seats reach A"; singular/plural corrected.
3. The headless flow initially expected V1 to serve Village A — V1 serves Village C only, so B1 correctly sees 8 reachable seats on V3.
4. The flow initially skipped STU-001's report, leaving B2 at 11 requests; the demo path now reports as STU-001 before confirming both incidents.
5. The demo student selector is scoped to the active village; the harness now switches the village before selecting a student.
6. Briefing and ticket labels are uppercase via CSS; assertions compare the rendered text.

### Surprise hurdle verification

| Check | Result |
|---|---|
| `npx vitest run` | 9 files, 97 tests passed |
| `npx tsc -b` | clean |
| `npm run build` | succeeded; JS 313.40 kB (92.56 kB gzip), CSS 38.50 kB (7.57 kB gzip) |
| `npm run lint` | 0 warnings, 0 errors on 43 files |
| Crisis headless flow (`verify-m4.mjs`) | 58/58 checks, zero console/page errors |
| Mobile 375 px | no horizontal overflow on coordinator or student crisis views |
| Reload / reset | Crisis and 15 confirmed seats persist; reset reseeds the active crisis |

---

## Visual overhaul — splash, schematic, and a stronger UI

**Prompt:** "add a beautiful splash screen and make the UI much much better using 3js, react, node.js, three ui and any other designing tools".

**Reading of the brief:** Add a memorable opening and raise the product's visual craft without adding a single new transport fact. "3js" means Three.js for the opening; "react" and "node.js" are already the app and its tooling; "three ui" is not a library in this stack, so the UI work uses the existing React + Tailwind system rather than importing an unrelated component kit. Every generated visual is decorative or derived — never a new data source.

### Iteration 19 — Gate the splash test-first

**Change:** Added `src/tests/intro.test.ts` before any splash code: first visit, seen flag, `skipIntro=1`, `intro=0`, `intro=1`, unrelated parameters, safe flag writing when storage throws, and a duration between 5 and 9 seconds. The first run failed with `Cannot find module '../lib/intro'`; implementing the pure gating module made all 8 pass.

**Result:** Splash behavior is a tested contract, not a timing accident. Headless scripts run with `?skipIntro=1`; the visual suite checks all three URL parameters and session persistence.

### Iteration 20 — A 3D moment that cannot break the demo

**Problem:** A WebGL scene can throw, fail to load, consume a large bundle, and ignore reduced motion. Any of those must not block the product.

**Change:** Kept the scene decorative and dynamically imported; drew an always-present SVG lattice behind the canvas; caught both import and mount failures; rendered one final frame under `prefers-reduced-motion`; capped DPR at 1.75; paused on hidden tabs; tracked and disposed every geometry, material, texture, and the context.

**Result:** The production build keeps Three.js in a separate `introScene` chunk (555.46 kB / 138.22 kB gzip). A Chrome run with WebGL disabled still shows the SVG, focuses Enter, and enters the demo with zero page errors.

### Iteration 21 — One idea, two materials

**Change:** Replaced ad-hoc styling with the "Dawn dispatch" system: a night shell and masthead, a paper operations canvas with grain, night/mint/gold tokens, stamp chips, panel highlights, instrument metrics, and tactile report tiles. The route-that-breaks-and-recovers motif recurs in the splash lattice, the coordinator schematic, and the student route rail.

**Deliberate restraint:** One bold moment (the 3D opening); everything else is quiet paper and mono. No extra navigation, no invented stats, no decorative map that could be mistaken for GPS.

**Result:** The two roles now read as one product — a night decision layer over a paper record — while all prior copy and flows remain in place.

### Iteration 22 — The second visual must also be honest

**Problem:** A pretty network map risks becoming a second, disagreeing model of capacity.

**Change:** Derived every village state from `usableRescueOptions`, `freeSeats`, and `verifiedRescueOptions`, the same helpers the engine uses. Added explicit states for no verified service, verified-but-full, and blocked corridor, an X on the broken link, a "Not GPS" label, and a `role="img"` summary. On mobile the board keeps a 520 px minimum width inside an internal scroller instead of shrinking labels to ~5 px.

**Result:** The schematic cannot claim a seat the plan cannot allocate, and the document still has no horizontal overflow at 375 px.

### QA corrections

1. Portrait camera framing cut the campus; portrait now pulls back and centres the campus corridor.
2. Two headless scripts held pre-overhaul copy assertions; updated to the current honest copy. The no-backup student ticket now explicitly reads `None verified` rather than naming V1.
3. An unused local failed `noUnusedLocals`; removed.
4. Stacked panel and hero headers on mobile so status chips stop squeezing body copy.
5. Shortened the top demo strip on mobile to one line while keeping the simulated-data disclosure.
6. The crisis flow checked the pre-overhaul `0 seats reach B` copy; it now asserts the student ticket's `Verified backup / None verified` row, preserving the same zero-reachability intent.

### Visual overhaul verification

| Check | Result |
|---|---|
| `npx vitest run` | 10 files, 105 tests passed |
| `npx tsc -b` | clean |
| `npm run lint` | 0 warnings, 0 errors on 48 files |
| `npm run build` | succeeded; main 338.55 kB (99.44 kB gzip), splash chunk 555.46 kB (138.22 kB gzip), CSS 70.10 kB (11.96 kB gzip) |
| Flow scripts (`verify`, `m2`, `m3`, `m4`) | 32/32, 53/53, 60/60, 58/58 |
| Visual suite (`verify-visual.mjs`) | 29/29: gating, modal semantics, focus trap, Enter/Esc, auto-dismiss, URL parameters, reduced motion, WebGL fallback, schematic summary, mobile overflow |
| Errors | zero console/page errors across all five scripts |

---

## What was intentionally not prompted or built

- No LLM triage endpoint. The blueprint marks it optional and explicitly forbids using an LLM for capacity, validation, or authorization.
- No backend, Firebase, maps, live feeds, or dispatch.
- No revocation or transfer of an approved seat. Late reports get a supplemental plan; confirmed seats never move. A revocation flow would need explicit audit copy first.
- No detour search or routing engine for the flooded road. The blocked corridor removes access; the demo never invents an alternate road, ETA, or pickup point.
- No cross-incident repacking of approved plans. The crisis is planned per incident; shared capacity is enforced at approval.
- No demand forecast model. The 40% surge is a seeded count with stated arithmetic.
- No additional UI component library. "three ui" was read as a request for stronger UI, not a package name; the overhaul extends the existing React + Tailwind primitives instead of adding a second design system.
- No map, geolocation, or 3D data claim. The splash reads no data; the schematic is derived from engine metrics and says "Not GPS".
- No deployment or repository push in this milestone.

---

## Suggested next prompt (post-visual)

> Read `README.md`, `docs/PROJECT_SPEC.md`, `docs/PHASE_LOG.md`, and `docs/DECISIONS.md`. Preserve every working flow and safety rule. Do an external accessibility and performance pass on the current build: contrast of night-surface supporting text, focus order after approvals and scenario switches, splash behavior on low-end mobile, and the cost of the dynamic Three.js chunk on first paint. If deployment is requested, publish the demo with the simulated-data disclaimer intact. Run the full test/build/lint suite and all headless scripts, update docs with actual results, and stop before any real transport integration.

---

## Prompt-quality observations

- Specifying the exact acceptance numbers (12 affected / 8 proposed / 4 unserved) made the seed and tests unambiguous.
- Explicitly naming the anti-patterns ("never use an LLM to invent capacity", "avoid a working-looking recovery button") prevented plausible but unsafe UI.
- Requiring a finish receipt with commands and actual output kept verification honest.
- Leaving visual direction at a high level ("trustworthy, teal/navy, not a generic admin template") gave room for a subject-specific route-rail and ticket treatment without conflicting with the functional brief.
