import type {
  AppState,
  Assignment,
  HelpRequest,
  Incident,
  Student,
  TransportOption,
} from '../data/types'
import { incidentForOption, latestRequestForStudent } from './metrics'

export type CommuteStage =
  | 'scheduled'
  | 'reported'
  | 'confirmed'
  | 'dismissed'
  | 'proposed'
  | 'assigned'
  | 'unserved'
  | 'escalated'

/** Whether this student's disruption has no plan, a draft, or an approved plan. */
export type PlanState = 'none' | 'draft' | 'approved'

export type StudentSituation = {
  student: Student
  option?: TransportOption
  incident?: Incident
  request?: HelpRequest
  assignment?: Assignment
  unservedReason?: string
  planState: PlanState
  stage: CommuteStage
}

export function getStudentSituation(
  state: AppState,
  studentId: string,
): StudentSituation | null {
  const student = state.students.find((candidate) => candidate.id === studentId)
  if (!student) return null

  const option = state.transportOptions.find(
    (candidate) => candidate.id === student.routeOptionId,
  )
  const request = latestRequestForStudent(state, student.id)
  const incident = request
    ? state.incidents.find((candidate) => candidate.id === request.incidentId)
    : option
      ? incidentForOption(state, option.id)
      : undefined

  const assignment = request
    ? state.assignments.find(
        (candidate) =>
          candidate.requestId === request.id && candidate.status !== 'cancelled',
      )
    : undefined
  // A late report is covered by a supplemental proposal, not the first plan.
  // Find the proposal that actually names this request.
  const proposal = request
    ? state.proposals.find(
        (candidate) =>
          candidate.incidentId === request.incidentId &&
          candidate.status !== 'discarded' &&
          (candidate.unserved.some((entry) => entry.requestId === request.id) ||
            candidate.assignmentIds.some(
              (assignmentId) =>
                state.assignments.find((a) => a.id === assignmentId)
                  ?.requestId === request.id,
            )),
      )
    : undefined
  const unservedReason = request
    ? proposal?.unserved.find((entry) => entry.requestId === request.id)?.reason
    : undefined

  const incidentProposals = incident
    ? state.proposals.filter(
        (candidate) =>
          candidate.incidentId === incident.id && candidate.status !== 'discarded',
      )
    : []
  const planState: PlanState = incidentProposals.some(
    (candidate) => candidate.status === 'approved',
  )
    ? 'approved'
    : incidentProposals.length > 0
      ? 'draft'
      : 'none'

  // Stage describes the student's own request. A route-level incident without
  // a report from this student still leaves them at 'scheduled' demand.
  let stage: CommuteStage = 'scheduled'
  if (request) {
    if (request.status === 'confirmed') stage = 'assigned'
    else if (request.status === 'proposed') stage = 'proposed'
    else if (request.status === 'unserved') stage = 'unserved'
    else if (request.status === 'escalated') stage = 'escalated'
    else if (incident?.status === 'confirmed') stage = 'confirmed'
    else if (incident?.status === 'reported') stage = 'reported'
    else if (incident?.status === 'dismissed') stage = 'dismissed'
  }

  return {
    student,
    option,
    incident,
    request,
    assignment,
    unservedReason,
    planState,
    stage,
  }
}
