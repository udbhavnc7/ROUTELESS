# ROUTELESS — The Last Mile

**When the bus fails, the journey shouldn't end.**

ROUTELESS is a mobile-first decision-support prototype for rural student transport recovery. It closes the loop between a student whose bus fails, a school transport coordinator who verifies the disruption, and a transparent allocation process that can only use verified spare capacity — or say honestly that no seat exists.

> **This is a simulated demonstration, not a live transport service.** No real buses, schools, government feeds, GPS, SMS, or dispatch systems are connected. Every village, vehicle, student, seat count, and time is fictional demo data stored in the visitor's browser.

**Built for:** Aerophilia 2K26 Prompt Battle
**Current status:** Visual system overhaul complete — a Three.js route-lattice splash, a data-driven network schematic, and a paper-operations UI on top of all five scenarios and the exam-day crisis
**Tagline used in-app:** When the bus fails, the journey shouldn't end.

---

## What works today

- **Student view** — choose a demo village and pseudonymous student, see the scheduled service and stop times, and report one of five problems (no-show, full, late, breakdown, road blocked) in one tap. Reports are saved locally, remain unverified, and repeated reports never duplicate a request.
- **Coordinator view** — verify or dismiss reported incidents, see demand grouped by village, inspect the transport inventory with derived free seats and blocked-corridor warnings, and see honest live metrics.
- **Recovery plan** — after confirming an incident, run a deterministic allocation against verified spare capacity. Review the draft grouped by vehicle with pickup/campus times and a reason per assignment, see every unserved student with a specific reason, then approve, recompute, or discard. Approval re-checks every constraint and consumes seats exactly once.
- **Late-report replan** — a student who reports after approval never moves a confirmed seat. The board shows the late request, and **Plan late requests** builds a supplemental draft scoped to those requests only, against the capacity still free. It can propose a seat or be approved as an honest all-unserved outcome.
- **Switchable scenarios** — five full reseeds of the same demo network: breakdown (8 usable seats), overcrowding (B2 stays in service, 8 usable seats), blocked access road (V1 verified but unreachable, 0 usable seats), no verified backup (0 seats), and the exam-day crisis (two buses down, 17 expected students, flooded Village B road, a verified emergency minibus, and 16 usable seats). Switching never edits the current plan; it loads a separate seed after a confirmation dialog and keeps the active view.
- **Exam-day crisis** — both government buses fail on exam morning, demand runs about 40% above the usual load, five students sit exams at 09:00, and the flooded Village B road removes every verified route to that stop. Each confirmed incident gets its own deterministic plan, while approval re-checks capacity across the shared fleet so the second plan can never overbook the first. Exam students lead within each plan; Village B students are listed unserved rather than given an invented detour.
- **Student outcomes** — a proposed seat, a confirmed pickup card, or an honest unserved reason. Only unserved students can request school assistance, and escalation is recorded locally without contacting anyone.
- **Opening splash** — a skippable 6.8-second Three.js scene shows three routes drawing toward campus, one breaking, and a mint recovery line reaching around it. Enter or Esc skips it; it plays once per browser session; `?intro=1` replays it and `?skipIntro=1` bypasses it. A static SVG lattice renders behind the canvas, so a missing WebGL context or a failed scene-chunk load never produces a blank screen.
- **Network schematic** — a live SVG board on the coordinator view derives each village's status from the same engine metrics as the plan: verified seats that can reach campus, no verified service, or a blocked corridor. It is explicitly labelled "Not GPS", never invents a link or detour, and scrolls inside its card on narrow screens.
- **Demo shell** — Student/Coordinator role switch, simulated `08:00` clock, persistent demo state, scenario-aware reset, and a confirmed Reset Demo action.
- **Seeded showcase** — Village C / B2 breakdown with 12 affected students and verified van V1 holding exactly 8 free seats. Eleven requests are pre-seeded and STU-001 is left unreported, so the first report creates the twelfth request without double-counting. The deterministic 12-request plan is 8 proposed / 4 unserved.

---

## Prerequisites

- Node.js 20.19+ (or 22.12+) and npm
- A modern browser
- Git (optional)

## Install and run

```bash
npm install
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173`). Open it in a desktop or mobile-sized viewport.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server with HMR |
| `npm run build` | Type-check with `tsc -b`, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run Oxlint |

## Demo path

0. On first load, the splash draws the night route lattice and then hands off to the app. Press **Enter the demo**, or wait for it to finish. Add `?intro=1` to replay it or `?skipIntro=1` to bypass it.
1. Open the **Student** view. Village C and STU-001 are selected; B2 shows an **unverified** disruption with 11 reports on file.
2. Tap **Bus didn't come**. The report is acknowledged as saved on this device, and the request count becomes 12. Tap another tile — nothing is duplicated.
3. Switch to **Coordinator**. The incident queue shows the B2 breakdown. Confirm it; B2 becomes suspended and the affected count becomes 12.
4. In **Recovery plan**, press **Run recovery analysis**. The draft shows 8 proposed seats on V1 and 4 unserved students, each with a reason. V1 still shows 8 free seats because a draft holds nothing.
5. Press **Approve and confirm 8 seats**. Placements becomes 8, unserved stays 4, V1 free seats becomes 0, and the initial plan is locked as final.
6. Switch to **Student**. STU-001 shows a confirmed pickup card (board 08:35, campus 08:52). Select STU-008 to see the specific unserved reason, then press **Request school assistance** to record an honest escalation.
7. To see a late report, reset and approve a plan **without** step 2 (11 seeded requests, 8 confirmed / 3 unserved). STU-001 now has no request, so reporting after approval is a late report: the board lists it, and **Plan late requests** builds a supplemental draft. With V1 full it proposes no seat and can be approved as an honest all-unserved outcome — the 8 confirmed seats stay byte-identical.
8. Use **Scenarios** on the coordinator board to load **Access road blocked** (0 usable seats; V1 verified but blocked) or **No backup available** (V1 unverified), confirm the disruption, and run the analysis to see deterministic all-unserved plans with exact reasons. Switching asks for confirmation and starts from a clean seed.
9. Load **Exam day crisis** to open the surprise hurdle. The briefing names both failed buses, the 17-student surge, five 09:00 exams, and the flooded Village B road. Report as STU-001 (the seventeenth student), confirm both B1 and B2, then run each plan: B1 proposes 3 seats to Village A on the emergency minibus and leaves two Village B students unserved; B2 proposes 12 seats across V1 and V3. After both approvals the board shows **15 placements, 2 unserved, 1 backup seat left** — the shared fleet is never overbooked. STU-016 (exam day, Village B) is unserved because the road is blocked, not because a detour was invented.
10. Still in the crisis, report as STU-018 from Village B. **Plan late requests** builds a supplemental draft that proposes no seat and names the blocked corridor; approving it raises unserved to 3 while all 15 confirmed seats stay byte-identical.
11. Open **Reset** → **Reset demo** to restore the active scenario.

## Architecture

```text
src/
├── components/          shared UI (header, route rail, recovery plan, chips, dialog,
│                        intro splash, network schematic)
├── data/
│   ├── types.ts         domain contracts
│   ├── demoFixtures.ts  the five scenario seeds
│   ├── scenarios.ts     scenario catalog, seed ids, and id guard
│   ├── labels.ts        UI labels and incident detail copy
│   └── schema.ts        storage key and schema version
├── domain/
│   ├── eligibility.ts   hard-constraint checks per student and vehicle
│   ├── recoveryEngine.ts deterministic priority and allocation
│   ├── metrics.ts       derived counts, free seats, request helpers
│   ├── studentView.ts   student commute stage derivation
│   ├── ids.ts           stable deterministic identifiers
│   └── time.ts          24-hour demo clock formatting
├── state/
│   ├── reducer.ts       all state transitions, including approval
│   ├── store.tsx        React Context provider and save effect
│   ├── context.ts       typed context and `useApp`
│   └── persistence.ts   versioned localStorage read/write with fallbacks
├── pages/
│   ├── StudentHome.tsx
│   └── CoordinatorDashboard.tsx
├── lib/
│   ├── intro.ts         splash gating, session flag, and duration
│   └── cn.ts            class-name helper
├── three/
│   └── introScene.ts    Three.js night lattice, dynamically imported
├── tests/               Vitest suites for scenarios, crisis, engine, replan,
│                        reducer, metrics, persistence, and splash gating
├── App.tsx
└── main.tsx
```

**Stack:** React 19 + Vite 8 + TypeScript (strict) · Tailwind CSS v4 with `@theme` tokens · Lucide React · Three.js (routed into a separate, dynamically imported chunk) · React Context + `useReducer` · versioned `localStorage` · Vitest. Fonts are self-hosted (Archivo, Instrument Sans, IBM Plex Mono).

### State principles

- One canonical `AppState`; every screen reads from it.
- Metrics, free seats, and affected demand are derived, never stored counters.
- Stable IDs (`inc-{vehicle}-{type}`, `hr-{student}-{incident}`, `asg-{request}`, `prop-{incident}`, supplemental `prop-{incident}-r{n}`) prevent duplicates.
- A student report only creates a `reported` signal. Only a coordinator confirm makes it operational.
- A draft proposal never reserves seats. Approval re-checks verification, coverage, accessibility, deadlines, blocked corridors, and per-vehicle capacity; stale state fails safely without partial mutation.
- An approved plan is final **for its own seats**. Late reports never rewrite it; they get a supplemental proposal scoped to the late requests, planned against capacity still free.
- Switching scenario is a full reseed that preserves only the active role. Reset reloads the active scenario.
- Demo state is versioned (`routeless.demo.state.v1`, schema `1`). Invalid, stale, or unknown-scenario data is discarded and the seed is restored.

### Seeded scenario

| Entity | Value |
|---|---|
| Institution | Demo District College (DDC) |
| Villages | A (north), B (east), C (south) |
| B1 | Government bus, verified, 44 seats, 31 occupied, Village A–B, campus 08:20 |
| B2 | Government bus, verified, 40 seats, 28 occupied, Village C, campus 08:25 — **disrupted** |
| V1 | Institution van, verified, accessible, 12 seats, 4 occupied, Village C, campus 08:52 |
| V2 | Institution vehicle, **unverified**, 9 seats, campus 09:05 — never eligible |
| Demanded students | 12 Village C students on B2, STU-001…STU-012 |
| Requests | 11 seeded (STU-002…STU-012); STU-001 starts unreported |
| Clock | Demo 08:00 · class starts 09:00 |
| Incident | B2 disruption, reported 07:58, initially **unverified** |
| Deterministic plan | With 12 requests: 8 seats on V1 to STU-003, STU-004, STU-011, STU-001, STU-002, STU-005, STU-006, STU-007; STU-008, STU-009, STU-010, STU-012 unserved |

### Five scenarios

The first four keep the same twelve-student Village C roster and eleven seeded requests. Only the disruption and the usable verified capacity change. The fifth scenario is the exam-day crisis.

| Scenario | Incident | Usable spare seats | Deterministic outcome |
|---|---|---|---|
| B2 breaks down | `breakdown`, B2 suspended | 8 on V1 | 8 assigned / 4 unserved |
| B2 is overcrowded | `full`, B2 stays in service | 8 on V1 | 8 assigned / 4 unserved |
| Access road blocked | `road_block`, B2 suspended, V1's corridor blocked | 0 | 0 assigned / 12 unserved |
| No backup available | `breakdown`, B2 suspended, V1 unverified | 0 | 0 assigned / 12 unserved |
| Exam day crisis | two `breakdown`s (B1 and B2), flooded Village B road | 16: V1 8 + emergency minibus V3 8 (V3 cannot reach Village B) | 17 expected: 3 on B1 / 2 unserved, 12 on B2 / 0 unserved; approved 15 placed / 2 unserved / 1 seat left |

The crisis seed adds the verified emergency minibus V3 (14 seats, 6 occupied, 8 free) and a third Village B student, STU-018, who can report late. Village B's corridor is blocked for V3, so reachable capacity to that stop is zero; the interface says so instead of inventing a detour. V2 is always visible and always unverified, so it never contributes a seat.

## Testing

```bash
npm run test
```

The suite (10 files, 105 tests) covers seed consistency, duplicate prevention, confirm/dismiss transitions, reset equality, student stage derivation, derived affected counts, reachable backup capacity, free-seat calculation, localStorage validation (including unknown scenario IDs), every eligibility constraint, deterministic priority, the 8/4 plan, idempotent recompute, approval-time capacity re-checks, rejection, zero-backup behavior, all five scenario seeds, the exam-day crisis (two incidents, 17 expected students, five exams, emergency minibus, per-incident plans, shared-fleet approval, blocked-road outcomes, late replan), scoped late replanning, supplemental approval, approved-plan immutability, and splash gating (first visit, session flag, `?skipIntro=1`, `?intro=0`, `?intro=1`, broken storage).

UI flows were additionally checked headlessly (system Chrome + Puppeteer, `puppeteer-core` installed with `--no-save`) across desktop and 375 px mobile with 232 assertions: report → confirm → draft → approve → late report → supplemental draft → supplemental approval → scenario switches → the full crisis flow → reset, plus 29 splash and schematic checks (modal semantics, focus trap, Enter/Esc, auto-dismiss, `intro`/`skipIntro` parameters, session persistence, reduced motion, a WebGL-disabled fallback, and schematic status copy). All flow scripts run against `?skipIntro=1`; screenshots live in `.screenshots/`.

## Known limitations (exam-day crisis)

- **Supplemental plans only use leftover capacity.** A late report cannot displace any confirmed seat, by design. If the fleet is full, the honest outcome is an all-unserved supplemental plan.
- **The crisis is still one fleet.** B1 and B2 share the backup pool, and approval re-checks cumulative capacity. There is no cross-incident optimizer that repacks both plans together; each plan stays deterministic and final once approved.
- **The flood is an access constraint, not a routing engine.** Village B is unreachable because its configured corridor is blocked. The demo does not search for an alternative road and never invents one.
- **Demand surge is a seeded count.** 17 expected students is about 40% above the usual 12; it is not a forecast model.
- **Scenario switching is a reseed.** It is a comparison tool, not a live edit; the current plan is cleared after confirmation.
- **Local only.** Persistence is per-browser `localStorage`; nothing is delivered to a real school, operator, or government office.
- **Not authentication.** The Student/Coordinator switch is a demo view toggle, not access control.
- **Static demo clock.** The app always starts at 08:00 and does not advance; all times are schedule-based.
- **No live data, maps, routing, or ETA feeds.** Travel times and stop times are fixed fixtures.
- **Not deployed yet.** Public deployment and the public repository are later milestones.
- No CSV import/export, offline queue, LLM triage, or multi-device sync.

## Recommended next scope

1. Deployment and public repository, with the demo limitations repeated in the hosted build.
2. An external accessibility audit of the new night/paper contrast pairs and the 3D handoff, beyond the built-in focus trap, reduced-motion path, and keyboard dismissal.
3. A coordinator-initiated review flow for a changed crisis, still requiring explicit human approval and never rewriting confirmed seats silently.
4. Product narrative assets: the crisis and splash screenshots already exist in `.screenshots/`, plus a short demo script and a README walkthrough tightened to 60 seconds.

## Documentation

- [Project spec](docs/PROJECT_SPEC.md)
- [Phase log](docs/PHASE_LOG.md)
- [Decisions](docs/DECISIONS.md)
- [Prompt iterations](docs/PROMPT_ITERATIONS.md)

## Disclaimer

ROUTELESS is an independent hackathon prototype. It is not affiliated with any government transport authority or educational institution. All names, routes, vehicles, students, and times are fictional. The system does not contact anyone and does not dispatch vehicles.
