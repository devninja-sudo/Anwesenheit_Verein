import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import type { AbsenceRecord, AppUser, CreateUserRole } from '../types';
import { formatGermanDateTime } from '../utils/schedule';
import { useAppTheme } from '../theme/colors';

type AdminTabProps = {
  allAbsences: AbsenceRecord[];
  allUsers: AppUser[];
  newUserEmail: string;
  setNewUserEmail: (email: string) => void;
  newUserDisplayName: string;
  setNewUserDisplayName: (name: string) => void;
  newUserRole: CreateUserRole;
  setNewUserRole: (role: CreateUserRole) => void;
  newUserPassword: string;
  setNewUserPassword: (password: string) => void;
  adminError: string;
  lastSetupLink: string;
  onCreateUser: () => void;
  onDeleteUser: (userId: number) => void;
  onCreateParentForChild: (
    child: AppUser,
    parentEmail: string,
    parentDisplayName: string,
    mode: 'create' | 'link-existing',
  ) => Promise<boolean>;
  copyToClipboard: (text: string) => void;
};

export function AdminTab({
  allAbsences,
  allUsers,
  newUserEmail,
  setNewUserEmail,
  newUserDisplayName,
  setNewUserDisplayName,
  newUserRole,
  setNewUserRole,
  newUserPassword,
  setNewUserPassword,
  adminError,
  lastSetupLink,
  onCreateUser,
  onDeleteUser,
  onCreateParentForChild,
  copyToClipboard,
}: AdminTabProps) {
  const colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [activeChildId, setActiveChildId] = React.useState<number | null>(null);
  const [parentEmailInput, setParentEmailInput] = React.useState('');
  const [parentNameInput, setParentNameInput] = React.useState('');
  const [parentMode, setParentMode] = React.useState<'create' | 'link-existing'>('create');

  const roles: CreateUserRole[] = ['parent', 'child', 'trainer'];

  const openParentFormForChild = (child: AppUser) => {
    if (activeChildId === child.id) {
      setActiveChildId(null);
      setParentEmailInput('');
      setParentNameInput('');
      setParentMode('create');
      return;
    }

    setActiveChildId(child.id);
    setParentEmailInput('');
    setParentNameInput(`Eltern von ${child.displayName}`);
    setParentMode('create');
  };

  const submitParentForChild = async (child: AppUser) => {
    const success = await onCreateParentForChild(
      child,
      parentEmailInput,
      parentNameInput,
      parentMode,
    );
    if (success) {
      setActiveChildId(null);
      setParentEmailInput('');
      setParentNameInput('');
      setParentMode('create');
    }
  };

  return (
    <View style={styles.contentCard}>
      <Text style={styles.sectionTitle}>Admin</Text>

      <Text style={styles.subHeading}>Neuer Account</Text>
      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={newUserEmail}
        onChangeText={setNewUserEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Anzeigename"
        value={newUserDisplayName}
        onChangeText={setNewUserDisplayName}
      />

      <Text style={styles.inlineLabel}>Rolle wählen</Text>
      <View style={styles.row}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.chip, newUserRole === role && styles.chipActive]}
            onPress={() => setNewUserRole(role)}
          >
            <Text style={styles.chipText}>{role}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Passwort (optional)"
        secureTextEntry
        value={newUserPassword}
        onChangeText={setNewUserPassword}
      />

      {adminError ? <Text style={styles.error}>{adminError}</Text> : null}
      {lastSetupLink ? (
        <View style={styles.linkBox}>
          <Text style={styles.linkText} selectable>
            {lastSetupLink}
          </Text>
          <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(lastSetupLink)}>
            <Text style={styles.copyButtonText}>Link kopieren</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.submitButton} onPress={onCreateUser}>
        <Text style={styles.submitText}>Account erstellen</Text>
      </TouchableOpacity>

      <Text style={styles.subHeading}>Alle Accounts</Text>
      <ScrollView style={styles.accountsList}>
        {allUsers.map((user) => (
          <View key={user.id} style={styles.accountItem}>
            <Text style={styles.accountName}>
              #{user.id} · {user.displayName}
            </Text>
            <Text style={styles.accountMeta}>
              {user.email} · {user.role}
            </Text>
            {user.role === 'child' ? (
              <>
                <TouchableOpacity
                  style={styles.linkParentButton}
                  onPress={() => openParentFormForChild(user)}
                >
                  <Text style={styles.linkParentButtonText}>Erzeuge Elternaccount</Text>
                </TouchableOpacity>
                {activeChildId === user.id ? (
                  <View style={styles.parentFormBox}>
                    <Text style={styles.inlineLabel}>Aktion</Text>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={[styles.chip, parentMode === 'create' && styles.chipActive]}
                        onPress={() => setParentMode('create')}
                      >
                        <Text style={styles.chipText}>Neu erstellen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.chip, parentMode === 'link-existing' && styles.chipActive]}
                        onPress={() => setParentMode('link-existing')}
                      >
                        <Text style={styles.chipText}>Bestehendes Elternkonto</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Eltern E-Mail"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={parentEmailInput}
                      onChangeText={setParentEmailInput}
                    />
                    {parentMode === 'create' ? (
                      <TextInput
                        style={styles.input}
                        placeholder="Name Elternaccount"
                        value={parentNameInput}
                        onChangeText={setParentNameInput}
                      />
                    ) : null}
                    <TouchableOpacity
                      style={styles.inlineSubmitButton}
                      onPress={() => submitParentForChild(user)}
                    >
                      <Text style={styles.inlineSubmitButtonText}>
                        {parentMode === 'create' ? 'Elternaccount erstellen' : 'Elternkonto verknüpfen'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : null}
            <TouchableOpacity style={styles.deleteHintButton} onLongPress={() => onDeleteUser(user.id)}>
              <Text style={styles.hintSmall}>Lange drücken zum Löschen</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.subHeading}>Alle Krankmeldungen</Text>
      <ScrollView style={styles.absencesList}>
        {allAbsences.length === 0 ? (
          <Text style={styles.hint}>Keine Krankmeldungen vorhanden.</Text>
        ) : (
          allAbsences.map((absence) => (
            <View key={absence.id} style={styles.absenceItem}>
              <Text style={styles.absenceName}>
                #{absence.id} · {absence.athleteName}
              </Text>
              <Text style={styles.absenceMeta}>
                {formatGermanDateTime(new Date(absence.trainingStartIso ?? absence.trainingStart ?? ''))}
              </Text>
              <Text style={styles.absenceMeta}>von {absence.reporterName}</Text>
              {absence.reasonText ? (
                <Text style={styles.absenceReason}>Grund: {absence.reasonText}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
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
  subHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    fontSize: 14,
    color: colors.text,
  },
  inlineLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
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
  error: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  linkBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    backgroundColor: colors.surfaceMuted,
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  copyButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
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
  accountsList: {
    maxHeight: 200,
  },
  accountItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    backgroundColor: colors.surfaceMuted,
  },
  accountName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  accountMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  absencesList: {
    maxHeight: 300,
  },
  absenceItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    backgroundColor: colors.surfaceMuted,
  },
  absenceName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  absenceMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  absenceReason: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  hint: {
    color: colors.textSoft,
    fontSize: 13,
  },
  hintSmall: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 4,
  },
  linkParentButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  linkParentButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteHintButton: {
    alignSelf: 'flex-start',
  },
  parentFormBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    gap: 8,
    backgroundColor: colors.surface,
  },
  inlineSubmitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  inlineSubmitButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 12,
    fontWeight: '700',
  },
});
