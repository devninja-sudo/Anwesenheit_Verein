import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { AbsenceRecord, AppUser, ChildLink, ReporterType } from '../types';
import { formatGermanDateTime } from '../utils/schedule';
import { useAppTheme } from '../theme/colors';

type SickCallTabProps = {
  currentUser: AppUser;
  reporterType: ReporterType;
  setReporterType: (type: ReporterType) => void;
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
  calendarDays: Array<{ date: Date; sessions: Date[]; isCancelled?: boolean; userAbsence?: AbsenceRecord }>;
  selectedSessionIso: string;
  isLateCancellation: boolean;
  lateReason: string;
  setLateReason: (reason: string) => void;
  error: string;
  success: string;
  submitSickCall: () => void;
};

export function SickCallTab({
  currentUser,
  reporterType,
  setReporterType,
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
  lateReason,
  setLateReason,
  error,
  success,
  submitSickCall,
}: SickCallTabProps) {
  const colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

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

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.chip, reporterType === 'athlete' && styles.chipActive]}
          onPress={() => setReporterType('athlete')}
          disabled={currentUser?.role === 'parent'}
        >
          <Text style={styles.chipText}>Athlet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, reporterType === 'parent' && styles.chipActive]}
          onPress={() => setReporterType('parent')}
          disabled={currentUser?.role === 'child'}
        >
          <Text style={styles.chipText}>Elternteil</Text>
        </TouchableOpacity>
      </View>

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
            const session = day.sessions[0];
            const iso = session?.toISOString() || '';
            const isCancelled = day.isCancelled;
            const hasUserAbsence = !!day.userAbsence;

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
                {session ? (
                  <TouchableOpacity
                    key={iso}
                    style={[
                      styles.calendarSession,
                      selectedSessionIso === iso && styles.calendarSessionActive,
                      isCancelled && styles.calendarSessionCancelled,
                      hasUserAbsence && styles.calendarSessionAbsent,
                    ]}
                    onPress={() => setSelectedSessionIso(iso)}
                    disabled={isCancelled}
                  >
                    <Text
                      style={[
                        styles.calendarSessionText,
                        selectedSessionIso === iso && styles.calendarSessionTextActive,
                      ]}
                    >
                      {formatGermanDateTime(session)}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {isLateCancellation ? (
        <TextInput
          style={styles.input}
          placeholder="Grund bei kurzfristiger Abmeldung"
          value={lateReason}
          onChangeText={setLateReason}
          multiline
        />
      ) : null}

      <TouchableOpacity style={styles.submitButton} onPress={submitSickCall}>
        <Text style={styles.submitText}>Krank melden</Text>
      </TouchableOpacity>
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
});
