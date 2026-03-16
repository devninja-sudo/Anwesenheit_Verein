export type ReporterType = 'athlete' | 'parent';
export type SessionType = 'training' | 'event';

export type AthleteGroupKey = 'junior' | 'youth' | 'performance';

// Legacy types - to be deprecated
export type TrainingSession = {
  weekday: number;
  hour: number;
  minute: number;
};

export type TrainingGroup = {
  key: AthleteGroupKey;
  name: string;
  sessions: TrainingSession[];
};

// New training group types matching backend
export type TrainingSchedule = {
  id: number;
  groupId: number;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  location?: string | null;
  isActive: boolean;
};

export type TrainingGroupFull = {
  id: number;
  name: string;
  key: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  schedules: TrainingSchedule[];
};

export type TrainingSessionInstance = {
  id: number;
  groupId: number;
  sessionType: SessionType;
  title?: string | null;
  scheduleId: number | null;
  scheduledDate: string; // ISO date
  endDate?: string | null;
  eventDeadline?: string | null;
  eventGroupIds?: number[];
  comment?: string | null;
  location?: string | null;
  isCancelled: boolean;
  minTrainers?: number;
  trainerWarningDismissed?: boolean;
  myTrainerStatus?: TrainerAvailabilityStatus | null;
  availabilitySummary?: TrainerAvailabilitySummary;
  createdAt: string;
};

export type TrainerAvailabilityStatus = 'A' | 'U' | 'N';

export type TrainerAvailabilitySummary = {
  available: number;
  uncertain: number;
  notAvailable: number;
  totalResponses: number;
  minimumRequired: number;
  isWarning: boolean;
  isDismissed: boolean;
};

export type GroupMember = {
  id: number;
  userId: number;
  groupId: number;
  user: {
    id: number;
    displayName: string;
    email: string;
    role: UserRole;
  };
  assignedAt: string;
};

// Input types for API calls
export type CreateGroupInput = {
  name: string;
  key: string;
  description?: string;
};

export type UpdateGroupInput = {
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateScheduleInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
};

export type UpdateScheduleInput = {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  location?: string;
  isActive?: boolean;
};

export type CreateSessionInput = {
  groupId: number;
  sessionType?: SessionType;
  title?: string;
  scheduledDate: string;
  endDate?: string;
  eventDeadline?: string;
  eventGroupIds?: number[];
  comment?: string;
  location?: string;
  minTrainers?: number;
};

export type UpdateSessionInput = {
  groupId?: number;
  sessionType?: SessionType;
  title?: string;
  scheduleId?: number;
  scheduledDate?: string;
  endDate?: string;
  eventDeadline?: string;
  eventGroupIds?: number[];
  comment?: string;
  location?: string;
  isCancelled?: boolean;
  minTrainers?: number;
  trainerWarningDismissed?: boolean;
};

export type AssignUserInput = {
  userId: number;
};

export type AbsenceRecord = {
  id: string | number;
  athleteName: string;
  reporterName: string;
  reporterType: ReporterType;
  groupKey: string;
  sessionId?: number | null;
  sessionType?: SessionType;
  sessionLabel?: string | null;
  trainingStartIso: string;
  reportedAtIso: string;
  trainingStart?: string;
  reportedAt?: string;
  reason: 'krank';
  reasonText?: string | null;
};

export type UserRole = 'user' | 'parent' | 'child' | 'trainer' | 'admin';

export type CreateUserRole = 'parent' | 'child' | 'trainer';

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
};

export type AppUser = AuthUser & {
  isActive?: boolean;
  createdAt?: string;
};

export type ChildLink = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  parentEmail?: string;
};

export type AttendanceSession = {
  id: number;
  groupKey: AthleteGroupKey;
  trainingStart: string;
  createdAt: string;
  entryCount: number;
};

export type AttendanceEntry = {
  id: number;
  childId: number | null;
  athleteName: string;
  status: 'present' | 'excused' | 'unexcused';
  note?: string | null;
  recordedAt: string;
};

export type ExcusedChild = {
  id: number;
  displayName: string;
};
