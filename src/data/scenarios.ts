import type { ScenarioId } from './types'

export type ScenarioBriefing = {
  label: string
  value: string
  detail: string
}

export type ScenarioMeta = {
  id: ScenarioId
  title: string
  description: string
  status: 'available' | 'planned'
  /** Seeded crisis facts shown in both views. Demo data only. */
  briefing?: ScenarioBriefing[]
}

/**
 * Each scenario is a full seed. The first four keep the same twelve-student
 * Village C roster and change the disruption or verified capacity. The
 * exam-day crisis adds a second failed bus, Village A/B demand, a flooded
 * Village B road, and a fifth vehicle so the recovery engine faces a
 * network-level event rather than a single route.
 */
export const SCENARIO_CATALOG: ScenarioMeta[] = [
  {
    id: 'breakdown',
    title: 'B2 breaks down',
    description:
      'Twelve Village C students lose B2. Verified van V1 has eight free seats.',
    status: 'available',
  },
  {
    id: 'overcrowding',
    title: 'B2 is overcrowded',
    description:
      "B2 is reported full. V1's eight seats cover part of the demand; the rest wait.",
    status: 'available',
  },
  {
    id: 'road_block',
    title: 'Access road blocked',
    description:
      'A blocked corridor removes V1 instead of inventing a detour. No seats can be offered.',
    status: 'available',
  },
  {
    id: 'no_backup',
    title: 'No backup available',
    description:
      'No verified backup vehicle. All twelve students must be marked unserved.',
    status: 'available',
  },
  {
    id: 'exam_crisis',
    title: 'Exam day crisis',
    description:
      'Both government buses fail on exam day. 17 students need a seat — about 40% above the usual load — a flooded road cuts off Village B, and five students sit exams at 09:00.',
    status: 'available',
    briefing: [
      {
        label: 'Buses out',
        value: 'B1 + B2',
        detail: 'Both scheduled government buses are unavailable.',
      },
      {
        label: 'Demand',
        value: '17 students',
        detail: 'About 40% above the usual 12-student load.',
      },
      {
        label: 'Exams',
        value: '5 at 09:00',
        detail: 'Exam arrivals have zero grace in this demo.',
      },
      {
        label: 'Road',
        value: 'Village B',
        detail: 'Flooded access road. No verified detour is configured.',
      },
    ],
  },
]

export const DEFAULT_SCENARIO_ID: ScenarioId = 'breakdown'

export function isScenarioId(value: string): value is ScenarioId {
  return SCENARIO_CATALOG.some((scenario) => scenario.id === value)
}
