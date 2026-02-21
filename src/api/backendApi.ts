import {
  AbsenceRecord,
  AppUser,
  AssignUserInput,
  AthleteGroupKey,
  AttendanceEntry,
  AttendanceSession,
  AuthUser,
  ChildLink,
  CreateGroupInput,
  CreateScheduleInput,
  CreateSessionInput,
  CreateUserRole,
  ExcusedChild,
  GroupMember,
  ReporterType,
  TrainingGroupFull,
  TrainingSessionInstance,
  UpdateGroupInput,
  UpdateScheduleInput,
  UpdateSessionInput,
  UserRole,
} from '../types';
import { apiRequest } from './client';

type BackendAbsence = Omit<AbsenceRecord, 'trainingStartIso' | 'reportedAtIso'> & {
  trainingStartIso?: string;
  reportedAtIso?: string;
  trainingStart?: string;
  reportedAt?: string;
  reasonText?: string | null;
};

function normalizeAbsence(absence: BackendAbsence): AbsenceRecord {
  return {
    ...absence,
    trainingStartIso: absence.trainingStartIso ?? absence.trainingStart ?? new Date().toISOString(),
    reportedAtIso: absence.reportedAtIso ?? absence.reportedAt ?? new Date().toISOString(),
    reason: 'krank',
    reasonText: absence.reasonText ?? null,
  };
}

export async function login(email: string, password: string): Promise<{ accessToken: string; user: AuthUser }> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function requestPasswordSetup(email: string): Promise<{ message: string; setupLink?: string }> {
  return apiRequest('/api/auth/request-password-setup', {
    method: 'POST',
    body: { email },
  });
}

export async function setupPassword(token: string, password: string): Promise<{ message: string }> {
  return apiRequest('/api/auth/setup-password', {
    method: 'POST',
    body: { token, password },
  });
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  return apiRequest('/api/auth/me', {
    token,
  });
}

export async function listUsers(token: string): Promise<AppUser[]> {
  return apiRequest('/api/users', {
    token,
  });
}

export async function listUsersByRole(token: string, role: UserRole): Promise<AppUser[]> {
  return apiRequest(`/api/users?role=${encodeURIComponent(role)}`, {
    token,
  });
}

export async function createUser(
  token: string,
  payload: { email: string; displayName: string; role: CreateUserRole; password?: string },
): Promise<{ message: string; setupLink?: string; user: AuthUser }> {
  return apiRequest('/api/users', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function deleteUser(token: string, userId: number): Promise<void> {
  await apiRequest(`/api/users/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export async function listAbsences(): Promise<AbsenceRecord[]> {
  const rows = await apiRequest<BackendAbsence[]>('/api/absences');
  return rows.map(normalizeAbsence);
}

export async function createAbsence(payload: {
  athleteName: string;
  reporterName: string;
  reporterType: ReporterType;
  groupKey: string;
  trainingStartIso: string;
  reasonText?: string;
}): Promise<AbsenceRecord> {
  const result = await apiRequest<BackendAbsence>('/api/absences', {
    method: 'POST',
    body: payload,
  });
  return normalizeAbsence(result);
}

export async function listChildren(token: string): Promise<ChildLink[]> {
  return apiRequest('/api/family/children', { token });
}

export async function linkParentChild(token: string, payload: { parentEmail: string; childEmail: string }) {
  return apiRequest('/api/family/link', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function listAttendanceSessions(
  token: string,
  params?: { from?: string; to?: string },
): Promise<AttendanceSession[]> {
  const query = new URLSearchParams();
  if (params?.from) query.append('from', params.from);
  if (params?.to) query.append('to', params.to);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest(`/api/attendance/sessions${suffix}`, { token });
}

export async function createAttendanceSession(
  token: string,
  payload: { groupKey: string; trainingStartIso: string },
): Promise<AttendanceSession> {
  return apiRequest('/api/attendance/sessions', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function listAttendanceEntries(token: string, sessionId: number): Promise<AttendanceEntry[]> {
  return apiRequest(`/api/attendance/sessions/${sessionId}/entries`, { token });
}

export async function upsertAttendanceEntry(
  token: string,
  sessionId: number,
  payload: { childId: number; status: 'present' | 'excused' | 'unexcused'; note?: string },
): Promise<AttendanceEntry> {
  return apiRequest(`/api/attendance/sessions/${sessionId}/entries`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function listExcusedChildren(token: string, sessionId: number): Promise<ExcusedChild[]> {
  return apiRequest(`/api/attendance/sessions/${sessionId}/excused`, { token });
}

export async function exportAttendanceCsv(token: string, params?: { from?: string; to?: string }) {
  const query = new URLSearchParams();
  if (params?.from) query.append('from', params.from);
  if (params?.to) query.append('to', params.to);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<string>(`/api/attendance/export${suffix}`, { token, responseType: 'text' });
}

// ===== Training Groups API =====

export async function listTrainingGroups(token: string): Promise<TrainingGroupFull[]> {
  return apiRequest('/api/training-groups', { token });
}

export async function createTrainingGroup(token: string, data: CreateGroupInput): Promise<TrainingGroupFull> {
  return apiRequest('/api/training-groups', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function updateTrainingGroup(token: string, groupId: number, data: UpdateGroupInput): Promise<TrainingGroupFull> {
  return apiRequest(`/api/training-groups/${groupId}`, {
    method: 'PUT',
    token,
    body: data,
  });
}

export async function deleteTrainingGroup(token: string, groupId: number): Promise<void> {
  await apiRequest(`/api/training-groups/${groupId}`, {
    method: 'DELETE',
    token,
  });
}

export async function addScheduleToGroup(token: string, groupId: number, data: CreateScheduleInput): Promise<TrainingGroupFull> {
  return apiRequest(`/api/training-groups/${groupId}/schedules`, {
    method: 'POST',
    token,
    body: data,
  });
}

export async function removeSchedule(token: string, groupId: number, scheduleId: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/training-groups/${groupId}/schedules/${scheduleId}`, {
    method: 'DELETE',
    token,
  });
}

export async function updateGroupSchedule(
  token: string,
  groupId: number,
  scheduleId: number,
  data: UpdateScheduleInput,
): Promise<TrainingGroupFull> {
  return apiRequest(`/api/training-groups/${groupId}/schedules/${scheduleId}`, {
    method: 'PUT',
    token,
    body: data,
  });
}

export async function assignUserToGroup(token: string, groupId: number, data: AssignUserInput): Promise<{ success: boolean }> {
  return apiRequest(`/api/training-groups/${groupId}/assign`, {
    method: 'POST',
    token,
    body: data,
  });
}

export async function unassignUserFromGroup(token: string, groupId: number, userId: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/training-groups/${groupId}/assign/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getGroupMembers(token: string, groupId: number): Promise<GroupMember[]> {
  return apiRequest(`/api/training-groups/${groupId}/members`, { token });
}

export async function getGroupSessions(token: string, groupId: number, days?: number): Promise<TrainingSessionInstance[]> {
  const query = days ? `?days=${days}` : '';
  return apiRequest(`/api/training-groups/${groupId}/sessions${query}`, { token });
}

export async function createTrainingSession(token: string, data: CreateSessionInput): Promise<TrainingSessionInstance> {
  return apiRequest('/api/training-groups/sessions', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function updateTrainingSession(token: string, sessionId: number, data: UpdateSessionInput): Promise<TrainingSessionInstance> {
  return apiRequest(`/api/training-groups/sessions/${sessionId}`, {
    method: 'PUT',
    token,
    body: data,
  });
}

export async function getMyGroups(token: string): Promise<TrainingGroupFull[]> {
  return apiRequest('/api/training-groups/my-groups', { token });
}
