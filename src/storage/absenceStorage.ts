import AsyncStorage from '@react-native-async-storage/async-storage';
import { AbsenceRecord } from '../types';

const STORAGE_KEY = 'brc_aegir_absences';

export async function loadAbsences(): Promise<AbsenceRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AbsenceRecord[];
    return parsed.sort(
      (a, b) =>
        new Date(b.reportedAtIso).getTime() - new Date(a.reportedAtIso).getTime(),
    );
  } catch {
    return [];
  }
}

export async function saveAbsence(record: AbsenceRecord): Promise<void> {
  const current = await loadAbsences();
  const updated = [record, ...current];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
