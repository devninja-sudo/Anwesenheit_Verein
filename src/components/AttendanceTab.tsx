import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AttendanceEntry, AttendanceSession, ExcusedChild } from '../types';
import { formatGermanDateTime } from '../utils/schedule';
import { useAppTheme } from '../theme/colors';

type AttendanceTabProps = {
  groups: Array<{ key: string; name: string }>;
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  sessions: Date[];
  selectedAttendanceSessionIso: string;
  setSelectedAttendanceSessionIso: (iso: string) => void;
  currentAttendanceSession: AttendanceSession | null;
  excusedChildren: ExcusedChild[];
  attendanceEntries: AttendanceEntry[];
  csvExport: string;
  canEditAttendance: boolean;
  onCreateSession: () => void;
  onToggleAttendance: (childId: number, newStatus: 'present' | 'excused' | 'unexcused') => void;
  copyToClipboard: (text: string) => void;
  downloadCsv: (text: string) => void;
};

export function AttendanceTab({
  groups,
  selectedGroup,
  setSelectedGroup,
  sessions,
  selectedAttendanceSessionIso,
  setSelectedAttendanceSessionIso,
  currentAttendanceSession,
  excusedChildren,
  attendanceEntries,
  csvExport,
  canEditAttendance,
  onCreateSession,
  onToggleAttendance,
  copyToClipboard,
  downloadCsv,
}: AttendanceTabProps) {
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
      <Text style={styles.sectionTitle}>Anwesenheit (Trainer)</Text>

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Keine Trainingsgruppen vorhanden.{'\n'}
            Bitte erstellen Sie zuerst Gruppen im Trainer-Tab.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.inlineLabel}>Trainingsgruppe</Text>
          <View style={styles.groupWrap}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.key}
                style={[styles.groupChip, selectedGroup === group.key && styles.groupChipActive]}
                onPress={() => setSelectedGroup(group.key)}
              >
                <Text style={[styles.groupChipText, selectedGroup === group.key && styles.groupChipTextActive]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inlineLabel}>Training wählen</Text>
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Keine Trainingszeiten für diese Gruppe.{'\n'}
                Bitte fügen Sie im Trainer-Tab Zeitpläne hinzu.
              </Text>
            </View>
          ) : (
            <View style={styles.calendarWrap}>
              {sessions.slice(0, 14).map((session) => {
          const iso = session.toISOString();
          return (
            <TouchableOpacity
              key={iso}
              style={[
                styles.calendarSession,
                selectedAttendanceSessionIso === iso && styles.calendarSessionActive,
              ]}
              onPress={() => setSelectedAttendanceSessionIso(iso)}
            >
              <Text
                style={[
                  styles.calendarSessionText,
                  selectedAttendanceSessionIso === iso && styles.calendarSessionTextActive,
                ]}
              >
                {formatGermanDateTime(session)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
          )}

      {!currentAttendanceSession && selectedAttendanceSessionIso ? (
        <TouchableOpacity style={styles.submitButton} onPress={onCreateSession}>
          <Text style={styles.submitText}>Session erstellen</Text>
        </TouchableOpacity>
      ) : null}

      {currentAttendanceSession ? (
        <>
          <Text style={styles.textMuted}>
            Session für {formatGermanDateTime(new Date(currentAttendanceSession.trainingStart))}
          </Text>

          {!canEditAttendance && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Anwesenheit kann nur 4 Stunden vor bis 4 Stunden nach dem Training bearbeitet werden.
              </Text>
            </View>
          )}

          <Text style={styles.inlineLabel}>Anwesenheitsliste</Text>
          {excusedChildren.map((child) => {
            const entry = attendanceEntries.find((e) => e.childId === child.id);
            const status = entry?.status ?? 'unexcused';

            return (
              <View key={child.id} style={styles.attendanceRow}>
                <Text style={styles.attendanceName}>{child.displayName}</Text>
                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'present' && styles.statusButtonPresent,
                      !canEditAttendance && styles.statusButtonDisabled,
                    ]}
                    onPress={() => onToggleAttendance(child.id, 'present')}
                    disabled={!canEditAttendance}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        status === 'present' && styles.statusButtonTextActive,
                      ]}
                    >
                      ✓
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'excused' && styles.statusButtonExcused,
                      !canEditAttendance && styles.statusButtonDisabled,
                    ]}
                    onPress={() => onToggleAttendance(child.id, 'excused')}
                    disabled={!canEditAttendance}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        status === 'excused' && styles.statusButtonTextActive,
                      ]}
                    >
                      E
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'unexcused' && styles.statusButtonUnexcused,
                      !canEditAttendance && styles.statusButtonDisabled,
                    ]}
                    onPress={() => onToggleAttendance(child.id, 'unexcused')}
                    disabled={!canEditAttendance}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        status === 'unexcused' && styles.statusButtonTextActive,
                      ]}
                    >
                      U
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {csvExport ? (
            <View style={styles.linkBox}>
              <Text style={styles.linkLabel}>CSV Export</Text>
              <View style={styles.csvButtonsRow}>
                <TouchableOpacity style={styles.downloadButton} onPress={() => downloadCsv(csvExport)}>
                  <Text style={styles.downloadButtonText}>⬇️ CSV herunterladen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(csvExport)}>
                  <Text style={styles.copyButtonText}>CSV kopieren</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </>
      ) : null}
        </>
      )}
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
  inlineLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  groupWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  groupChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  groupChipActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary,
  },
  groupChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  groupChipTextActive: {
    color: colors.primary,
  },
  calendarWrap: {
    gap: 6,
  },
  calendarSession: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  calendarSessionActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary,
  },
  calendarSessionText: {
    color: colors.text,
    fontSize: 13,
  },
  calendarSessionTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceMuted,
  },
  attendanceName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonPresent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonExcused: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonUnexcused: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: colors.buttonPrimaryText,
  },
  linkBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    backgroundColor: colors.surfaceMuted,
  },
  linkLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  linkText: {
    color: '#2f577d',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  csvButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  downloadButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  copyButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#fff4e6',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  warningText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#e5e7eb',
  },
});
