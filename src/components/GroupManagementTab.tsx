import { useEffect, useState } from 'react';
import {
  AssignUserInput,
  CreateGroupInput,
  CreateScheduleInput,
  CreateSessionInput,
  GroupMember,
  TrainingGroupFull,
  TrainingSessionInstance,
  UpdateGroupInput,
  AppUser,
} from '../types';
import {
  addScheduleToGroup,
  assignUserToGroup,
  createTrainingGroup,
  createTrainingSession,
  getGroupMembers,
  getGroupSessions,
  listTrainingGroups,
  removeSchedule,
  unassignUserFromGroup,
  updateTrainingGroup,
  updateTrainingSession,
  listUsers,
} from '../api/backendApi';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

type TabView = 'groups' | 'schedules' | 'members' | 'sessions';

type Props = {
  token: string;
};

export default function GroupManagementTab({ token }: Props) {
  const [view, setView] = useState<TabView>('groups');
  const [groups, setGroups] = useState<TrainingGroupFull[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TrainingGroupFull | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionInstance[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroup, setNewGroup] = useState<CreateGroupInput>({ name: '', key: '', description: '' });
  const [editGroup, setEditGroup] = useState<UpdateGroupInput>({});
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState<CreateScheduleInput>({ dayOfWeek: 1, startTime: '', endTime: '', location: '' });
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSession, setNewSession] = useState<CreateSessionInput>({ groupId: 0, scheduledDate: '', comment: '', location: '' });

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
      setGroups(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  async function loadAllUsers() {
    try {
      const data = await listUsers(token);
      setAllUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    }
  }

  async function loadMembers(groupId: number) {
    try {
      setLoading(true);
      const data = await getGroupMembers(token, groupId);
      setMembers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  async function loadSessions(groupId: number) {
    try {
      setLoading(true);
      const data = await getGroupSessions(token, groupId, 30);
      setSessions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup() {
    if (!newGroup.name || !newGroup.key) {
      setError('Name und Schlüssel sind erforderlich');
      return;
    }
    try {
      setLoading(true);
      await createTrainingGroup(token, newGroup);
      await loadGroups();
      setShowCreateGroup(false);
      setNewGroup({ name: '', key: '', description: '' });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateGroup() {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      const updated = await updateTrainingGroup(token, selectedGroup.id, editGroup);
      setGroups(groups.map(g => g.id === updated.id ? updated : g));
      setSelectedGroup(updated);
      setEditGroup({});
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update group');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSchedule() {
    if (!selectedGroup || !newSchedule.startTime || !newSchedule.endTime) {
      setError('Start- und Endzeit sind erforderlich');
      return;
    }
    try {
      setLoading(true);
      const updated = await addScheduleToGroup(token, selectedGroup.id, newSchedule);
      setGroups(groups.map(g => g.id === updated.id ? updated : g));
      setSelectedGroup(updated);
      setShowAddSchedule(false);
      setNewSchedule({ dayOfWeek: 1, startTime: '', endTime: '', location: '' });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to add schedule');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveSchedule(scheduleId: number) {
    if (!selectedGroup) return;
    if (!confirm('Zeitplan wirklich löschen?')) return;
    try {
      setLoading(true);
      await removeSchedule(token, selectedGroup.id, scheduleId);
      await loadGroups();
      const updated = groups.find(g => g.id === selectedGroup.id);
      if (updated) setSelectedGroup(updated);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to remove schedule');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignUser(userId: number) {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      await assignUserToGroup(token, selectedGroup.id, { userId });
      await loadMembers(selectedGroup.id);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to assign user');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnassignUser(userId: number) {
    if (!selectedGroup) return;
    if (!confirm('Zuweisung wirklich aufheben?')) return;
    try {
      setLoading(true);
      await unassignUserFromGroup(token, selectedGroup.id, userId);
      await loadMembers(selectedGroup.id);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to unassign user');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession() {
    if (!newSession.groupId || !newSession.scheduledDate) {
      setError('Gruppe und Datum sind erforderlich');
      return;
    }
    try {
      setLoading(true);
      await createTrainingSession(token, newSession);
      if (selectedGroup) {
        await loadSessions(selectedGroup.id);
      }
      setShowCreateSession(false);
      setNewSession({ groupId: 0, scheduledDate: '', comment: '', location: '' });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCancelled(session: TrainingSessionInstance) {
    try {
      setLoading(true);
      await updateTrainingSession(token, session.id, { isCancelled: !session.isCancelled });
      if (selectedGroup) {
        await loadSessions(selectedGroup.id);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update session');
    } finally {
      setLoading(false);
    }
  }

  const availableUsers = allUsers.filter(
    u => u.role === 'child' && !members.some(m => m.userId === u.id)
  );

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Trainingsgruppen-Verwaltung</h2>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fee', border: '1px solid #faa', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '2px solid #ccc' }}>
        <button
          onClick={() => setView('groups')}
          style={{
            padding: '0.5rem 1rem',
            background: view === 'groups' ? '#007bff' : 'transparent',
            color: view === 'groups' ? 'white' : '#007bff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Gruppen
        </button>
        {selectedGroup && (
          <>
            <button
              onClick={() => setView('schedules')}
              style={{
                padding: '0.5rem 1rem',
                background: view === 'schedules' ? '#007bff' : 'transparent',
                color: view === 'schedules' ? 'white' : '#007bff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Zeitpläne
            </button>
            <button
              onClick={() => setView('members')}
              style={{
                padding: '0.5rem 1rem',
                background: view === 'members' ? '#007bff' : 'transparent',
                color: view === 'members' ? 'white' : '#007bff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Mitglieder
            </button>
            <button
              onClick={() => setView('sessions')}
              style={{
                padding: '0.5rem 1rem',
                background: view === 'sessions' ? '#007bff' : 'transparent',
                color: view === 'sessions' ? 'white' : '#007bff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Termine
            </button>
          </>
        )}
      </div>

      {/* Groups View */}
      {view === 'groups' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Trainingsgruppen</h3>
            <button
              onClick={() => setShowCreateGroup(!showCreateGroup)}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Neue Gruppe
            </button>
          </div>

          {showCreateGroup && (
            <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
              <h4>Neue Gruppe erstellen</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Name (z.B. Jugend)"
                  value={newGroup.name}
                  onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Schlüssel (z.B. youth)"
                  value={newGroup.key}
                  onChange={e => setNewGroup({ ...newGroup, key: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <textarea
                  placeholder="Beschreibung (optional)"
                  value={newGroup.description}
                  onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleCreateGroup}
                    disabled={loading}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Erstellen
                  </button>
                  <button
                    onClick={() => setShowCreateGroup(false)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                style={{
                  padding: '1rem',
                  border: selectedGroup?.id === group.id ? '2px solid #007bff' : '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selectedGroup?.id === group.id ? '#e7f3ff' : 'white',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{group.name}</h4>
                    <p style={{ margin: '0.25rem 0', color: '#6c757d', fontSize: '0.9rem' }}>
                      Schlüssel: {group.key} | {group.schedules.length} Zeitpläne | {group.isActive ? 'Aktiv' : 'Inaktiv'}
                    </p>
                    {group.description && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>{group.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedules View */}
      {view === 'schedules' && selectedGroup && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Zeitpläne für {selectedGroup.name}</h3>
            <button
              onClick={() => setShowAddSchedule(!showAddSchedule)}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Zeitplan hinzufügen
            </button>
          </div>

          {showAddSchedule && (
            <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
              <h4>Neuen Zeitplan hinzufügen</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={newSchedule.dayOfWeek}
                  onChange={e => setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value) })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {WEEKDAYS.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
                <input
                  type="time"
                  placeholder="Startzeit"
                  value={newSchedule.startTime}
                  onChange={e => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <input
                  type="time"
                  placeholder="Endzeit"
                  value={newSchedule.endTime}
                  onChange={e => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Ort (optional)"
                  value={newSchedule.location}
                  onChange={e => setNewSchedule({ ...newSchedule, location: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleAddSchedule}
                    disabled={loading}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Hinzufügen
                  </button>
                  <button
                    onClick={() => setShowAddSchedule(false)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedGroup.schedules
              .filter(s => s.isActive)
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
              .map(schedule => (
                <div
                  key={schedule.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>{WEEKDAYS[schedule.dayOfWeek]}</strong>
                    <span style={{ marginLeft: '1rem' }}>
                      {schedule.startTime} - {schedule.endTime}
                    </span>
                    {schedule.location && <span style={{ marginLeft: '1rem', color: '#6c757d' }}>📍 {schedule.location}</span>}
                  </div>
                  <button
                    onClick={() => handleRemoveSchedule(schedule.id)}
                    style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Löschen
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Members View */}
      {view === 'members' && selectedGroup && (
        <div>
          <h3>Mitglieder von {selectedGroup.name}</h3>

          {availableUsers.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <select
                onChange={e => handleAssignUser(parseInt(e.target.value))}
                value=""
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
              >
                <option value="">Benutzer zuweisen...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {members.map(member => (
              <div
                key={member.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{member.user.displayName}</strong>
                  <span style={{ marginLeft: '1rem', color: '#6c757d' }}>{member.user.email}</span>
                </div>
                <button
                  onClick={() => handleUnassignUser(member.userId)}
                  style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions View */}
      {view === 'sessions' && selectedGroup && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Termine für {selectedGroup.name}</h3>
            <button
              onClick={() => {
                setNewSession({ ...newSession, groupId: selectedGroup.id });
                setShowCreateSession(!showCreateSession);
              }}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Termin erstellen
            </button>
          </div>

          {showCreateSession && (
            <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
              <h4>Neuen Termin erstellen</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={newSession.scheduledDate}
                  onChange={e => setNewSession({ ...newSession, scheduledDate: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <textarea
                  placeholder="Kommentar (z.B. Training in der Schwimmhalle Landsberger Allee)"
                  value={newSession.comment}
                  onChange={e => setNewSession({ ...newSession, comment: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                />
                <input
                  type="text"
                  placeholder="Alternativer Ort (optional)"
                  value={newSession.location}
                  onChange={e => setNewSession({ ...newSession, location: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleCreateSession}
                    disabled={loading}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Erstellen
                  </button>
                  <button
                    onClick={() => setShowCreateSession(false)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sessions
              .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
              .map(session => (
                <div
                  key={session.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: session.isCancelled ? '#ffeeee' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong>{new Date(session.scheduledDate).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                      {session.comment && <p style={{ margin: '0.5rem 0 0 0' }}>💬 {session.comment}</p>}
                      {session.location && <p style={{ margin: '0.25rem 0 0 0', color: '#6c757d' }}>📍 {session.location}</p>}
                      {session.isCancelled && <p style={{ margin: '0.25rem 0 0 0', color: '#dc3545', fontWeight: 'bold' }}>❌ Ausgefallen</p>}
                    </div>
                    <button
                      onClick={() => handleToggleCancelled(session)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: session.isCancelled ? '#28a745' : '#ffc107',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {session.isCancelled ? 'Reaktivieren' : 'Abbrechen'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {loading && <p>Laden...</p>}
    </div>
  );
}
