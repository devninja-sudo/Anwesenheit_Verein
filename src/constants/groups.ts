import { TrainingGroup } from '../types';

export const TRAINING_GROUPS: TrainingGroup[] = [
  {
    key: 'junior',
    name: 'Gruppe 1 (Junioren)',
    sessions: [
      { weekday: 1, hour: 16, minute: 30 },
      { weekday: 3, hour: 16, minute: 30 },
      { weekday: 5, hour: 16, minute: 30 },
    ],
  },
  {
    key: 'youth',
    name: 'Gruppe 2 (Jugend)',
    sessions: [
      { weekday: 2, hour: 17, minute: 30 },
      { weekday: 4, hour: 17, minute: 30 },
      { weekday: 6, hour: 10, minute: 0 },
    ],
  },
  {
    key: 'performance',
    name: 'Gruppe 3 (Leistung)',
    sessions: [
      { weekday: 1, hour: 18, minute: 0 },
      { weekday: 2, hour: 18, minute: 0 },
      { weekday: 4, hour: 18, minute: 0 },
      { weekday: 5, hour: 18, minute: 0 },
    ],
  },
];
