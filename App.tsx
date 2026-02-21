import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import {
  createAbsence,
  createAttendanceSession,
  deleteUser,
  createUser,
  exportAttendanceCsv,
  getGroupSessions,
  getMyGroups,
  listAttendanceEntries,
  listAttendanceSessions,
  listAbsences,
  listChildren,
  listExcusedChildren,
  listTrainingGroups,
  linkParentChild,
  listUsers,
  listUsersByRole,
  login,
  requestPasswordSetup,
  setupPassword,
  upsertAttendanceEntry,
} from './src/api/backendApi';
import type {
  AbsenceRecord,
  AppUser,
  AttendanceEntry,
  AttendanceSession,
  ChildLink,
  CreateUserRole,
  ExcusedChild,
  ReporterType,
  TrainingGroupFull,
  TrainingSessionInstance,
} from './src/types';
import { getUpcomingScheduleSessions, isSickCallAllowed } from './src/utils/schedule';
import { AuthScreen } from './src/components/AuthScreen';
import { StartTab } from './src/components/StartTab';
import { SickCallTab } from './src/components/SickCallTab';
import { AttendanceTab } from './src/components/AttendanceTab';
import { AdminTab } from './src/components/AdminTab';
import { TrainerTab } from './src/components/TrainerTab';

type AppTab = 'start' | 'meldung' | 'attendance' | 'groups' | 'admin';
type AuthView = 'login' | 'request' | 'setup';

const PRIMARY_BLUE = '#2d69a6';

export default function App() {
  const [authToken, setAuthToken] = useState('');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>('start');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupTokenInput, setSetupTokenInput] = useState('');
  const [setupPasswordInput, setSetupPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Sick call states
  const [athleteName, setAthleteName] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterType, setReporterType] = useState<ReporterType>('athlete');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedAttendanceGroup, setSelectedAttendanceGroup] = useState<string>('');
  const [trainingGroups, setTrainingGroups] = useState<TrainingGroupFull[]>([]);
  const [groupSessions, setGroupSessions] = useState<TrainingSessionInstance[]>([]);
  const [selectedSessionIso, setSelectedSessionIso] = useState<string>('');
  const [selectedAttendanceSessionIso, setSelectedAttendanceSessionIso] = useState<string>('');
  const [lateReason, setLateReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);

  // Admin states
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<CreateUserRole>('child');
  const [adminError, setAdminError] = useState('');
  const [lastSetupLink, setLastSetupLink] = useState('');
  const [parentIdForLink, setParentIdForLink] = useState('');
  const [childIdForLink, setChildIdForLink] = useState('');

  // Family states
  const [linkedChildren, setLinkedChildren] = useState<ChildLink[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // Attendance states
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceEntry[]>([]);
  const [excusedChildren, setExcusedChildren] = useState<ExcusedChild[]>([]);
  const [csvExport, setCsvExport] = useState('');

  // Computed values
  const currentGroup = useMemo(
    () => trainingGroups.find((group) => group.key === selectedGroup) ?? null,
    [trainingGroups, selectedGroup],
  );

  const availableSickCallGroups = useMemo<Array<{ key: string; name: string }>>(
    () =>
      trainingGroups
        .map((group) => ({ key: group.key, name: group.name })),
    [trainingGroups],
  );

  const availableAttendanceGroups = useMemo<Array<{ key: string; name: string }>>(
    () =>
      trainingGroups
        .map((group) => ({ key: group.key, name: group.name })),
    [trainingGroups],
  );

  const sessions = useMemo(() => {
    if (!currentGroup) return [];
    return getUpcomingScheduleSessions(currentGroup.schedules, 30);
  }, [currentGroup]);

  const currentAttendanceGroup = useMemo(
    () => trainingGroups.find((group) => group.key === selectedAttendanceGroup) ?? null,
    [trainingGroups, selectedAttendanceGroup],
  );

  const attendanceUpcomingSessions = useMemo(() => {
    if (!currentAttendanceGroup) return [];
    return getUpcomingScheduleSessions(currentAttendanceGroup.schedules, 30);
  }, [currentAttendanceGroup]);

  const todaysAbsences = useMemo(() => {
    const now = new Date();
    return absences.filter((absence) => {
      const reported = new Date(absence.reportedAtIso);
      return (
        reported.getDate() === now.getDate() &&
        reported.getMonth() === now.getMonth() &&
        reported.getFullYear() === now.getFullYear()
      );
    });
  }, [absences]);

  const calendarDays = useMemo(() => {
    // Only show sessions from backend (includes cancellation status)
    const now = new Date();
    const dateMap = new Map<string, { session: TrainingSessionInstance; userAbsence?: AbsenceRecord }>();

    // Map sessions by date
    groupSessions.forEach((session) => {
      const sessionDate = new Date(session.scheduledDate);
      const dateKey = sessionDate.toISOString().split('T')[0]!;
      dateMap.set(dateKey, { session });
    });

    // Map user's absences to sessions
    absences.forEach((absence) => {
      const absenceDate = new Date(absence.trainingStartIso);
      const dateKey = absenceDate.toISOString().split('T')[0]!;
      const entry = dateMap.get(dateKey);
      if (entry && athleteName && absence.athleteName.toLowerCase() === athleteName.toLowerCase()) {
        entry.userAbsence = absence;
      }
    });

    // Convert to calendar days array
    return Array.from(dateMap.values())
      .map(({ session, userAbsence }) => ({
        date: new Date(session.scheduledDate),
        sessions: [new Date(session.scheduledDate)],
        isCancelled: session.isCancelled,
        userAbsence,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [groupSessions, absences, athleteName]);

  const isLateCancellation = useMemo(() => {
    if (!selectedSessionIso) return false;
    const trainingStart = new Date(selectedSessionIso);
    const diffMs = trainingStart.getTime() - new Date().getTime();
    if (Number.isNaN(diffMs)) return false;
    return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;
  }, [selectedSessionIso]);

  const currentAttendanceSession =
    attendanceSessions.find((s) => s.trainingStart === selectedAttendanceSessionIso) ?? null;

  const canEditAttendance = useMemo(() => {
    if (!selectedAttendanceSessionIso) return false;
    const sessionTime = new Date(selectedAttendanceSessionIso).getTime();
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000;
    // Can edit 4 hours before and 4 hours after
    return now >= sessionTime - fourHours && now <= sessionTime + fourHours;
  }, [selectedAttendanceSessionIso]);

  // Data loading
  const fetchAbsenceFeed = React.useCallback(async () => {
    try {
      setAbsences(await listAbsences());
    } catch {
      // silently ignore
    }
  }, []);

  const loadLinkedChildren = React.useCallback(async () => {
    if (!authToken) return;
    try {
      const children = await listChildren(authToken);
      setLinkedChildren(children);
      const firstChild = children.at(0);
      if (firstChild && !selectedChildId) {
        setSelectedChildId(firstChild.id);
        setAthleteName(firstChild.displayName);
      }
    } catch {
      // ignore
    }
  }, [authToken, selectedChildId]);

  const loadAttendanceData = React.useCallback(async () => {
    if (!authToken || (currentUser?.role !== 'trainer' && currentUser?.role !== 'admin')) return;

    try {
      const sessions = await listAttendanceSessions(authToken, {
        from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setAttendanceSessions(sessions);
    } catch {
      // ignore
    }
  }, [authToken, currentUser?.role]);

  const loadTrainingData = React.useCallback(async () => {
    if (!authToken || !currentUser) return;
    try {
      // For children, load only their assigned groups
      // For trainers/admin, load all groups
      const groups = currentUser.role === 'child' 
        ? await getMyGroups(authToken)
        : await listTrainingGroups(authToken);
      const validGroups = Array.isArray(groups) ? groups : [];
      setTrainingGroups(validGroups);

      const nextSelected = validGroups.find((group) => group.key === selectedGroup);
      if (!nextSelected) {
        const fallback = validGroups[0];
        if (fallback) {
          setSelectedGroup(fallback.key);
          setSelectedAttendanceGroup(fallback.key);
          setSelectedSessionIso('');
          setSelectedAttendanceSessionIso('');
        }
      }

      const nextAttendanceSelected = validGroups.find((group) => group.key === selectedAttendanceGroup);
      if (!nextAttendanceSelected) {
        const attendanceFallback = validGroups[0];
        if (attendanceFallback) {
          setSelectedAttendanceGroup(attendanceFallback.key);
          setSelectedAttendanceSessionIso('');
        }
      }
    } catch {
      setTrainingGroups([]);
    }
  }, [authToken, currentUser, selectedGroup, selectedAttendanceGroup]);

  const loadAttendanceEntries = React.useCallback(
    async (sessions: AttendanceSession[]) => {
      const currentSession = sessions.find((s) => s.trainingStart === selectedAttendanceSessionIso);
      if (!authToken || !currentSession) return;
      try {
        const entries = await listAttendanceEntries(authToken, currentSession.id);
        setAttendanceEntries(entries);
        const excused = await listExcusedChildren(authToken, currentSession.id);
        setExcusedChildren(excused);
      } catch {
        setAttendanceEntries([]);
        setExcusedChildren([]);
      }
    },
    [authToken, selectedAttendanceSessionIso],
  );

  // Initial data load and effects
  React.useEffect(() => {
    fetchAbsenceFeed();
  }, [fetchAbsenceFeed]);

  React.useEffect(() => {
    const firstSession = sessions.at(0);
    if (firstSession && !selectedSessionIso) {
      setSelectedSessionIso(firstSession.toISOString());
    }
  }, [sessions, selectedSessionIso]);

  React.useEffect(() => {
    if (!authToken || activeTab !== 'admin') return;
    if (currentUser?.role === 'trainer' || currentUser?.role === 'admin') {
      listUsers(authToken)
        .then(setUsers)
        .catch(() => setAdminError('Benutzerliste konnte nicht geladen werden.'));
    }
  }, [authToken, currentUser?.role, activeTab]);

  React.useEffect(() => {
    if (!authToken || activeTab !== 'attendance') return;
    if (currentUser?.role === 'trainer' || currentUser?.role === 'admin') {
      loadAttendanceData();
    }
  }, [authToken, currentUser?.role, activeTab, loadAttendanceData]);

  React.useEffect(() => {
    if (!authToken) return;
    loadTrainingData();
  }, [authToken, loadTrainingData]);

  React.useEffect(() => {
    if (currentUser?.role === 'parent') {
      loadLinkedChildren();
    }
  }, [currentUser?.role, loadLinkedChildren]);

  React.useEffect(() => {
    if (!authToken || !currentGroup?.id) {
      setGroupSessions([]);
      return;
    }
    getGroupSessions(authToken, currentGroup.id, 14)
      .then(setGroupSessions)
      .catch((err) => {
        console.error('Failed to load group sessions:', err);
        setGroupSessions([]);
      });
  }, [authToken, currentGroup?.id]);

  React.useEffect(() => {
    if (selectedAttendanceSessionIso && attendanceSessions.length > 0) {
      loadAttendanceEntries(attendanceSessions);
    }
  }, [selectedAttendanceSessionIso, attendanceSessions, loadAttendanceEntries]);

  React.useEffect(() => {
    const firstAttendanceSession = attendanceUpcomingSessions.at(0);
    if (firstAttendanceSession) {
      setSelectedAttendanceSessionIso(firstAttendanceSession.toISOString());
      return;
    }
    setSelectedAttendanceSessionIso('');
  }, [selectedAttendanceGroup, attendanceUpcomingSessions]);

  // Auth handlers
  const onLogin = async () => {
    setAuthError('');
    setAuthMessage('');

    if (!email.trim() || !password.trim()) {
      setAuthError('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    try {
      const result = await login(email.trim().toLowerCase(), password);
      setAuthToken(result.accessToken);
      setCurrentUser(result.user);
      setReporterName(result.user.displayName);
      setReporterType(result.user.role === 'parent' ? 'parent' : 'athlete');
      setActiveTab('start');
      setAuthView('login');
      await fetchAbsenceFeed();
      if (result.user.role === 'parent') {
        await loadLinkedChildren();
      } else if (result.user.role === 'child') {
        setAthleteName(result.user.displayName);
      }
    } catch (requestError) {
      setAuthError(requestError instanceof Error ? requestError.message : 'Login fehlgeschlagen.');
    }
  };

  const onRequestSetup = async () => {
    setAuthError('');
    setAuthMessage('');
    setLastSetupLink('');

    if (!email.trim()) {
      setAuthError('Bitte E-Mail eingeben.');
      return;
    }

    try {
      const result = await requestPasswordSetup(email.trim().toLowerCase());
      setAuthMessage(result.message);
      if (result.setupLink) {
        setLastSetupLink(result.setupLink);
      }
    } catch (requestError) {
      setAuthError(
        requestError instanceof Error ? requestError.message : 'Passwort-Link konnte nicht erstellt werden.',
      );
    }
  };

  const onSetupPassword = async () => {
    setAuthError('');
    setAuthMessage('');

    if (!setupTokenInput.trim() || !setupPasswordInput.trim()) {
      setAuthError('Bitte Token und neues Passwort eingeben.');
      return;
    }

    try {
      const result = await setupPassword(setupTokenInput.trim(), setupPasswordInput);
      setAuthMessage(result.message);
      setSetupTokenInput('');
      setSetupPasswordInput('');
      setAuthView('login');
      setLastSetupLink('');
    } catch (requestError) {
      setAuthError(
        requestError instanceof Error ? requestError.message : 'Passwort konnte nicht gesetzt werden.',
      );
    }
  };

  const onLogout = () => {
    setAuthToken('');
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthMessage('');
    setActiveTab('start');
    setLinkedChildren([]);
    setSelectedChildId(null);
    setAttendanceSessions([]);
    setAttendanceEntries([]);
    setExcusedChildren([]);
    setCsvExport('');
    setNewUserPassword('');
    setTrainingGroups([]);
    setSelectedGroup('junior');
    setSelectedAttendanceGroup('junior');
    setSelectedSessionIso('');
    setSelectedAttendanceSessionIso('');
  };

  // Sick call handler
  const submitSickCall = async () => {
    setError('');
    setSuccess('');

    const selectedChild = linkedChildren.find((child) => child.id === selectedChildId) ?? null;
    const athleteDisplayName =
      currentUser?.role === 'parent'
        ? selectedChild?.displayName ?? ''
        : currentUser?.role === 'child'
          ? currentUser.displayName
          : athleteName.trim();

    if (!athleteDisplayName) {
      setError('Bitte Namen des Athleten eingeben.');
      return;
    }

    if (!reporterName.trim()) {
      setError('Bitte Namen der meldenden Person eingeben.');
      return;
    }

    if (!selectedSessionIso) {
      setError('Bitte einen Trainingstermin auswählen.');
      return;
    }

    if (!selectedGroup) {
      setError('Bitte eine Trainingsgruppe auswählen.');
      return;
    }

    const trainingStart = new Date(selectedSessionIso);

    const now = new Date();
    if (!isSickCallAllowed(trainingStart, now) && !isLateCancellation) {
      setError('Abmeldung ist für vergangene Termine nicht möglich.');
      return;
    }

    if (isLateCancellation && !lateReason.trim()) {
      setError('Bei Abmeldung unter 24 Stunden ist ein Grund erforderlich.');
      return;
    }

    await createAbsence({
      athleteName: athleteDisplayName,
      reporterName: reporterName.trim(),
      reporterType,
      groupKey: selectedGroup,
      trainingStartIso: trainingStart.toISOString(),
      reasonText: isLateCancellation ? lateReason.trim() : undefined,
    });
    await fetchAbsenceFeed();

    setSuccess('Krankmeldung gespeichert. Standardstatus bleibt ansonsten: Anwesend.');
    setAthleteName('');
    setLateReason('');
    if (currentUser) {
      setReporterName(currentUser.displayName);
    }
  };

  // Admin handlers
  const onCreateUser = async () => {
    setAdminError('');
    setLastSetupLink('');

    if (!authToken) {
      setAdminError('Bitte erneut anmelden.');
      return;
    }

    if (!newUserEmail.trim() || !newUserName.trim()) {
      setAdminError('Bitte E-Mail und Name für das neue Konto eingeben.');
      return;
    }

    try {
      const result = await createUser(authToken, {
        email: newUserEmail.trim().toLowerCase(),
        displayName: newUserName.trim(),
        role: newUserRole,
        password: newUserPassword.trim() ? newUserPassword.trim() : undefined,
      });
      if (result.setupLink) {
        setLastSetupLink(result.setupLink);
      }
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setNewUserRole('child');
      setUsers(await listUsers(authToken));
    } catch (requestError) {
      setAdminError(
        requestError instanceof Error ? requestError.message : 'Konto konnte nicht erstellt werden.',
      );
    }
  };

  const onLinkAccounts = async () => {
    setAdminError('');

    if (!authToken) {
      setAdminError('Bitte erneut anmelden.');
      return;
    }

    if (!parentIdForLink.trim() || !childIdForLink.trim()) {
      setAdminError('Bitte Parent User ID und Child User ID eingeben.');
      return;
    }

    try {
      const parentUser = users.find((u) => u.id === parseInt(parentIdForLink));
      const childUser = users.find((u) => u.id === parseInt(childIdForLink));
      
      if (!parentUser || !childUser) {
        setAdminError('Benutzer mit angegebenen IDs nicht gefunden.');
        return;
      }

      await linkParentChild(authToken, {
        parentEmail: parentUser.email,
        childEmail: childUser.email,
      });
      setParentIdForLink('');
      setChildIdForLink('');
      if (currentUser?.role === 'parent') {
        await loadLinkedChildren();
      }
    } catch (requestError) {
      setAdminError(
        requestError instanceof Error ? requestError.message : 'Verknüpfung fehlgeschlagen.',
      );
    }
  };

  const onDeleteUser = async (userId: number) => {
    if (!authToken) {
      setAdminError('Bitte erneut anmelden.');
      return;
    }

    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      return;
    }

    Alert.alert('Benutzer löschen', `${user.displayName} wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUser(authToken, userId);
            setUsers((prev) => prev.filter((entry) => entry.id !== userId));
          } catch (requestError) {
            setAdminError(
              requestError instanceof Error ? requestError.message : 'Benutzer konnte nicht gelöscht werden.',
            );
          }
        },
      },
    ]);
  };

  // Attendance handlers
  const onCreateSession = async () => {
    setAdminError('');

    if (!authToken || !selectedAttendanceSessionIso) {
      setAdminError('Bitte erneut anmelden und Trainingstermin auswählen.');
      return;
    }

    try {
      const created = await createAttendanceSession(authToken, {
        groupKey: selectedAttendanceGroup,
        trainingStartIso: selectedAttendanceSessionIso,
      });
      const updatedSessions = [created, ...attendanceSessions];
      setAttendanceSessions(updatedSessions);
      // Don't reload all sessions - we just created one
      // Just load the entries for the new session
      await loadAttendanceEntries(updatedSessions);
    } catch (requestError) {
      setAdminError(
        requestError instanceof Error ? requestError.message : 'Anwesenheitsliste konnte nicht erstellt werden.',
      );
    }
  };

  const onToggleAttendance = async (childId: number, newStatus: 'present' | 'excused' | 'unexcused') => {
    if (!authToken || !currentAttendanceSession) return;

    try {
      await upsertAttendanceEntry(authToken, currentAttendanceSession.id, { childId, status: newStatus });
      await loadAttendanceEntries(attendanceSessions);
    } catch {
      // ignore
    }
  };

  // Export CSV when attendance tab is active and session is selected
  React.useEffect(() => {
    const generateCsv = async () => {
      if (!authToken || activeTab !== 'attendance' || !currentAttendanceSession) {
        setCsvExport('');
        return;
      }
      try {
        const csv = await exportAttendanceCsv(authToken, {
          from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
        setCsvExport(csv);
      } catch {
        setCsvExport('');
      }
    };
    generateCsv();
  }, [authToken, activeTab, currentAttendanceSession]);

  const copyToClipboard = async (value: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
  };

  const downloadCsv = (csvData: string) => {
    if (!csvData) return;
    
    try {
      // Create blob and download for web
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = (document as any).createElement('a');
      link.href = url;
      link.download = `anwesenheit_export_${new Date().toISOString().split('T')[0]}.csv`;
      (document as any).body.appendChild(link);
      link.click();
      (document as any).body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback: copy to clipboard if download fails
      copyToClipboard(csvData);
    }
  };

  // Render
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <AuthScreen
          authView={authView}
          setAuthView={setAuthView}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          setupTokenInput={setupTokenInput}
          setSetupTokenInput={setSetupTokenInput}
          setupPasswordInput={setupPasswordInput}
          setSetupPasswordInput={setSetupPasswordInput}
          authError={authError}
          authMessage={authMessage}
          lastSetupLink={lastSetupLink}
          onLogin={onLogin}
          onRequestSetup={onRequestSetup}
          onSetupPassword={onSetupPassword}
          copyToClipboard={copyToClipboard}
        />
      </SafeAreaView>
    );
  }

  // Main authenticated view
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>BRC Ägir</Text>
          <Text style={styles.topBarSubtitle}>{currentUser.displayName}</Text>
          <Text style={styles.topBarEmail}>{currentUser.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {activeTab === 'start' && (
          <StartTab currentUser={currentUser} sessions={sessions} todaysAbsences={todaysAbsences} authToken={authToken} />
        )}
        {activeTab === 'meldung' && (
          <SickCallTab
            currentUser={currentUser}
            reporterType={reporterType}
            setReporterType={setReporterType}
            linkedChildren={linkedChildren}
            selectedChildId={selectedChildId}
            setSelectedChildId={setSelectedChildId}
            setAthleteName={setAthleteName}
            athleteName={athleteName}
            reporterName={reporterName}
            setReporterName={setReporterName}
            availableGroups={availableSickCallGroups}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            setSelectedSessionIso={setSelectedSessionIso}
            calendarDays={calendarDays}
            selectedSessionIso={selectedSessionIso}
            isLateCancellation={isLateCancellation}
            lateReason={lateReason}
            setLateReason={setLateReason}
            error={error}
            success={success}
            submitSickCall={submitSickCall}
          />
        )}
        {activeTab === 'groups' && (
          <TrainerTab token={authToken} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab
            groups={availableAttendanceGroups}
            selectedGroup={selectedAttendanceGroup}
            setSelectedGroup={setSelectedAttendanceGroup}
            sessions={attendanceUpcomingSessions}
            selectedAttendanceSessionIso={selectedAttendanceSessionIso}
            setSelectedAttendanceSessionIso={setSelectedAttendanceSessionIso}
            currentAttendanceSession={currentAttendanceSession}
            excusedChildren={excusedChildren}
            attendanceEntries={attendanceEntries}
            csvExport={csvExport}
            canEditAttendance={canEditAttendance}
            onCreateSession={onCreateSession}
            onToggleAttendance={onToggleAttendance}
            copyToClipboard={copyToClipboard}
            downloadCsv={downloadCsv}
          />
        )}
        {activeTab === 'admin' && (
          <AdminTab
            allAbsences={absences}
            allUsers={users}
            newUserEmail={newUserEmail}
            setNewUserEmail={setNewUserEmail}
            newUserDisplayName={newUserName}
            setNewUserDisplayName={setNewUserName}
            newUserRole={newUserRole}
            setNewUserRole={setNewUserRole}
            newUserPassword={newUserPassword}
            setNewUserPassword={setNewUserPassword}
            adminError={adminError}
            lastSetupLink={lastSetupLink}
            onCreateUser={onCreateUser}
            onDeleteUser={onDeleteUser}
            parentIdForLink={parentIdForLink}
            setParentIdForLink={setParentIdForLink}
            childIdForLink={childIdForLink}
            setChildIdForLink={setChildIdForLink}
            onLinkAccounts={onLinkAccounts}
            copyToClipboard={copyToClipboard}
          />
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        {currentUser.role === 'trainer' || currentUser.role === 'admin' ? (
          <>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('start')}>
              <Text style={[styles.tabText, activeTab === 'start' && styles.tabTextActive]}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('groups')}>
              <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
                Gruppen
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('attendance')}>
              <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>
                Anwesenheit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('admin')}>
              <Text style={[styles.tabText, activeTab === 'admin' && styles.tabTextActive]}>Admin</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('start')}>
              <Text style={[styles.tabText, activeTab === 'start' && styles.tabTextActive]}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('meldung')}>
              <Text style={[styles.tabText, activeTab === 'meldung' && styles.tabTextActive]}>
                Meldung
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 84,
  },
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dce9f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  topBarTitle: {
    color: PRIMARY_BLUE,
    fontWeight: '800',
    fontSize: 18,
  },
  topBarSubtitle: {
    color: '#60758b',
    fontSize: 12,
  },
  topBarEmail: {
    color: '#8aa0b6',
    fontSize: 11,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#c6dcf1',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#f4f9te',
  },
  logoutText: {
    color: '#2c5a85',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9e9f8',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabText: {
    color: '#6c8399',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: '800',
  },
});
