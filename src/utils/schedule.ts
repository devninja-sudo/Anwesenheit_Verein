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
