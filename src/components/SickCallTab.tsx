import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { AbsenceRecord, AppUser, ChildLink, TrainingSessionInstance } from '../types';
import { formatGermanDateTime } from '../utils/schedule';
import { useAppTheme } from '../theme/colors';

type SickCallTabProps = {
  currentUser: AppUser;
  linkedChildren: ChildLink[];
  selectedChildId: number | null;
  setSelectedChildId: (id: number | null) => void;
  setAthleteName: (name: string) => void;
  athleteName: string;
  reporterName: string;
  setReporterName: (name: string) => void;
  availableGroups: Array<{ key: string; name: string }>;
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  setSelectedSessionIso: (iso: string) => void;
  calendarDays: Array<{
    date: Date;
    sessions: TrainingSessionInstance[];
    isCancelled?: boolean;
    userAbsence?: AbsenceRecord;
  }>;
  selectedSessionIso: string;
  isLateCancellation: boolean;
  showLateReasonDropdown: boolean;
  lateReason: string;
  setLateReason: (reason: string) => void;
  error: string;
  success: string;
  submitSickCall: () => void;
};

const ATHLETE_LATE_REASON_OPTIONS = [
  'Krankheitssymptome akut',
  'Verletzung kurzfristig',
  'Schulischer Termin',
  'Familiaerer Notfall',
  'Transportproblem',
] as const;

export function SickCallTab({
  currentUser,
  linkedChildren,
  selectedChildId,
  setSelectedChildId,
  setAthleteName,
  athleteName,
  reporterName,
  setReporterName,
  availableGroups,
  selectedGroup,
  setSelectedGroup,
  setSelectedSessionIso,
  calendarDays,
  selectedSessionIso,
  isLateCancellation,
  showLateReasonDropdown,
  lateReason,
  setLateReason,
  error,
  success,
  submitSickCall,
}: SickCallTabProps) {
  const colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = React.useState(false);

  const formatGermanDate = (value: Date): string => {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(value);
  };

  return (
    <View style={styles.contentCard}>
      <Text style={styles.sectionTitle}>Krankmeldung</Text>
      <Text style={styles.textMuted}>Abmeldung unter 24h ist mit Begründung möglich.</Text>

      {currentUser?.role === 'parent' ? (
        <>
          <Text style={styles.inlineLabel}>Kind auswählen</Text>
          {linkedChildren.length === 0 ? (
            <Text style={styles.hint}>Keine verknüpften Kinder gefunden.</Text>
          ) : (
            <View style={styles.row}>
              {linkedChildren.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.chip, selectedChildId === child.id && styles.chipActive]}
                  onPress={() => {
                    setSelectedChildId(child.id);
                    setAthleteName(child.displayName);
                  }}
                >
                  <Text style={styles.chipText}>{child.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Name Athlet"
        value={
          currentUser?.role === 'parent'
            ? linkedChildren.find((child) => child.id === selectedChildId)?.displayName ?? ''
            : currentUser?.role === 'child'
              ? currentUser.displayName
              : athleteName
        }
        onChangeText={setAthleteName}
        editable={currentUser?.role !== 'parent' && currentUser?.role !== 'child'}
      />

      <TextInput
        style={styles.input}
        placeholder="Name meldende Person"
        value={reporterName}
        onChangeText={setReporterName}
      />

      <Text style={styles.inlineLabel}>Trainingsgruppe</Text>
      {availableGroups.map((group) => (
        <TouchableOpacity
          key={group.key}
          style={[styles.groupItem, selectedGroup === group.key && styles.groupItemActive]}
          onPress={() => {
            setSelectedGroup(group.key);
            setSelectedSessionIso('');
          }}
        >
          <Text style={styles.groupText}>{group.name}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.inlineLabel}>Trainingskalender (nächste 2 Wochen)</Text>
      {calendarDays.length === 0 ? (
        <Text style={styles.hint}>Keine Trainings in den nächsten 2 Wochen</Text>
      ) : (
        <View style={styles.calendarWrap}>
          {calendarDays.map((day) => {
            const isCancelled = day.isCancelled;
            const hasUserAbsence = !!day.userAbsence;
            const daySessions = [...day.sessions].sort((a, b) => {
              if (a.sessionType !== b.sessionType) {
                return a.sessionType === 'event' ? -1 : 1;
              }
              return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
            });

            return (
              <View key={day.date.toISOString()} style={styles.calendarDayCard}>
                <Text style={styles.calendarDayTitle}>{formatGermanDate(day.date)}</Text>
                {isCancelled ? (
                  <View style={styles.cancelledBanner}>
                    <Text style={styles.cancelledText}>⛔ Training abgesagt</Text>
                  </View>
                ) : null}
                {hasUserAbsence ? (
                  <View style={styles.absenceBanner}>
                    <Text style={styles.absenceText}>✓ Bereits abgemeldet</Text>
                  </View>
                ) : null}
                {daySessions.map((session) => {
                  const iso = session.scheduledDate;
                  const isSelected = selectedSessionIso === iso;

                  return (
                    <View key={`${session.id}-${iso}`} style={styles.sessionActionRow}>
                      <TouchableOpacity
                        style={[
                          styles.calendarSession,
                          isSelected && styles.calendarSessionActive,
                          session.isCancelled && styles.calendarSessionCancelled,
                          hasUserAbsence && styles.calendarSessionAbsent,
                        ]}
                        onPress={() => setSelectedSessionIso(iso)}
                        disabled={session.isCancelled}
                      >
                        <View style={styles.sessionHeaderRow}>
                          <Text
                            style={[
                              styles.sessionTypeBadge,
                              session.sessionType === 'event' ? styles.sessionTypeBadgeEvent : styles.sessionTypeBadgeTraining,
                            ]}
                          >
                            {session.sessionType === 'event' ? 'Veranstaltung' : 'Training'}
                          </Text>
                          {session.title ? <Text style={styles.sessionTitle}>{session.title}</Text> : null}
                        </View>
                        <Text
                          style={[
                            styles.calendarSessionText,
                            isSelected && styles.calendarSessionTextActive,
                          ]}
                        >
                          {formatGermanDateTime(new Date(session.scheduledDate))}
                        </Text>
                      </TouchableOpacity>

                      {isSelected ? (
                        <TouchableOpacity style={styles.inlineSubmitButton} onPress={submitSickCall}>
                          <Text style={styles.inlineSubmitText}>Abmelden</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {isLateCancellation && showLateReasonDropdown ? (
        <View style={styles.reasonDropdownWrap}>
          <Text style={styles.inlineLabel}>Grund der kurzfristigen Abmeldung</Text>
          <TouchableOpacity
            style={styles.reasonDropdownButton}
            onPress={() => setIsReasonDropdownOpen((prev) => !prev)}
          >
            <Text style={styles.reasonDropdownButtonText}>
              {lateReason || 'Bitte Grund auswählen'}
            </Text>
          </TouchableOpacity>
          {isReasonDropdownOpen ? (
            <View style={styles.reasonDropdownMenu}>
              {ATHLETE_LATE_REASON_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.reasonOption}
                  onPress={() => {
                    setLateReason(option);
                    setIsReasonDropdownOpen(false);
                  }}
                >
                  <Text style={styles.reasonOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : isLateCancellation ? (
        <TextInput
          style={styles.input}
          placeholder="Grund bei kurzfristiger Abmeldung"
          value={lateReason}
          onChangeText={setLateReason}
          multiline
        />
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
  textMuted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  inlineLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  groupItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  groupItemActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary,
  },
  groupText: {
    color: colors.text,
    fontSize: 13,
  },
  hint: {
    color: colors.textSoft,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  success: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 13,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitText: {
    color: colors.buttonPrimaryText,
    fontWeight: '700',
    fontSize: 14,
  },
  calendarWrap: {
    gap: 10,
  },
  calendarDayCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    backgroundColor: colors.surfaceMuted,
  },
  calendarDayTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  calendarEmpty: {
    color: colors.textSoft,
    fontSize: 12,
  },
  calendarSession: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  calendarSessionActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary,
  },
  calendarSessionText: {
    color: colors.text,
    fontSize: 12,
  },
  calendarSessionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  calendarSessionCancelled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.danger,
    opacity: 0.6,
  },
  calendarSessionAbsent: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.warning,
  },
  sessionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  sessionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '700',
  },
  sessionTypeBadgeTraining: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  sessionTypeBadgeEvent: {
    backgroundColor: colors.warning,
    color: colors.surface,
  },
  sessionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  inlineSubmitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSubmitText: {
    color: colors.buttonPrimaryText,
    fontWeight: '700',
    fontSize: 13,
  },
  cancelledBanner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cancelledText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  absenceBanner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  absenceText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  reasonDropdownWrap: {
    gap: 6,
  },
  reasonDropdownButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 11,
    backgroundColor: colors.surface,
  },
  reasonDropdownButtonText: {
    color: colors.text,
    fontSize: 14,
  },
  reasonDropdownMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  reasonOption: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reasonOptionText: {
    color: colors.text,
    fontSize: 13,
  },
});
