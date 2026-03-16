import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {
  AppUser,
  GroupMember,
  SessionType,
  TrainingGroupFull,
  TrainingSessionInstance,
} from '../types';
import {
  addScheduleToGroup,
  assignUserToGroup,
  createTrainingGroup,
  createTrainingSession,
  dismissTrainerWarning,
  deleteTrainingGroup,
  getGroupMembers,
  getGroupSessions,
  listTrainingGroups,
  removeSchedule,
  unassignUserFromGroup,
  upsertTrainerSessionAvailability,
  updateGroupSchedule,
  updateTrainingSession,
  listUsers,
} from '../api/backendApi';
import { useAppTheme } from '../theme/colors';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const TIME_OPTIONS = Array.from({ length: 34 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
});

type Props = {
  token: string;
};

type TabView = 'groups' | 'schedules' | 'members' | 'sessions';

export function TrainerTab({ token }: Props) {
  const HOLD_TO_DELETE_MS = 650;
  const colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [view, setView] = useState<TabView>('groups');
  const [groups, setGroups] = useState<TrainingGroupFull[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TrainingGroupFull | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionInstance[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupKey, setGroupKey] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1);
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [editScheduleDayOfWeek, setEditScheduleDayOfWeek] = useState(1);
  const [editScheduleStartTime, setEditScheduleStartTime] = useState('');
  const [editScheduleEndTime, setEditScheduleEndTime] = useState('');
  const [editScheduleLocation, setEditScheduleLocation] = useState('');
  const [openTimeDropdown, setOpenTimeDropdown] = useState<
    'add-start' | 'add-end' | 'edit-start' | 'edit-end' | null
  >(null);

  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionEndDate, setSessionEndDate] = useState('');
  const [sessionEventDeadline, setSessionEventDeadline] = useState('');
  const [sessionEventGroupIds, setSessionEventGroupIds] = useState<number[]>([]);
  const [sessionComment, setSessionComment] = useState('');
  const [sessionLocation, setSessionLocation] = useState('');
  const [sessionMinTrainers, setSessionMinTrainers] = useState('1');
  const groupHoldTimers = React.useRef<Record<number, ReturnType<typeof setTimeout> | undefined>>({});
  const groupHoldTriggered = React.useRef<Record<number, boolean>>({});

  useEffect(() => {
    loadGroups();
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      if (view === 'members') {
        loadMembers(selectedGroup.id);
      } else if (view === 'sessions') {
        loadSessions(selectedGroup.id);
      }
    }
  }, [selectedGroup, view]);

  async function loadGroups() {
    try {
      setLoading(true);
      const data = await listTrainingGroups(token);
      const nextGroups = Array.isArray(data) ? data : [];
      setGroups(nextGroups);
      if (selectedGroup) {
        const updatedSelected = nextGroups.find((group) => group.id === selectedGroup.id) ?? null;
        setSelectedGroup(updatedSelected);
      }
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to load groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllUsers() {
    try {
      const data = await listUsers(token);
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setAllUsers([]);
    }
  }

  async function loadMembers(groupId: number) {
    try {
      setLoading(true);
      const data = await getGroupMembers(token, groupId);
      setMembers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to load members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSessions(groupId: number) {
    try {
      setLoading(true);
      const data = await getGroupSessions(token, groupId, 30);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupName || !groupKey) {
      Alert.alert('Fehler', 'Name und Schlüssel sind erforderlich');
      return;
    }
    try {
      setLoading(true);
      await createTrainingGroup(token, { name: groupName, key: groupKey, description: groupDescription });
      await loadGroups();
      setShowCreateGroup(false);
      setGroupName('');
      setGroupKey('');
      setGroupDescription('');
      Alert.alert('Erfolg', 'Gruppe wurde erstellt');
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGroup(group: TrainingGroupFull) {
    Alert.alert('Gruppe löschen', `${group.name} wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await deleteTrainingGroup(token, group.id);
            const nextGroups = groups.filter((entry) => entry.id !== group.id);
            setGroups(nextGroups);
            if (selectedGroup?.id === group.id) {
              setSelectedGroup(null);
              setView('groups');
            }
            Alert.alert('Erfolg', 'Gruppe wurde gelöscht');
          } catch (err: any) {
            Alert.alert('Fehler', err.message || 'Failed to delete group');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function handleAddSchedule() {
    if (!selectedGroup || !scheduleStartTime || !scheduleEndTime) {
      Alert.alert('Fehler', 'Start- und Endzeit sind erforderlich');
      return;
    }
    try {
      setLoading(true);
      const updated = await addScheduleToGroup(token, selectedGroup.id, {
        dayOfWeek: scheduleDayOfWeek,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
        location: scheduleLocation,
      });
      setGroups(groups.map((g) => (g.id === updated.id ? updated : g)));
      setSelectedGroup(updated);
      setShowAddSchedule(false);
      setScheduleStartTime('');
      setScheduleEndTime('');
      setScheduleLocation('');
      setOpenTimeDropdown(null);
      Alert.alert('Erfolg', 'Zeitplan wurde hinzugefügt');
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to add schedule');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveSchedule(scheduleId: number) {
    if (!selectedGroup) return;
    Alert.alert('Zeitplan löschen', 'Wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await removeSchedule(token, selectedGroup.id, scheduleId);
            await loadGroups();
            const updated = groups.find((g) => g.id === selectedGroup.id);
            if (updated) setSelectedGroup(updated);
          } catch (err: any) {
            Alert.alert('Fehler', err.message || 'Failed to remove schedule');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function handleUpdateSchedule() {
    if (!selectedGroup || !editingScheduleId || !editScheduleStartTime || !editScheduleEndTime) {
      Alert.alert('Fehler', 'Wochentag, Start- und Endzeit sind erforderlich');
      return;
    }

    try {
      setLoading(true);
      const updated = await updateGroupSchedule(token, selectedGroup.id, editingScheduleId, {
        dayOfWeek: editScheduleDayOfWeek,
        startTime: editScheduleStartTime,
        endTime: editScheduleEndTime,
        location: editScheduleLocation,
      });
      setGroups(groups.map((group) => (group.id === updated.id ? updated : group)));
      setSelectedGroup(updated);
      setEditingScheduleId(null);
      setOpenTimeDropdown(null);
      Alert.alert('Erfolg', 'Zeitplan wurde aktualisiert');
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  }

  function startEditingSchedule(schedule: TrainingGroupFull['schedules'][number]) {
    setEditingScheduleId(schedule.id);
    setEditScheduleDayOfWeek(schedule.dayOfWeek);
    setEditScheduleStartTime(schedule.startTime);
    setEditScheduleEndTime(schedule.endTime);
    setEditScheduleLocation(schedule.location ?? '');
    setOpenTimeDropdown(null);
  }

  async function handleAssignUser(userId: number) {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      await assignUserToGroup(token, selectedGroup.id, { userId });
      await loadMembers(selectedGroup.id);
      Alert.alert('Erfolg', 'Benutzer wurde zugewiesen');
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to assign user');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnassignUser(userId: number) {
    if (!selectedGroup) return;
    Alert.alert('Zuweisung aufheben', 'Wirklich entfernen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await unassignUserFromGroup(token, selectedGroup.id, userId);
            await loadMembers(selectedGroup.id);
          } catch (err: any) {
            Alert.alert('Fehler', err.message || 'Failed to unassign user');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function handleCreateSession() {
    if (!selectedGroup || !sessionDate) {
      Alert.alert('Fehler', 'Datum ist erforderlich');
      return;
    }

    if (sessionType === 'event') {
      if (!sessionTitle.trim()) {
        Alert.alert('Fehler', 'Titel ist für Veranstaltungen erforderlich');
        return;
      }
      if (!sessionEndDate.trim()) {
        Alert.alert('Fehler', 'Ende ist für Veranstaltungen erforderlich');
        return;
      }
      if (!sessionLocation.trim()) {
        Alert.alert('Fehler', 'Ort ist für Veranstaltungen erforderlich');
        return;
      }
      if (!sessionComment.trim()) {
        Alert.alert('Fehler', 'Notiz ist für Veranstaltungen erforderlich');
        return;
      }
    }

    try {
      setLoading(true);
      await createTrainingSession(token, {
        groupId: selectedGroup.id,
        sessionType,
        title: sessionType === 'event' ? sessionTitle.trim() : undefined,
        scheduledDate: sessionDate,
        endDate: sessionType === 'event' ? sessionEndDate : undefined,
        eventDeadline: sessionType === 'event' && sessionEventDeadline ? sessionEventDeadline : undefined,
        eventGroupIds:
          sessionType === 'event'
            ? Array.from(new Set([selectedGroup.id, ...sessionEventGroupIds]))
            : undefined,
        comment: sessionComment,
        location: sessionLocation,
        minTrainers: Math.max(1, Number(sessionMinTrainers) || 1),
      });
      await loadSessions(selectedGroup.id);
      setShowCreateSession(false);
      setSessionType('training');
      setSessionTitle('');
      setSessionDate('');
      setSessionEndDate('');
      setSessionEventDeadline('');
      setSessionEventGroupIds([]);
      setSessionComment('');
      setSessionLocation('');
      setSessionMinTrainers('1');
      Alert.alert('Erfolg', 'Termin wurde erstellt');
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCancelled(session: TrainingSessionInstance) {
    try {
      setLoading(true);
      await updateTrainingSession(token, session.id, { 
        groupId: session.groupId,
        scheduleId: session.scheduleId ?? undefined,
        scheduledDate: session.scheduledDate,
        isCancelled: !session.isCancelled 
      });
      await loadSessions(selectedGroup!.id);
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Failed to update session');
    } finally {
      setLoading(false);
    }
  }

  async function handleTrainerAvailability(session: TrainingSessionInstance, status: 'A' | 'U' | 'N') {
    try {
      setLoading(true);
      let targetSessionId = session.id;

      if (session.id <= 0) {
        const createdSession = await updateTrainingSession(token, session.id, {
          groupId: session.groupId,
          scheduledDate: session.scheduledDate,
          comment: session.comment ?? undefined,
          location: session.location ?? undefined,
          minTrainers: session.minTrainers ?? 1,
        });
        targetSessionId = createdSession.id;
      }

      await upsertTrainerSessionAvailability(token, targetSessionId, { status });
      if (selectedGroup) {
        await loadSessions(selectedGroup.id);
      }
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Rückmeldung konnte nicht gespeichert werden');
    } finally {
      setLoading(false);
    }
  }

  async function handleDismissWarning(session: TrainingSessionInstance) {
    if (session.id <= 0) {
      return;
    }

    try {
      setLoading(true);
      await dismissTrainerWarning(token, session.id);
      if (selectedGroup) {
        await loadSessions(selectedGroup.id);
      }
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Warnung konnte nicht verworfen werden');
    } finally {
      setLoading(false);
    }
  }

  function startGroupHold(group: TrainingGroupFull) {
    if (groupHoldTimers.current[group.id]) {
      clearTimeout(groupHoldTimers.current[group.id]);
    }
    groupHoldTriggered.current[group.id] = false;
    groupHoldTimers.current[group.id] = setTimeout(() => {
      groupHoldTriggered.current[group.id] = true;
      handleDeleteGroup(group);
    }, HOLD_TO_DELETE_MS);
  }

  function stopGroupHold(groupId: number) {
    if (groupHoldTimers.current[groupId]) {
      clearTimeout(groupHoldTimers.current[groupId]);
      groupHoldTimers.current[groupId] = undefined;
    }
  }

  function handleGroupPress(group: TrainingGroupFull) {
    if (groupHoldTriggered.current[group.id]) {
      groupHoldTriggered.current[group.id] = false;
      return;
    }
    setSelectedGroup(group);
  }

  useEffect(() => {
    return () => {
      Object.values(groupHoldTimers.current).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  const availableUsers = allUsers.filter((u) => u.role === 'child' && !members.some((m) => m.userId === u.id));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trainingsgruppen-Verwaltung</Text>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabButton, view === 'groups' && styles.tabButtonActive]} onPress={() => setView('groups')}>
          <Text style={[styles.tabButtonText, view === 'groups' && styles.tabButtonTextActive]}>Gruppen</Text>
        </TouchableOpacity>
        {selectedGroup && (
          <>
            <TouchableOpacity style={[styles.tabButton, view === 'schedules' && styles.tabButtonActive]} onPress={() => setView('schedules')}>
              <Text style={[styles.tabButtonText, view === 'schedules' && styles.tabButtonTextActive]}>Zeiten</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, view === 'members' && styles.tabButtonActive]} onPress={() => setView('members')}>
              <Text style={[styles.tabButtonText, view === 'members' && styles.tabButtonTextActive]}>Mitglieder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, view === 'sessions' && styles.tabButtonActive]} onPress={() => setView('sessions')}>
              <Text style={[styles.tabButtonText, view === 'sessions' && styles.tabButtonTextActive]}>Termine</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Groups View */}
        {view === 'groups' && (
          <View>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateGroup(!showCreateGroup)}>
              <Text style={styles.addButtonText}>+ Neue Gruppe</Text>
            </TouchableOpacity>

            {showCreateGroup && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Neue Gruppe</Text>
                <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#999" value={groupName} onChangeText={setGroupName} />
                <TextInput style={styles.input} placeholder="Schlüssel (z.B. youth)" placeholderTextColor="#999" value={groupKey} onChangeText={setGroupKey} />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Beschreibung (optional)"
                  placeholderTextColor="#999"
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  multiline
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.submitButton} onPress={handleCreateGroup} disabled={loading}>
                    <Text style={styles.submitButtonText}>Erstellen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateGroup(false)}>
                    <Text style={styles.cancelButtonText}>Abbrechen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {(groups || []).map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupCard, selectedGroup?.id === group.id && styles.groupCardActive]}
                onPressIn={() => startGroupHold(group)}
                onPressOut={() => stopGroupHold(group.id)}
                onPress={() => handleGroupPress(group)}
              >
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupInfo}>
                  {group.key} | {group.schedules.length} Zeitpläne
                </Text>
                {group.description && <Text style={styles.groupDescription}>{group.description}</Text>}
                <Text style={styles.groupHint}>Gedrückt halten zum Löschen</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Schedules View */}
        {view === 'schedules' && selectedGroup && (
          <View>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddSchedule(!showAddSchedule)}>
              <Text style={styles.addButtonText}>+ Zeitplan hinzufügen</Text>
            </TouchableOpacity>

            {showAddSchedule && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Neuer Zeitplan</Text>
                <Text style={styles.label}>Wochentag: {WEEKDAYS[scheduleDayOfWeek]}</Text>
                <View style={styles.weekdayWrap}>
                  {WEEKDAYS.map((day, index) => (
                    <TouchableOpacity
                      key={`add-day-${index}`}
                      style={[
                        styles.weekdayButton,
                        scheduleDayOfWeek === index && styles.weekdayButtonActive,
                      ]}
                      onPress={() => setScheduleDayOfWeek(index)}
                    >
                      <Text
                        style={[
                          styles.weekdayButtonText,
                          scheduleDayOfWeek === index && styles.weekdayButtonTextActive,
                        ]}
                      >
                        {day.slice(0, 2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Ort (optional)"
                  placeholderTextColor="#999"
                  value={scheduleLocation}
                  onChangeText={setScheduleLocation}
                />
                <Text style={styles.label}>Startzeit</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() =>
                    setOpenTimeDropdown((prev) => (prev === 'add-start' ? null : 'add-start'))
                  }
                >
                  <Text style={styles.selectInputText}>
                    {scheduleStartTime || 'Startzeit auswählen'}
                  </Text>
                </TouchableOpacity>
                {openTimeDropdown === 'add-start' ? (
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {TIME_OPTIONS.map((time) => (
                      <TouchableOpacity
                        key={`add-start-${time}`}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setScheduleStartTime(time);
                          setOpenTimeDropdown(null);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{time}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
                <Text style={styles.label}>Endzeit</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setOpenTimeDropdown((prev) => (prev === 'add-end' ? null : 'add-end'))}
                >
                  <Text style={styles.selectInputText}>
                    {scheduleEndTime || 'Endzeit auswählen'}
                  </Text>
                </TouchableOpacity>
                {openTimeDropdown === 'add-end' ? (
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {TIME_OPTIONS.map((time) => (
                      <TouchableOpacity
                        key={`add-end-${time}`}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setScheduleEndTime(time);
                          setOpenTimeDropdown(null);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{time}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddSchedule} disabled={loading}>
                    <Text style={styles.submitButtonText}>Hinzufügen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowAddSchedule(false);
                      setOpenTimeDropdown(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Abbrechen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {(selectedGroup?.schedules || [])
              .filter((s) => s.isActive)
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
              .map((schedule) => (
                <View key={schedule.id} style={styles.scheduleCard}>
                  {editingScheduleId === schedule.id ? (
                    <View style={styles.scheduleEditWrap}>
                      <Text style={styles.label}>Wochentag: {WEEKDAYS[editScheduleDayOfWeek]}</Text>
                      <View style={styles.weekdayWrap}>
                        {WEEKDAYS.map((day, index) => (
                          <TouchableOpacity
                            key={`edit-day-${schedule.id}-${index}`}
                            style={[
                              styles.weekdayButton,
                              editScheduleDayOfWeek === index && styles.weekdayButtonActive,
                            ]}
                            onPress={() => setEditScheduleDayOfWeek(index)}
                          >
                            <Text
                              style={[
                                styles.weekdayButtonText,
                                editScheduleDayOfWeek === index && styles.weekdayButtonTextActive,
                              ]}
                            >
                              {day.slice(0, 2)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Ort (optional)"
                        placeholderTextColor="#999"
                        value={editScheduleLocation}
                        onChangeText={setEditScheduleLocation}
                      />
                      <Text style={styles.label}>Startzeit</Text>
                      <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() =>
                          setOpenTimeDropdown((prev) => (prev === 'edit-start' ? null : 'edit-start'))
                        }
                      >
                        <Text style={styles.selectInputText}>
                          {editScheduleStartTime || 'Startzeit auswählen'}
                        </Text>
                      </TouchableOpacity>
                      {openTimeDropdown === 'edit-start' ? (
                        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                          {TIME_OPTIONS.map((time) => (
                            <TouchableOpacity
                              key={`edit-start-${time}`}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setEditScheduleStartTime(time);
                                setOpenTimeDropdown(null);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{time}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : null}
                      <Text style={styles.label}>Endzeit</Text>
                      <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() =>
                          setOpenTimeDropdown((prev) => (prev === 'edit-end' ? null : 'edit-end'))
                        }
                      >
                        <Text style={styles.selectInputText}>
                          {editScheduleEndTime || 'Endzeit auswählen'}
                        </Text>
                      </TouchableOpacity>
                      {openTimeDropdown === 'edit-end' ? (
                        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                          {TIME_OPTIONS.map((time) => (
                            <TouchableOpacity
                              key={`edit-end-${time}`}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setEditScheduleEndTime(time);
                                setOpenTimeDropdown(null);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{time}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : null}
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.submitButton} onPress={handleUpdateSchedule} disabled={loading}>
                          <Text style={styles.submitButtonText}>Speichern</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => {
                            setEditingScheduleId(null);
                            setOpenTimeDropdown(null);
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Abbrechen</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleDay}>{WEEKDAYS[schedule.dayOfWeek]}</Text>
                        <Text style={styles.scheduleTime}>
                          {schedule.startTime} - {schedule.endTime}
                        </Text>
                        {schedule.location && <Text style={styles.scheduleLocation}>📍 {schedule.location}</Text>}
                      </View>
                      <View style={styles.scheduleActions}>
                        <TouchableOpacity style={styles.editButton} onPress={() => startEditingSchedule(schedule)}>
                          <Text style={styles.deleteButtonText}>Bearbeiten</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveSchedule(schedule.id)}>
                          <Text style={styles.deleteButtonText}>Löschen</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Members View */}
        {view === 'members' && selectedGroup && (
          <View>
            <Text style={styles.sectionTitle}>Mitglieder von {selectedGroup.name}</Text>
            {availableUsers.length > 0 && (
              <View style={styles.userList}>
                <Text style={styles.label}>Benutzer zuweisen:</Text>
                {(availableUsers || []).slice(0, 10).map((user) => (
                  <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => handleAssignUser(user.id)}>
                    <Text style={styles.userName}>{user.displayName}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Zugewiesene Mitglieder:</Text>
            {(members || []).map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View>
                  <Text style={styles.memberName}>{member.user.displayName}</Text>
                  <Text style={styles.memberEmail}>{member.user.email}</Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleUnassignUser(member.userId)}>
                  <Text style={styles.deleteButtonText}>Entfernen</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Sessions View */}
        {view === 'sessions' && selectedGroup && (
          <View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setShowCreateSession(!showCreateSession);
              }}
            >
              <Text style={styles.addButtonText}>+ Termin erstellen</Text>
            </TouchableOpacity>

            {showCreateSession && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Neuer Termin</Text>
                <View style={styles.rowWrap}>
                  <TouchableOpacity
                    style={[styles.typeChip, sessionType === 'training' && styles.typeChipActive]}
                    onPress={() => setSessionType('training')}
                  >
                    <Text style={[styles.typeChipText, sessionType === 'training' && styles.typeChipTextActive]}>
                      Training
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeChip, sessionType === 'event' && styles.typeChipActive]}
                    onPress={() => setSessionType('event')}
                  >
                    <Text style={[styles.typeChipText, sessionType === 'event' && styles.typeChipTextActive]}>
                      Veranstaltung
                    </Text>
                  </TouchableOpacity>
                </View>
                {sessionType === 'event' ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Titel"
                    placeholderTextColor="#999"
                    value={sessionTitle}
                    onChangeText={setSessionTitle}
                  />
                ) : null}
                <TextInput
                  style={styles.input}
                  placeholder={sessionType === 'event' ? 'Start (YYYY-MM-DDTHH:mm:ss)' : 'Datum (YYYY-MM-DD)'}
                  placeholderTextColor="#999"
                  value={sessionDate}
                  onChangeText={setSessionDate}
                />
                {sessionType === 'event' ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Ende (YYYY-MM-DDTHH:mm:ss)"
                      placeholderTextColor="#999"
                      value={sessionEndDate}
                      onChangeText={setSessionEndDate}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Abmeldefrist (YYYY-MM-DDTHH:mm:ss, optional)"
                      placeholderTextColor="#999"
                      value={sessionEventDeadline}
                      onChangeText={setSessionEventDeadline}
                    />
                    <Text style={styles.label}>Zusätzliche Gruppen für diese Veranstaltung</Text>
                    <View style={styles.rowWrap}>
                      {groups.map((group) => {
                        const active = group.id === selectedGroup.id || sessionEventGroupIds.includes(group.id);
                        return (
                          <TouchableOpacity
                            key={`event-group-${group.id}`}
                            style={[styles.groupChip, active && styles.groupChipActive]}
                            onPress={() => {
                              if (group.id === selectedGroup.id) {
                                return;
                              }
                              setSessionEventGroupIds((prev) =>
                                prev.includes(group.id)
                                  ? prev.filter((id) => id !== group.id)
                                  : [...prev, group.id],
                              );
                            }}
                          >
                            <Text style={[styles.groupChipText, active && styles.groupChipTextActive]}>
                              {group.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder={sessionType === 'event' ? 'Notiz' : 'Kommentar (z.B. Training in der Schwimmhalle)'}
                  placeholderTextColor="#999"
                  value={sessionComment}
                  onChangeText={setSessionComment}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  placeholder="Alternativer Ort"
                  placeholderTextColor="#999"
                  value={sessionLocation}
                  onChangeText={setSessionLocation}
                />
                {sessionType === 'training' ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Minimale Trainerzahl"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    value={sessionMinTrainers}
                    onChangeText={setSessionMinTrainers}
                  />
                ) : null}
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.submitButton} onPress={handleCreateSession} disabled={loading}>
                    <Text style={styles.submitButtonText}>Erstellen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateSession(false)}>
                    <Text style={styles.cancelButtonText}>Abbrechen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {(sessions || [])
              .sort((a, b) => {
                const dayA = a.scheduledDate.slice(0, 10);
                const dayB = b.scheduledDate.slice(0, 10);
                if (dayA !== dayB) {
                  return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
                }
                if (a.sessionType !== b.sessionType) {
                  return a.sessionType === 'event' ? -1 : 1;
                }
                return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
              })
              .map((session) => (
                <View
                  key={session.id}
                  style={[
                    styles.sessionCard,
                    session.isCancelled && styles.sessionCancelled,
                    session.availabilitySummary?.isWarning && !session.isCancelled && styles.sessionWarning,
                  ]}
                >
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTypeLine}>
                      {session.sessionType === 'event' ? 'Veranstaltung' : 'Training'}
                      {session.title ? ` · ${session.title}` : ''}
                    </Text>
                    <Text style={styles.sessionDate}>
                      {new Date(session.scheduledDate).toLocaleDateString('de-DE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </Text>
                    {session.sessionType === 'event' && session.endDate ? (
                      <Text style={styles.sessionMetaRow}>
                        Ende: {new Date(session.endDate).toLocaleString('de-DE')}
                      </Text>
                    ) : null}
                    {session.sessionType === 'event' ? (
                      <Text style={styles.sessionMetaRow}>
                        Abmeldefrist: {session.eventDeadline ? new Date(session.eventDeadline).toLocaleString('de-DE') : '24h vor Start'}
                      </Text>
                    ) : null}
                    {session.comment && <Text style={styles.sessionComment}>💬 {session.comment}</Text>}
                    {session.location && <Text style={styles.sessionLocation}>📍 {session.location}</Text>}
                    {session.isCancelled && <Text style={styles.cancelledLabel}>❌ Ausgefallen</Text>}
                    {session.sessionType === 'training' ? (
                      <Text style={styles.sessionMetaRow}>
                        Min. Trainer: {session.minTrainers ?? 1} · A {session.availabilitySummary?.available ?? 0} · U {session.availabilitySummary?.uncertain ?? 0} · N {session.availabilitySummary?.notAvailable ?? 0}
                      </Text>
                    ) : null}
                    {session.sessionType === 'training' && session.availabilitySummary?.isWarning && !session.isCancelled && session.id > 0 ? (
                      <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>⚠️ Mindestanzahl Trainer noch nicht erreicht</Text>
                        <TouchableOpacity style={styles.warningDismissButton} onPress={() => handleDismissWarning(session)}>
                          <Text style={styles.warningDismissText}>Ich übernehme alleine</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    {session.sessionType === 'training' ? (
                      <View style={styles.availabilityRow}>
                        <TouchableOpacity
                          style={[styles.availabilityButton, session.myTrainerStatus === 'A' && styles.availabilityButtonActive]}
                          onPress={() => handleTrainerAvailability(session, 'A')}
                        >
                          <Text style={styles.availabilityText}>A</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.availabilityButton, session.myTrainerStatus === 'U' && styles.availabilityButtonActive]}
                          onPress={() => handleTrainerAvailability(session, 'U')}
                        >
                          <Text style={styles.availabilityText}>U</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.availabilityButton, session.myTrainerStatus === 'N' && styles.availabilityButtonActive]}
                          onPress={() => handleTrainerAvailability(session, 'N')}
                        >
                          <Text style={styles.availabilityText}>N</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleButton, session.isCancelled && styles.toggleButtonActive]}
                    onPress={() => handleToggleCancelled(session)}
                  >
                    <Text style={styles.toggleButtonText}>{session.isCancelled ? 'Aktiv' : 'Absagen'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 15,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  typeChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: colors.primary,
  },
  groupChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  groupChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  groupChipText: {
    color: colors.text,
    fontSize: 12,
  },
  groupChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  selectInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  selectInputText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.surface,
    marginTop: 6,
    marginBottom: 8,
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    color: colors.text,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceMuted,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  groupInfo: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 13,
    color: colors.textSoft,
  },
  groupHint: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
  },
  scheduleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleEditWrap: {
    flex: 1,
  },
  scheduleActions: {
    gap: 6,
  },
  scheduleDay: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  scheduleTime: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  scheduleLocation: {
    fontSize: 13,
    color: colors.textSoft,
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  weekdayWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  weekdayButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  weekdayButtonActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary,
  },
  weekdayButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  weekdayButtonTextActive: {
    color: colors.primary,
  },
  deleteButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  userList: {
    marginBottom: 16,
  },
  userItem: {
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionCancelled: {
    backgroundColor: colors.surfaceMuted,
  },
  sessionWarning: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sessionTypeLine: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 3,
  },
  sessionComment: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  sessionLocation: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionMetaRow: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: 4,
  },
  warningBanner: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    padding: 8,
    gap: 6,
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  warningDismissButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warningDismissText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  availabilityButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  availabilityButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  availabilityText: {
    color: colors.text,
    fontWeight: '700',
  },
  cancelledLabel: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 4,
  },
  toggleButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
