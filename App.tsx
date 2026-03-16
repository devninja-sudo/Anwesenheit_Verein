import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAbsence,
  createAttendanceSession,
  deleteUser,
  createUser,
  exportAttendanceCsv,
  getChildGroups,
  getGroupSessions,
  getCurrentUser,
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
  registerPushToken,
  requestPasswordSetup,
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
  TrainingGroupFull,
  TrainingSessionInstance,
} from './src/types';
import {
  getAttendanceRelevantScheduleSessions,
  getScheduleSessionEnd,
  isSickCallAllowed,
} from './src/utils/schedule';
import { AuthScreen } from './src/components/AuthScreen';
import { StartTab } from './src/components/StartTab';
import { SickCallTab } from './src/components/SickCallTab';
import { AttendanceTab } from './src/components/AttendanceTab';
import { AdminTab } from './src/components/AdminTab';
import { TrainerTab } from './src/components/TrainerTab';
import { useAppTheme } from './src/theme/colors';

type AppTab = 'start' | 'meldung' | 'attendance' | 'groups' | 'admin';
type AuthView = 'login' | 'request';

const AUTH_TOKEN_STORAGE_KEY = 'aegir_auth_token';

export default function App() {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isIosWeb =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const isStandaloneDisplayMode =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone =
    isIosWeb &&
    ((((navigator as Navigator & { standalone?: boolean }).standalone) ?? false) ||
      isStandaloneDisplayMode);
  const showIosInstallBanner = isIosWeb && !isIosStandalone;

  const [authToken, setAuthToken] = useState('');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const [activeTab, setActiveTab] = useState<AppTab>('start');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Sick call states
  const [athleteName, setAthleteName] = useState('');
  const [reporterName, setReporterName] = useState('');
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

  // Family states
  const [linkedChildren, setLinkedChildren] = useState<ChildLink[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // Attendance states
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceEntry[]>([]);
  const [excusedChildren, setExcusedChildren] = useState<ExcusedChild[]>([]);
  const [csvExport, setCsvExport] = useState('');

  const ensurePushTokenRegistered = React.useCallback(async () => {
    if (!authToken || !currentUser) {
      return;
    }

    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const existing = await Notifications.getPermissionsAsync();
      let granted = existing.granted;
      if (!granted) {
        const requested = await Notifications.requestPermissionsAsync();
        granted = requested.granted;
      }
      if (!granted) {
        return;
      }

      const projectId =
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

      const pushTokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );

      await registerPushToken(authToken, {
        token: pushTokenResponse.data,
        platform: 'android',
      });
    } catch {
      // ignore push registration errors in UI flow
    }
  }, [authToken, currentUser]);

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

  const currentAttendanceGroup = useMemo(
    () => trainingGroups.find((group) => group.key === selectedAttendanceGroup) ?? null,
    [trainingGroups, selectedAttendanceGroup],
  );

  const attendanceUpcomingSessions = useMemo(() => {
    if (!currentAttendanceGroup) return [];
    return getAttendanceRelevantScheduleSessions(currentAttendanceGroup.schedules, 30, 2);
  }, [currentAttendanceGroup]);

  const calendarDays = useMemo(() => {
    const dateMap = new Map<
      string,
      { date: Date; sessions: TrainingSessionInstance[]; isCancelled: boolean; userAbsence?: AbsenceRecord }
    >();

    const expandSessionOccurrences = (session: TrainingSessionInstance): TrainingSessionInstance[] => {
      if (session.sessionType !== 'event' || !session.endDate) {
        return [session];
      }

      const start = new Date(session.scheduledDate);
      const end = new Date(session.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
        return [session];
      }

      const startHours = start.getHours();
      const startMinutes = start.getMinutes();
      const endHours = end.getHours();
      const endMinutes = end.getMinutes();
      const items: TrainingSessionInstance[] = [];

      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);

      while (cursor.getTime() <= endDay.getTime()) {
        const dayStart = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
          startHours,
          startMinutes,
          0,
          0,
        );
        const dayEnd = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
          endHours,
          endMinutes,
          0,
          0,
        );

        items.push({
          ...session,
          scheduledDate: dayStart.toISOString(),
          endDate: dayEnd.toISOString(),
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      return items;
    };

    groupSessions.forEach((session) => {
      const occurrences = expandSessionOccurrences(session);
      occurrences.forEach((occurrence) => {
        const sessionDate = new Date(occurrence.scheduledDate);
        const dateKey = sessionDate.toISOString().split('T')[0]!;
        const entry = dateMap.get(dateKey) ?? {
          date: sessionDate,
          sessions: [],
          isCancelled: true,
          userAbsence: undefined,
        };

        entry.sessions.push(occurrence);
        entry.isCancelled = entry.isCancelled && occurrence.isCancelled;
        dateMap.set(dateKey, entry);
      });
    });

    absences.forEach((absence) => {
      const absenceDate = new Date(absence.trainingStartIso);
      const dateKey = absenceDate.toISOString().split('T')[0]!;
      const entry = dateMap.get(dateKey);
      if (!entry || !athleteName) {
        return;
      }
      if (absence.athleteName.toLowerCase() !== athleteName.toLowerCase()) {
        return;
      }
      entry.userAbsence = absence;
    });

    return Array.from(dateMap.values())
      .map((entry) => ({
        ...entry,
        sessions: entry.sessions.sort((a, b) => {
          if (a.sessionType !== b.sessionType) {
            return a.sessionType === 'event' ? -1 : 1;
          }
          return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        }),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [groupSessions, absences, athleteName]);

  const selectedCalendarSession = useMemo(() => {
    for (const day of calendarDays) {
      const session = day.sessions.find((item) => item.scheduledDate === selectedSessionIso);
      if (session) {
        return session;
      }
    }
    return null;
  }, [calendarDays, selectedSessionIso]);

  const isLateCancellation = useMemo(() => {
    if (!selectedCalendarSession || selectedCalendarSession.sessionType === 'event') return false;
    const trainingStart = new Date(selectedCalendarSession.scheduledDate);
    const diffMs = trainingStart.getTime() - new Date().getTime();
    if (Number.isNaN(diffMs)) return false;
    return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;
  }, [selectedCalendarSession]);

  const currentAttendanceSession =
    attendanceSessions.find((s) => s.trainingStart === selectedAttendanceSessionIso) ?? null;
  const [creatingAttendanceSessionIso, setCreatingAttendanceSessionIso] = useState<string | null>(null);

  const canEditAttendance = useMemo(() => {
    if (!selectedAttendanceSessionIso || !currentAttendanceGroup) return false;
    const trainingStart = new Date(selectedAttendanceSessionIso);
    if (Number.isNaN(trainingStart.getTime())) return false;

    const trainingEnd = getScheduleSessionEnd(trainingStart, currentAttendanceGroup.schedules);
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000;
    // Can edit 4 hours before start and until 4 hours after end.
    return now >= trainingStart.getTime() - fourHours && now <= trainingEnd.getTime() + fourHours;
  }, [selectedAttendanceSessionIso, currentAttendanceGroup]);

  // Data loading
  const fetchAbsenceFeed = React.useCallback(async () => {
    if (!authToken || (currentUser?.role !== 'trainer' && currentUser?.role !== 'admin')) {
      setAbsences([]);
      return;
    }
    try {
      setAbsences(await listAbsences(authToken));
    } catch {
      setAbsences([]);
    }
  }, [authToken, currentUser?.role]);

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
      const groups =
        currentUser.role === 'child'
          ? await getMyGroups(authToken)
          : currentUser.role === 'parent' && selectedChildId
            ? await getChildGroups(authToken, selectedChildId)
            : currentUser.role === 'parent'
              ? []
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
  }, [authToken, currentUser, selectedGroup, selectedAttendanceGroup, selectedChildId]);

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

  const ensureAttendanceSession = React.useCallback(
    async (trainingStartIso: string, groupKey: string) => {
      if (!authToken || !trainingStartIso || !groupKey) {
        return;
      }

      const existing = attendanceSessions.find((session) => session.trainingStart === trainingStartIso);
      if (existing) {
        return;
      }

      if (creatingAttendanceSessionIso === trainingStartIso) {
        return;
      }

      setCreatingAttendanceSessionIso(trainingStartIso);
      try {
        const created = await createAttendanceSession(authToken, {
          groupKey,
          trainingStartIso,
        });
        setAttendanceSessions((prev) => {
          const exists = prev.some((session) => session.id === created.id);
          return exists ? prev : [created, ...prev];
        });
      } catch {
        await loadAttendanceData();
      } finally {
        setCreatingAttendanceSessionIso(null);
      }
    },
    [authToken, attendanceSessions, creatingAttendanceSessionIso, loadAttendanceData],
  );

  const onSelectAttendanceSession = React.useCallback(
    async (iso: string) => {
      setSelectedAttendanceSessionIso(iso);
      await ensureAttendanceSession(iso, selectedAttendanceGroup);
    },
    [ensureAttendanceSession, selectedAttendanceGroup],
  );

  // Initial data load and effects
  React.useEffect(() => {
    fetchAbsenceFeed();
  }, [fetchAbsenceFeed]);

  React.useEffect(() => {
    const firstSession = calendarDays.at(0)?.sessions.at(0);
    if (firstSession && !selectedSessionIso) {
      setSelectedSessionIso(firstSession.scheduledDate);
    }
  }, [calendarDays, selectedSessionIso]);

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
    ensurePushTokenRegistered();
  }, [ensurePushTokenRegistered]);

  React.useEffect(() => {
    const firstAttendanceSession = attendanceUpcomingSessions.at(0);
    if (firstAttendanceSession) {
      setSelectedAttendanceSessionIso(firstAttendanceSession.toISOString());
      return;
    }
    setSelectedAttendanceSessionIso('');
  }, [selectedAttendanceGroup, attendanceUpcomingSessions]);

  React.useEffect(() => {
    if (
      !authToken ||
      activeTab !== 'attendance' ||
      !selectedAttendanceSessionIso ||
      !selectedAttendanceGroup ||
      currentAttendanceSession ||
      creatingAttendanceSessionIso === selectedAttendanceSessionIso
    ) {
      return;
    }

    ensureAttendanceSession(selectedAttendanceSessionIso, selectedAttendanceGroup);
  }, [
    authToken,
    activeTab,
    selectedAttendanceSessionIso,
    selectedAttendanceGroup,
    currentAttendanceSession,
    creatingAttendanceSessionIso,
    ensureAttendanceSession,
  ]);

  React.useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        if (!storedToken) {
          return;
        }

        const user = await getCurrentUser(storedToken);
        if (cancelled) {
          return;
        }

        setAuthToken(storedToken);
        setCurrentUser(user);
        setReporterName(user.displayName);
        setActiveTab('start');
        if (user.role === 'child') {
          setAthleteName(user.displayName);
        }
      } catch {
        await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

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
      await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.accessToken);
      setAuthToken(result.accessToken);
      setCurrentUser(result.user);
      setReporterName(result.user.displayName);
      setActiveTab('start');
      setAuthView('login');
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

  const onLogout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
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

    if (!selectedCalendarSession) {
      setError('Ausgewählter Termin konnte nicht geladen werden.');
      return;
    }

    if (!selectedGroup) {
      setError('Bitte eine Trainingsgruppe auswählen.');
      return;
    }

    const trainingStart = new Date(selectedCalendarSession.scheduledDate);

    const now = new Date();
    const isEvent = selectedCalendarSession.sessionType === 'event';

    if (isEvent) {
      const deadline = selectedCalendarSession.eventDeadline
        ? new Date(selectedCalendarSession.eventDeadline)
        : new Date(trainingStart.getTime() - 24 * 60 * 60 * 1000);

      if (trainingStart.getTime() <= now.getTime()) {
        setError('Abmeldung für bereits gestartete Veranstaltungen ist nicht möglich.');
        return;
      }

      if (deadline.getTime() < now.getTime()) {
        setError('Die Abmeldefrist für diese Veranstaltung ist abgelaufen.');
        return;
      }
    }

    if (!isEvent && !isSickCallAllowed(trainingStart, now) && !isLateCancellation) {
      setError('Abmeldung ist für vergangene Termine nicht möglich.');
      return;
    }

    if (!isEvent && isLateCancellation && !lateReason.trim()) {
      setError('Bei Abmeldung unter 24 Stunden ist ein Grund erforderlich.');
      return;
    }

    const reporterType = currentUser?.role === 'parent' ? 'parent' : 'athlete';

    await createAbsence({
      token: authToken,
      athleteName: athleteDisplayName,
      reporterName: reporterName.trim(),
      reporterType,
      groupKey: selectedGroup,
      sessionId: selectedCalendarSession.id > 0 ? selectedCalendarSession.id : undefined,
      sessionType: selectedCalendarSession.sessionType,
      sessionLabel: selectedCalendarSession.title ?? undefined,
      trainingStartIso: trainingStart.toISOString(),
      reasonText: !isEvent && isLateCancellation ? lateReason.trim() : undefined,
    });
    if (currentUser?.role === 'trainer' || currentUser?.role === 'admin') {
      await fetchAbsenceFeed();
    }

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

  const onCreateParentForChild = async (
    childUser: AppUser,
    parentEmailInput: string,
    parentDisplayNameInput: string,
    mode: 'create' | 'link-existing',
  ): Promise<boolean> => {
    setAdminError('');
    setLastSetupLink('');

    if (!authToken) {
      setAdminError('Bitte erneut anmelden.');
      return false;
    }

    if (childUser.role !== 'child') {
      setAdminError('Elternaccount kann nur für ein Kind erstellt werden.');
      return false;
    }

    try {
      const parentEmail = parentEmailInput.trim().toLowerCase();
      const parentDisplayName = parentDisplayNameInput.trim();

      if (!parentEmail) {
        setAdminError('Bitte Eltern E-Mail eingeben.');
        return false;
      }

      let setupLink: string | undefined;

      if (mode === 'create') {
        if (!parentDisplayName) {
          setAdminError('Bitte Namen für den Elternaccount eingeben.');
          return false;
        }

        const createdParent = await createUser(authToken, {
          email: parentEmail,
          displayName: parentDisplayName,
          role: 'parent',
        });
        setupLink = createdParent.setupLink;
      }

      await linkParentChild(authToken, {
        parentEmail,
        childEmail: childUser.email,
      });

      if (setupLink) {
        setLastSetupLink(setupLink);
      }

      setUsers(await listUsers(authToken));

      if (currentUser?.role === 'parent') {
        await loadLinkedChildren();
      }

      Alert.alert(
        'Erfolg',
        mode === 'create'
          ? `Elternaccount erstellt und verknüpft: ${parentEmail}`
          : `Bestehendes Elternkonto verknüpft: ${parentEmail}`,
      );
      return true;
    } catch (requestError) {
      setAdminError(
        requestError instanceof Error
          ? requestError.message
          : 'Elternaccount konnte nicht erstellt/verknüpft werden.',
      );
      return false;
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

    const performDelete = async () => {
      try {
        await deleteUser(authToken, userId);
        setUsers((prev) => prev.filter((entry) => entry.id !== userId));
      } catch (requestError) {
        setAdminError(
          requestError instanceof Error ? requestError.message : 'Benutzer konnte nicht gelöscht werden.',
        );
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(`${user.displayName} wirklich löschen?`);
      if (confirmed) {
        await performDelete();
      }
      return;
    }

    Alert.alert('Benutzer löschen', `${user.displayName} wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          void performDelete();
        },
      },
    ]);
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

  // Export CSV for all attendance sessions when attendance tab is active.
  React.useEffect(() => {
    const generateCsv = async () => {
      if (!authToken || activeTab !== 'attendance') {
        setCsvExport('');
        return;
      }
      try {
        const csv = await exportAttendanceCsv(authToken);
        setCsvExport(csv);
      } catch {
        setCsvExport('');
      }
    };
    generateCsv();
  }, [authToken, activeTab]);

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
  if (isRestoringSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        {showIosInstallBanner ? (
          <View style={styles.iosWebBanner}>
            <Text style={styles.iosWebBannerText}>
              iOS wird als Web-App unterstützt. Bitte im Safari-Menü „Zum Home-Bildschirm" nutzen.
            </Text>
          </View>
        ) : null}
        <View style={styles.authLoadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.authLoadingText}>Anmeldung wird wiederhergestellt…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        {showIosInstallBanner ? (
          <View style={styles.iosWebBanner}>
            <Text style={styles.iosWebBannerText}>
              iOS wird als Web-App unterstützt. Bitte im Safari-Menü „Zum Home-Bildschirm" nutzen.
            </Text>
          </View>
        ) : null}
        <AuthScreen
          authView={authView}
          setAuthView={setAuthView}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          authError={authError}
          authMessage={authMessage}
          lastSetupLink={lastSetupLink}
          onLogin={onLogin}
          onRequestSetup={onRequestSetup}
          copyToClipboard={copyToClipboard}
        />
      </SafeAreaView>
    );
  }

  // Main authenticated view
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {showIosInstallBanner ? (
        <View style={styles.iosWebBanner}>
          <Text style={styles.iosWebBannerText}>
            iOS wird als Web-App unterstützt. Bitte im Safari-Menü „Zum Home-Bildschirm" nutzen.
          </Text>
        </View>
      ) : null}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Image
            source={require('./public/logo_aegir-e1463061635692.png')}
            style={styles.topBarLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.topBarTitle}>BRC Ägir</Text>
            <Text style={styles.topBarSubtitle}>{currentUser.displayName}</Text>
            <Text style={styles.topBarEmail}>{currentUser.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {activeTab === 'start' && (
          <StartTab currentUser={currentUser} absences={absences} authToken={authToken} />
        )}
        {activeTab === 'meldung' && (
          <SickCallTab
            currentUser={currentUser}
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
            showLateReasonDropdown={currentUser.role === 'child'}
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
            onSelectAttendanceSession={onSelectAttendanceSession}
            currentAttendanceSession={currentAttendanceSession}
            isOpeningSelectedSession={
              !!selectedAttendanceSessionIso &&
              creatingAttendanceSessionIso === selectedAttendanceSessionIso &&
              !currentAttendanceSession
            }
            excusedChildren={excusedChildren}
            attendanceEntries={attendanceEntries}
            csvExport={csvExport}
            canEditAttendance={canEditAttendance}
            onToggleAttendance={onToggleAttendance}
            copyToClipboard={copyToClipboard}
            downloadCsv={downloadCsv}
          />
        )}
        {activeTab === 'admin' && (
          <AdminTab
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
            onCreateParentForChild={onCreateParentForChild}
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

const createStyles = (colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 84,
  },
  authLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  authLoadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  iosWebBanner: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceMuted,
  },
  iosWebBannerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  topBarLogo: {
    width: 36,
    height: 36,
  },
  topBarTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 18,
  },
  topBarSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  topBarEmail: {
    color: colors.textSoft,
    fontSize: 11,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceMuted,
  },
  logoutText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
