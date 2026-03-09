import { TrainingGroup, TrainingSchedule } from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getUpcomingGroupSessions(group: TrainingGroup, daysAhead = 21): Date[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessions: Date[] = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const day = new Date(startOfToday.getTime() + offset * ONE_DAY_MS);

    group.sessions.forEach((session) => {
      if (day.getDay() !== session.weekday) {
        return;
      }

      const start = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        session.hour,
        session.minute,
        0,
        0,
      );

      if (start.getTime() > now.getTime()) {
        sessions.push(start);
      }
    });
  }

  return sessions.sort((a, b) => a.getTime() - b.getTime());
}

export function getUpcomingScheduleSessions(schedules: TrainingSchedule[], daysAhead = 21): Date[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessions: Date[] = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const day = new Date(startOfToday.getTime() + offset * ONE_DAY_MS);

    schedules.forEach((schedule) => {
      if (!schedule.isActive || day.getDay() !== schedule.dayOfWeek) {
        return;
      }

      const [hours, minutes] = schedule.startTime.split(':').map((value) => Number(value));
      const start = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hours,
        minutes,
        0,
        0,
      );

      if (start.getTime() > now.getTime()) {
        sessions.push(start);
      }
    });
  }

  return sessions.sort((a, b) => a.getTime() - b.getTime());
}

export function getAttendanceRelevantScheduleSessions(
  schedules: TrainingSchedule[],
  daysAhead = 21,
  lookbackDays = 2,
): Date[] {
  const now = new Date();
  const fourHoursMs = 4 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessions: Date[] = [];

  for (let offset = -lookbackDays; offset <= daysAhead; offset += 1) {
    const day = new Date(startOfToday.getTime() + offset * ONE_DAY_MS);

    schedules.forEach((schedule) => {
      if (!schedule.isActive || day.getDay() !== schedule.dayOfWeek) {
        return;
      }

      const [startHours, startMinutes] = schedule.startTime.split(':').map((value) => Number(value));
      const [endHours, endMinutes] = schedule.endTime.split(':').map((value) => Number(value));

      const start = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        startHours,
        startMinutes,
        0,
        0,
      );
      const end = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        endHours,
        endMinutes,
        0,
        0,
      );

      if (end.getTime() <= start.getTime()) {
        end.setDate(end.getDate() + 1);
      }

      const isUpcoming = start.getTime() > now.getTime();
      const isWithinAttendanceWindow =
        now.getTime() >= start.getTime() - fourHoursMs && now.getTime() <= end.getTime() + fourHoursMs;

      if (isUpcoming || isWithinAttendanceWindow) {
        sessions.push(start);
      }
    });
  }

  return sessions.sort((a, b) => a.getTime() - b.getTime());
}

export function getScheduleSessionEnd(trainingStart: Date, schedules: TrainingSchedule[]): Date {
  const startHour = trainingStart.getHours().toString().padStart(2, '0');
  const startMinute = trainingStart.getMinutes().toString().padStart(2, '0');
  const startTime = `${startHour}:${startMinute}`;

  const matchingSchedule = schedules.find(
    (schedule) =>
      schedule.isActive &&
      schedule.dayOfWeek === trainingStart.getDay() &&
      schedule.startTime === startTime,
  );

  if (!matchingSchedule) {
    return new Date(trainingStart.getTime());
  }

  const [endHours, endMinutes] = matchingSchedule.endTime.split(':').map((value) => Number(value));
  const end = new Date(
    trainingStart.getFullYear(),
    trainingStart.getMonth(),
    trainingStart.getDate(),
    endHours,
    endMinutes,
    0,
    0,
  );

  if (end.getTime() <= trainingStart.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  return end;
}

export function isSickCallAllowed(trainingStart: Date, reportedAt = new Date()): boolean {
  const diffMs = trainingStart.getTime() - reportedAt.getTime();
  return diffMs >= ONE_DAY_MS;
}

export function formatGermanDateTime(value: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}
