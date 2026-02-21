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
  TrainingGroupFull,
  TrainingSessionInstance,
} from '../types';
import {
  addScheduleToGroup,
  assignUserToGroup,
  createTrainingGroup,
  createTrainingSession,
  deleteTrainingGroup,
  getGroupMembers,
  getGroupSessions,
  listTrainingGroups,
  removeSchedule,
  unassignUserFromGroup,
  updateGroupSchedule,
  updateTrainingSession,
  listUsers,
} from '../api/backendApi';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const PRIMARY_BLUE = '#2d69a6';

type Props = {
  token: string;
};

type TabView = 'groups' | 'schedules' | 'members' | 'sessions';

export function TrainerTab({ token }: Props) {
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

  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionComment, setSessionComment] = useState('');
  const [sessionLocation, setSessionLocation] = useState('');

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
    try {
      setLoading(true);
      await createTrainingSession(token, {
        groupId: selectedGroup.id,
        scheduledDate: sessionDate,
        comment: sessionComment,
        location: sessionLocation,
      });
      await loadSessions(selectedGroup.id);
      setShowCreateSession(false);
      setSessionDate('');
      setSessionComment('');
      setSessionLocation('');
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
                onPress={() => setSelectedGroup(group)}
                onLongPress={() => handleDeleteGroup(group)}
              >
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupInfo}>
                  {group.key} | {group.schedules.length} Zeitpläne
                </Text>
                {group.description && <Text style={styles.groupDescription}>{group.description}</Text>}
                <Text style={styles.groupHint}>Lange drücken zum Löschen</Text>
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
                  placeholder="Startzeit (HH:MM)"
                  placeholderTextColor="#999"
                  value={scheduleStartTime}
                  onChangeText={setScheduleStartTime}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Endzeit (HH:MM)"
                  placeholderTextColor="#999"
                  value={scheduleEndTime}
                  onChangeText={setScheduleEndTime}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ort (optional)"
                  placeholderTextColor="#999"
                  value={scheduleLocation}
                  onChangeText={setScheduleLocation}
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddSchedule} disabled={loading}>
                    <Text style={styles.submitButtonText}>Hinzufügen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddSchedule(false)}>
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
                        placeholder="Startzeit (HH:MM)"
                        placeholderTextColor="#999"
                        value={editScheduleStartTime}
                        onChangeText={setEditScheduleStartTime}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Endzeit (HH:MM)"
                        placeholderTextColor="#999"
                        value={editScheduleEndTime}
                        onChangeText={setEditScheduleEndTime}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Ort (optional)"
                        placeholderTextColor="#999"
                        value={editScheduleLocation}
                        onChangeText={setEditScheduleLocation}
                      />
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.submitButton} onPress={handleUpdateSchedule} disabled={loading}>
                          <Text style={styles.submitButtonText}>Speichern</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingScheduleId(null)}>
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
                <TextInput
                  style={styles.input}
                  placeholder="Datum (YYYY-MM-DD)"
                  placeholderTextColor="#999"
                  value={sessionDate}
                  onChangeText={setSessionDate}
                />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Kommentar (z.B. Training in der Schwimmhalle)"
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
              .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
              .map((session) => (
                <View key={session.id} style={[styles.sessionCard, session.isCancelled && styles.sessionCancelled]}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>
                      {new Date(session.scheduledDate).toLocaleDateString('de-DE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </Text>
                    {session.comment && <Text style={styles.sessionComment}>💬 {session.comment}</Text>}
                    {session.location && <Text style={styles.sessionLocation}>📍 {session.location}</Text>}
                    {session.isCancelled && <Text style={styles.cancelledLabel}>❌ Ausgefallen</Text>}
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
            <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY_BLUE,
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: PRIMARY_BLUE,
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
  },
  tabButtonTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  addButton: {
    backgroundColor: PRIMARY_BLUE,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_BLUE,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
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
    backgroundColor: PRIMARY_BLUE,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: PRIMARY_BLUE,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  groupCardActive: {
    borderColor: PRIMARY_BLUE,
    borderWidth: 2,
    backgroundColor: '#f0f8ff',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_BLUE,
    marginBottom: 4,
  },
  groupInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 13,
    color: '#888',
  },
  groupHint: {
    fontSize: 11,
    color: '#6c8094',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: PRIMARY_BLUE,
    marginBottom: 12,
  },
  scheduleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    color: '#333',
  },
  scheduleTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scheduleLocation: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  weekdayWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  weekdayButton: {
    borderWidth: 1,
    borderColor: '#d1e4f6',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  weekdayButtonActive: {
    backgroundColor: '#e8f2fb',
    borderColor: PRIMARY_BLUE,
  },
  weekdayButtonText: {
    fontSize: 12,
    color: '#1f3e5d',
    fontWeight: '600',
  },
  weekdayButtonTextActive: {
    color: PRIMARY_BLUE,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userList: {
    marginBottom: 16,
  },
  userItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sessionCancelled: {
    backgroundColor: '#ffeeee',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sessionComment: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  sessionLocation: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  cancelledLabel: {
    fontSize: 13,
    color: '#dc3545',
    fontWeight: '600',
    marginTop: 4,
  },
  toggleButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  toggleButtonActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
