import type {
  AppState,
  Assignment,
  HelpRequest,
  Incident,
  IncidentType,
  RecoveryProposal,
  RequestStatus,
  Role,
  ScenarioId,
  VehicleStatus,
} from '../data/types'
import { INCIDENT_TYPE_DETAILS } from '../data/labels'
import { createInitialState } from '../data/demoFixtures'
import { isScenarioId } from '../data/scenarios'
import { helpRequestId, incidentId } from '../domain/ids'
import { assessVehicleForStudent } from '../domain/eligibility'
import { buildRecoveryPlan } from '../domain/recoveryEngine'
import type { RecoveryPlan } from '../domain/recoveryEngine'
import { freeSeats } from '../domain/metrics'

export type AppAction =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'SELECT_VILLAGE'; villageId: string }
  | { type: 'SELECT_STUDENT'; studentId: string }
  | { type: 'REPORT_PROBLEM'; studentId: string; incidentType: IncidentType }
  | { type: 'CONFIRM_INCIDENT'; incidentId: string }
  | { type: 'DISMISS_INCIDENT'; incidentId: string }
  | { type: 'ESCALATE_REQUEST'; requestId: string }
  | { type: 'RUN_RECOVERY'; incidentId: string }
  | { type: 'RUN_REPLAN'; incidentId: string }
  | { type: 'APPROVE_PROPOSAL'; proposalId: string }
  | { type: 'REJECT_PROPOSAL'; proposalId: string }
  | { type: 'LOAD_SCENARIO'; scenarioId: ScenarioId }
  | { type: 'RESET_DEMO' }

/** Only these incident types change the vehicle's operating state on confirmation. */
const VEHICLE_STATUS_ON_CONFIRM: Record<IncidentType, VehicleStatus | null> = {
  breakdown: 'cancelled',
  no_show: 'cancelled',
  road_block: 'cancelled',
  delay: 'delayed',
  full: null,
}

function reportProblem(
  state: AppState,
  studentIdValue: string,
  type: IncidentType,
): AppState {
  const student = state.students.find((s) => s.id === studentIdValue)
  if (!student) return state
  const option = state.transportOptions.find((o) => o.id === student.routeOptionId)
  if (!option) return state

  let incidents = state.incidents
  let incident: Incident | undefined = incidents.find(
    (i) => i.transportOptionId === option.id && i.status !== 'dismissed',
  )

  if (!incident) {
    // A dismissed report can be reopened by a fresh signal, keeping the id stable.
    const dismissed = incidents.find(
      (i) => i.transportOptionId === option.id && i.type === type,
    )
    if (dismissed) {
      incident = {
        ...dismissed,
        status: 'reported',
        reportedAtMin: state.clockMin,
        confirmedAtMin: undefined,
        details: INCIDENT_TYPE_DETAILS[type],
      }
      incidents = incidents.map((i) => (i.id === dismissed.id ? incident! : i))
    } else {
      incident = {
        id: incidentId(option.id, type),
        transportOptionId: option.id,
        type,
        status: 'reported',
        reportedBy: 'student',
        reportedAtMin: state.clockMin,
        affectedVillageIds: [student.villageId],
        details: INCIDENT_TYPE_DETAILS[type],
      }
      incidents = [incident, ...incidents]
    }
  }

  if (!incident) return state

  if (!incident.affectedVillageIds.includes(student.villageId)) {
    const expanded: Incident = {
      ...incident,
      affectedVillageIds: [...incident.affectedVillageIds, student.villageId],
    }
    incidents = incidents.map((i) => (i.id === expanded.id ? expanded : i))
    incident = expanded
  }

  const existing = state.helpRequests.find(
    (request) =>
      request.studentId === student.id && request.incidentId === incident.id,
  )
  if (existing) {
    return { ...state, incidents }
  }

  const request: HelpRequest = {
    id: helpRequestId(student.id, incident.id),
    studentId: student.id,
    incidentId: incident.id,
    status: 'pending',
    createdAtMin: state.clockMin,
    source: 'student',
  }

  return {
    ...state,
    incidents,
    helpRequests: [...state.helpRequests, request],
  }
}

/**
 * Undo the request and assignment effects of proposals that are being replaced.
 * Approved proposals are never passed here, so confirmed seats are untouched.
 */
function releaseProposals(
  state: AppState,
  proposals: RecoveryProposal[],
): AppState {
  if (proposals.length === 0) return state
  const proposalIds = new Set(proposals.map((proposal) => proposal.id))
  const assignmentIds = new Set(
    proposals.flatMap((proposal) => proposal.assignmentIds),
  )
  const requestIds = new Set<string>()
  for (const assignment of state.assignments) {
    if (assignmentIds.has(assignment.id)) requestIds.add(assignment.requestId)
  }
  for (const proposal of proposals) {
    for (const entry of proposal.unserved) requestIds.add(entry.requestId)
  }

  return {
    ...state,
    assignments: state.assignments.filter(
      (assignment) => !assignmentIds.has(assignment.id),
    ),
    helpRequests: state.helpRequests.map((request) =>
      requestIds.has(request.id) &&
      (request.status === 'proposed' || request.status === 'unserved')
        ? { ...request, status: 'pending' }
        : request,
    ),
    proposals: state.proposals.filter(
      (proposal) => !proposalIds.has(proposal.id),
    ),
  }
}

function applyPlan(
  state: AppState,
  plan: RecoveryPlan,
  proposal: { id: string; kind: 'initial' | 'replan'; createdAtMin: number },
): AppState {
  const newAssignments: Assignment[] = plan.assignments.map((entry) => ({
    ...entry,
    status: 'proposed',
    createdAtMin: proposal.createdAtMin,
  }))

  const nextStatus = new Map<string, RequestStatus>()
  for (const entry of plan.assignments) {
    nextStatus.set(entry.requestId, 'proposed')
  }
  for (const entry of plan.unserved) {
    nextStatus.set(entry.requestId, 'unserved')
  }

  return {
    ...state,
    assignments: [...state.assignments, ...newAssignments],
    helpRequests: state.helpRequests.map((request) => {
      const status = nextStatus.get(request.id)
      return status ? { ...request, status } : request
    }),
    proposals: [
      ...state.proposals,
      {
        id: proposal.id,
        incidentId: plan.incidentId,
        createdAtMin: proposal.createdAtMin,
        status: 'draft',
        kind: proposal.kind,
        assignmentIds: plan.assignments.map((entry) => entry.id),
        unserved: plan.unserved.map((entry) => ({ ...entry })),
      },
    ],
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROLE': {
      if (state.role === action.role) return state
      return { ...state, role: action.role }
    }

    case 'SELECT_VILLAGE': {
      if (!state.villages.some((village) => village.id === action.villageId)) {
        return state
      }
      const firstStudent = state.students.find(
        (student) => student.villageId === action.villageId,
      )
      return {
        ...state,
        selectedVillageId: action.villageId,
        selectedStudentId: firstStudent
          ? firstStudent.id
          : state.selectedStudentId,
      }
    }

    case 'SELECT_STUDENT': {
      const student = state.students.find((s) => s.id === action.studentId)
      if (!student) return state
      return {
        ...state,
        selectedStudentId: student.id,
        selectedVillageId: student.villageId,
      }
    }

    case 'REPORT_PROBLEM':
      return reportProblem(state, action.studentId, action.incidentType)

    case 'CONFIRM_INCIDENT': {
      const incident = state.incidents.find((i) => i.id === action.incidentId)
      if (!incident || incident.status !== 'reported') return state

      const nextVehicleStatus: VehicleStatus | null =
        VEHICLE_STATUS_ON_CONFIRM[incident.type]

      return {
        ...state,
        incidents: state.incidents.map((candidate) =>
          candidate.id === incident.id
            ? {
                ...candidate,
                status: 'confirmed',
                confirmedAtMin: state.clockMin,
              }
            : candidate,
        ),
        transportOptions: nextVehicleStatus
          ? state.transportOptions.map((option) =>
              option.id === incident.transportOptionId
                ? { ...option, status: nextVehicleStatus }
                : option,
            )
          : state.transportOptions,
      }
    }

    case 'DISMISS_INCIDENT': {
      const incident = state.incidents.find((i) => i.id === action.incidentId)
      if (!incident || incident.status !== 'reported') return state
      return {
        ...state,
        incidents: state.incidents.map((candidate) =>
          candidate.id === incident.id
            ? { ...candidate, status: 'dismissed' }
            : candidate,
        ),
      }
    }

    case 'ESCALATE_REQUEST': {
      const request = state.helpRequests.find((r) => r.id === action.requestId)
      if (!request || request.status !== 'unserved') return state
      return {
        ...state,
        helpRequests: state.helpRequests.map((candidate) =>
          candidate.id === request.id
            ? { ...candidate, status: 'escalated' }
            : candidate,
        ),
      }
    }

    case 'RUN_RECOVERY': {
      const incident = state.incidents.find((i) => i.id === action.incidentId)
      if (!incident || incident.status !== 'confirmed') return state

      // An approved plan is final: never silently replace confirmed seats.
      // Late reports use RUN_REPLAN, which only supplements the approved plan.
      if (
        state.proposals.some(
          (proposal) =>
            proposal.incidentId === incident.id && proposal.status === 'approved',
        )
      ) {
        return state
      }

      const cleaned = releaseProposals(
        state,
        state.proposals.filter((proposal) => proposal.incidentId === incident.id),
      )
      const plan = buildRecoveryPlan(cleaned, incident.id)

      return applyPlan(cleaned, plan, {
        id: `prop-${incident.id}`,
        kind: 'initial',
        createdAtMin: state.clockMin,
      })
    }

    case 'RUN_REPLAN': {
      const incident = state.incidents.find((i) => i.id === action.incidentId)
      if (!incident || incident.status !== 'confirmed') return state

      // Supplemental planning only exists on top of an approved plan.
      if (
        !state.proposals.some(
          (proposal) =>
            proposal.incidentId === incident.id && proposal.status === 'approved',
        )
      ) {
        return state
      }

      const priorDrafts = state.proposals.filter(
        (proposal) =>
          proposal.incidentId === incident.id &&
          proposal.kind === 'replan' &&
          proposal.status === 'draft',
      )
      // Recompute covers late requests plus whatever the previous draft covered,
      // so "recompute" can release or move a previously proposed seat.
      const draftCovered = new Set<string>()
      for (const proposal of priorDrafts) {
        for (const entry of proposal.unserved) draftCovered.add(entry.requestId)
        for (const id of proposal.assignmentIds) {
          const assignment = state.assignments.find((entry) => entry.id === id)
          if (assignment) draftCovered.add(assignment.requestId)
        }
      }
      const candidates = state.helpRequests.filter(
        (request) =>
          request.incidentId === incident.id &&
          (request.status === 'pending' || draftCovered.has(request.id)),
      )
      if (candidates.length === 0) return state

      // Replace an earlier supplemental draft; approved plans stay untouched.
      const cleaned = releaseProposals(state, priorDrafts)
      const plan = buildRecoveryPlan(
        cleaned,
        incident.id,
        candidates.map((request) => request.id),
      )
      const replanCount = state.proposals.filter(
        (proposal) =>
          proposal.incidentId === incident.id && proposal.kind === 'replan',
      ).length

      return applyPlan(cleaned, plan, {
        id: `prop-${incident.id}-r${replanCount + 1}`,
        kind: 'replan',
        createdAtMin: state.clockMin,
      })
    }

    case 'APPROVE_PROPOSAL': {
      const proposal = state.proposals.find((entry) => entry.id === action.proposalId)
      if (!proposal || proposal.status !== 'draft') return state
      const incident = state.incidents.find((entry) => entry.id === proposal.incidentId)
      if (!incident || incident.status !== 'confirmed') return state
      // An all-unserved plan is valid: approving it records the honest outcome.
      if (proposal.assignmentIds.length === 0 && proposal.unserved.length === 0) {
        return state
      }

      const assignments = proposal.assignmentIds.map((id) =>
        state.assignments.find((entry) => entry.id === id),
      )
      if (assignments.some((entry) => !entry)) return state

      const requestIds = new Set<string>()
      const studentIds = new Set<string>()
      const perOption = new Map<string, number>()

      for (const assignment of assignments) {
        if (!assignment || assignment.status !== 'proposed') return state
        if (requestIds.has(assignment.requestId)) return state
        if (studentIds.has(assignment.studentId)) return state
        requestIds.add(assignment.requestId)
        studentIds.add(assignment.studentId)

        const request = state.helpRequests.find(
          (entry) => entry.id === assignment.requestId,
        )
        const student = state.students.find(
          (entry) => entry.id === assignment.studentId,
        )
        const option = state.transportOptions.find(
          (entry) => entry.id === assignment.transportOptionId,
        )
        if (!request || !student || !option) return state
        if (
          request.incidentId !== proposal.incidentId ||
          request.status !== 'proposed'
        ) {
          return state
        }

        // Re-check every hard constraint against current state.
        const assessment = assessVehicleForStudent(state, student, option)
        if (!assessment.eligible) return state

        perOption.set(option.id, (perOption.get(option.id) ?? 0) + 1)
      }

      for (const [optionId, count] of perOption) {
        const option = state.transportOptions.find((entry) => entry.id === optionId)
        if (!option || count > freeSeats(state, option)) return state
      }

      for (const entry of proposal.unserved) {
        if (requestIds.has(entry.requestId)) return state
        const request = state.helpRequests.find(
          (candidate) => candidate.id === entry.requestId,
        )
        if (
          !request ||
          request.incidentId !== proposal.incidentId ||
          request.status !== 'unserved'
        ) {
          return state
        }
      }

      const assignmentIds = new Set(proposal.assignmentIds)
      return {
        ...state,
        assignments: state.assignments.map((assignment) =>
          assignmentIds.has(assignment.id)
            ? { ...assignment, status: 'confirmed' }
            : assignment,
        ),
        helpRequests: state.helpRequests.map((request) =>
          requestIds.has(request.id)
            ? { ...request, status: 'confirmed' }
            : request,
        ),
        proposals: state.proposals.map((entry) =>
          entry.id === proposal.id ? { ...entry, status: 'approved' } : entry,
        ),
      }
    }

    case 'REJECT_PROPOSAL': {
      const proposal = state.proposals.find((entry) => entry.id === action.proposalId)
      if (!proposal || proposal.status !== 'draft') return state

      const assignmentIds = new Set(proposal.assignmentIds)
      const requestIds = new Set<string>()
      for (const assignment of state.assignments) {
        if (assignmentIds.has(assignment.id)) requestIds.add(assignment.requestId)
      }
      for (const entry of proposal.unserved) requestIds.add(entry.requestId)

      return {
        ...state,
        assignments: state.assignments.filter(
          (assignment) => !assignmentIds.has(assignment.id),
        ),
        helpRequests: state.helpRequests.map((request) =>
          requestIds.has(request.id) &&
          (request.status === 'proposed' || request.status === 'unserved')
            ? { ...request, status: 'pending' }
            : request,
        ),
        proposals: state.proposals.map((entry) =>
          entry.id === proposal.id ? { ...entry, status: 'discarded' } : entry,
        ),
      }
    }

    case 'LOAD_SCENARIO': {
      if (!isScenarioId(action.scenarioId)) return state
      if (action.scenarioId === state.scenarioId) return state
      // A scenario switch is a fresh seed; the selected view is preserved.
      return { ...createInitialState(action.scenarioId), role: state.role }
    }

    case 'RESET_DEMO':
      return createInitialState(state.scenarioId)

    default:
      return state
  }
}
