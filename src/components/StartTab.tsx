import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../api/client';
import type { AbsenceRecord, AppUser, TrainingGroupFull, TrainingSessionInstance } from '../types';
import { formatGermanDateTime } from '../utils/schedule';
import { getMyGroups, getGroupSessions } from '../api/backendApi';
import { useAppTheme } from '../theme/colors';

type StartTabProps = {
  currentUser: AppUser | null;
  sessions: Date[];
  todaysAbsences: AbsenceRecord[];
  authToken?: string;
};

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function StartTab({ currentUser, sessions, todaysAbsences, authToken }: StartTabProps) {
  const colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const isWeb = Platform.OS === 'web';

  const nextTraining = sessions.at(0);
  const isTrainerView = currentUser?.role === 'trainer' || currentUser?.role === 'admin';
  const [myGroups, setMyGroups] = useState<TrainingGroupFull[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<TrainingSessionInstance[]>([]);

  useEffect(() => {
    if (authToken && currentUser && currentUser.role !== 'parent') {
      loadMyGroups();
      return;
    }
    setMyGroups([]);
    setUpcomingSessions([]);
  }, [authToken, currentUser]);

  async function loadMyGroups() {
    if (!authToken) return;
    try {
      const groups = await getMyGroups(authToken);
      const validGroups = Array.isArray(groups) ? groups : [];
      setMyGroups(validGroups);
      
      // Load upcoming sessions for all groups
      const allSessions: TrainingSessionInstance[] = [];
      for (const group of validGroups) {
        const sessions = await getGroupSessions(authToken, group.id, 7);
        if (Array.isArray(sessions)) {
          allSessions.push(...sessions);
        }
      }
      // Sort by date and filter out cancelled sessions
      const upcoming = allSessions
        .filter(s => !s.isCancelled && new Date(s.scheduledDate) >= new Date())
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        .slice(0, 5);
      setUpcomingSessions(upcoming);
    } catch (err) {
      console.error('Failed to load training groups:', err);
      setMyGroups([]);
      setUpcomingSessions([]);
    }
  }

  const openLegalPage = (path: '/impressum.html' | '/datenschutz.html') => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  return (
    <View style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{isTrainerView ? 'Start (Trainer)' : 'Start (Athlet)'}</Text>
      <Text style={styles.textMuted}>Willkommen, {currentUser?.displayName || 'Mitglied'}.</Text>
      <Text style={styles.textMuted}>{currentUser?.email}</Text>

      {isTrainerView ? (
        <>
          <View style={styles.infoTile}>
            <Text style={styles.infoLabel}>Nächster Termin in gewählter Gruppe</Text>
            <Text style={styles.infoValue}>
              {nextTraining ? formatGermanDateTime(nextTraining) : 'Kein Termin gefunden'}
            </Text>
          </View>
          <View style={styles.infoTile}>
            <Text style={styles.infoLabel}>Krankmeldungen heute</Text>
            <Text style={styles.infoValue}>{todaysAbsences.length}</Text>
          </View>
          <View style={styles.infoTile}>
            <Text style={styles.infoLabel}>Anwesenheit</Text>
            <Text style={styles.infoValueSmall}>
              Bearbeitung ist 4h vor Trainingsbeginn bis 4h nach Trainingsende möglich.
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.infoTile}>
            <Text style={styles.infoLabel}>Standardstatus</Text>
            <Text style={styles.infoValue}>Anwesend</Text>
          </View>
          <View style={styles.infoTile}>
            <Text style={styles.infoLabel}>Nächstes Training</Text>
            <Text style={styles.infoValue}>
              {nextTraining ? formatGermanDateTime(nextTraining) : 'Kein Termin gefunden'}
            </Text>
          </View>
          <View style={styles.infoTile}>
            <Text style={styles.infoLabel}>Abmeldung</Text>
            <Text style={styles.infoValueSmall}>
              Unter 24h vor Trainingsbeginn ist eine Begründung erforderlich.
            </Text>
          </View>
        </>
      )}

      {/* Training Groups Section */}
      {myGroups.length > 0 && (
        <View style={styles.groupsSection}>
          <Text style={styles.sectionSubtitle}>Meine Trainingsgruppen</Text>
          {(myGroups || []).map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <Text style={styles.groupName}>{group.name}</Text>
              {group.description && (
                <Text style={styles.groupDescription}>{group.description}</Text>
              )}
              {group.schedules.length > 0 && (
                <View style={styles.scheduleList}>
                  <Text style={styles.scheduleTitle}>Regelmäßige Zeiten:</Text>
                  {(group.schedules || [])
                    .filter(s => s.isActive)
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                    .map((schedule) => (
                      <Text key={schedule.id} style={styles.scheduleItem}>
                        • {WEEKDAYS[schedule.dayOfWeek]}, {schedule.startTime} - {schedule.endTime}
                        {schedule.location && ` @ ${schedule.location}`}
                      </Text>
                    ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Upcoming Sessions with Comments */}
      {upcomingSessions.length > 0 && (
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionSubtitle}>{isTrainerView ? 'Nächste Sessions' : 'Besondere Hinweise'}</Text>
          {(upcomingSessions || []).map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <Text style={styles.sessionDate}>
                {new Date(session.scheduledDate).toLocaleDateString('de-DE', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                })}
              </Text>
              {session.comment && (
                <Text style={styles.sessionComment}>💬 {session.comment}</Text>
              )}
              {session.location && (
                <Text style={styles.sessionLocation}>📍 {session.location}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoTile}>
        <Text style={styles.infoLabel}>Backend</Text>
        <Text style={styles.infoValueSmall}>{API_BASE_URL}</Text>
      </View>

      {isWeb ? (
        <View style={styles.legalLinksRow}>
          <TouchableOpacity onPress={() => openLegalPage('/impressum.html')}>
            <Text style={styles.legalLinkText}>Impressum</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>•</Text>
          <TouchableOpacity onPress={() => openLegalPage('/datenschutz.html')}>
            <Text style={styles.legalLinkText}>Datenschutzerklärung</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
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
  legalLinksRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  legalLinkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalDivider: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  groupsSection: {
    marginTop: 8,
  },
  groupCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  scheduleList: {
    marginTop: 8,
  },
  scheduleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSoft,
    marginBottom: 4,
  },
  scheduleItem: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 4,
    marginTop: 2,
  },
  sessionsSection: {
    marginTop: 8,
  },
  sessionCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 4,
  },
  sessionComment: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionLocation: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
