import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AbsenceRecord, AppUser, TrainingGroupFull, TrainingSessionInstance } from '../types';
import { formatGermanDateTime } from '../utils/schedule';
import { getGroupSessions, getMyGroups, listTrainingGroups } from '../api/backendApi';
import { useAppTheme } from '../theme/colors';

type StartTabProps = {
  currentUser: AppUser | null;
  absences: AbsenceRecord[];
  authToken?: string;
};

export function StartTab({ currentUser, absences, authToken }: StartTabProps) {
  const colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const isTrainerView = currentUser?.role === 'trainer' || currentUser?.role === 'admin';
  const [allGroups, setAllGroups] = useState<TrainingGroupFull[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<TrainingSessionInstance[]>([]);

  const nextSession = upcomingSessions.at(0) ?? null;
  const nextTraining = nextSession ? new Date(nextSession.scheduledDate) : null;

  const nextTrainingAbsences = React.useMemo(() => {
    if (!nextTraining || !isTrainerView) {
      return [];
    }
    const targetStart = nextTraining.getTime();
    return absences.filter((absence) => new Date(absence.trainingStartIso).getTime() === targetStart);
  }, [absences, isTrainerView, nextTraining]);

  const groupNameByKey = React.useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    allGroups.forEach((group) => {
      map.set(group.key, group.name);
    });
    return map;
  }, [allGroups]);

  useEffect(() => {
    const loadStartInfo = async () => {
      if (!authToken || !currentUser || currentUser.role === 'parent') {
        setAllGroups([]);
        setUpcomingSessions([]);
        return;
      }

      try {
        const groups =
          currentUser.role === 'trainer' || currentUser.role === 'admin'
            ? await listTrainingGroups(authToken)
            : await getMyGroups(authToken);
        const validGroups = Array.isArray(groups) ? groups : [];
        setAllGroups(validGroups);

        const allUpcoming: TrainingSessionInstance[] = [];
        for (const group of validGroups) {
          const groupSessions = await getGroupSessions(authToken, group.id, 14);
          if (Array.isArray(groupSessions)) {
            allUpcoming.push(...groupSessions);
          }
        }

        const upcoming = allUpcoming
          .filter((session) => !session.isCancelled && new Date(session.scheduledDate) >= new Date())
          .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

        setUpcomingSessions(upcoming);
      } catch (err) {
        console.error('Failed to load start data:', err);
        setAllGroups([]);
        setUpcomingSessions([]);
      }
    };

    void loadStartInfo();
  }, [authToken, currentUser]);

  return (
    <View style={styles.contentCard}>
      <View style={styles.headerCard}>
        <View style={styles.waterLines}>
          <View style={styles.waveLine} />
          <View style={styles.waveLineShort} />
          <View style={styles.waveLine} />
        </View>
        <Text style={styles.sectionTitle}>Startseite</Text>
        <Text style={styles.textMuted}>Wichtiges auf einen Blick für {currentUser?.displayName || 'Mitglied'}.</Text>
      </View>

      <View style={styles.infoTile}>
        <Text style={styles.infoLabel}>Nächstes Training</Text>
        <Text style={styles.infoValue}>
          {nextTraining ? formatGermanDateTime(nextTraining) : 'Kein kommender Termin vorhanden'}
        </Text>
        {nextSession?.groupId ? (
          <Text style={styles.infoValueSmall}>
            Gruppe: {allGroups.find((group) => group.id === nextSession.groupId)?.name ?? 'Unbekannt'}
          </Text>
        ) : null}
        {nextSession?.location ? <Text style={styles.infoValueSmall}>Ort: {nextSession.location}</Text> : null}
      </View>

      {isTrainerView ? (
        <View style={styles.infoTile}>
          <Text style={styles.infoLabel}>Abmeldungen für dieses Training</Text>
          {nextTrainingAbsences.length === 0 ? (
            <Text style={styles.infoValueSmall}>Keine Abmeldungen gemeldet.</Text>
          ) : (
            <View style={styles.absenceList}>
              {nextTrainingAbsences.map((absence) => (
                <View key={String(absence.id)} style={styles.absenceRow}>
                  <Text style={styles.absenceName}>{absence.athleteName}</Text>
                  <Text style={styles.absenceMeta}>{groupNameByKey.get(absence.groupKey) ?? absence.groupKey}</Text>
                  {absence.reasonText ? <Text style={styles.absenceMeta}>Grund: {absence.reasonText}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.infoTile}>
          <Text style={styles.infoLabel}>Wichtig</Text>
          <Text style={styles.infoValueSmall}>Unter 24 Stunden vor Trainingsbeginn ist die Angabe eines Grundes verpflichtend.</Text>
        </View>
      )}

      <View style={styles.infoTile}>
        <Text style={styles.infoLabel}>Anwesenheitsfenster</Text>
        <Text style={styles.infoValueSmall}>Bearbeitung: 4h vor Start bis 4h nach Ende.</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: colors.surfaceMuted,
  },
  waterLines: {
    gap: 5,
    marginBottom: 2,
  },
  waveLine: {
    height: 3,
    borderRadius: 6,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  waveLineShort: {
    width: '72%',
    height: 3,
    borderRadius: 6,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.primary,
  },
  textMuted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  infoTile: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: colors.surfaceMuted,
  },
  infoLabel: {
    color: colors.textSoft,
    fontSize: 12,
  },
  infoValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  infoValueSmall: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  absenceList: {
    gap: 6,
  },
  absenceRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    gap: 2,
  },
  absenceName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  absenceMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
