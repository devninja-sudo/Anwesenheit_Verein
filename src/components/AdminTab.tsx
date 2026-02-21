import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import type { AbsenceRecord, AppUser, ChildLink, CreateUserRole } from '../types';
import { formatGermanDateTime } from '../utils/schedule';
import { API_BASE_URL } from '../api/client';

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
  parentIdForLink: string;
  setParentIdForLink: (id: string) => void;
  childIdForLink: string;
  setChildIdForLink: (id: string) => void;
  onLinkAccounts: () => void;
  copyToClipboard: (text: string) => void;
};

const PRIMARY_BLUE = '#2d69a6';

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
  parentIdForLink,
  setParentIdForLink,
  childIdForLink,
  setChildIdForLink,
  onLinkAccounts,
  copyToClipboard,
}: AdminTabProps) {
  const roles: CreateUserRole[] = ['parent', 'child', 'trainer'];

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

      <Text style={styles.subHeading}>Verknüpfung</Text>
      <TextInput
        style={styles.input}
        placeholder="Parent User ID"
        keyboardType="number-pad"
        value={parentIdForLink}
        onChangeText={setParentIdForLink}
      />
      <TextInput
        style={styles.input}
        placeholder="Child User ID"
        keyboardType="number-pad"
        value={childIdForLink}
        onChangeText={setChildIdForLink}
      />
      <TouchableOpacity style={styles.submitButton} onPress={onLinkAccounts}>
        <Text style={styles.submitText}>Verknüpfen</Text>
      </TouchableOpacity>

      <Text style={styles.subHeading}>Alle Accounts</Text>
      <ScrollView style={styles.accountsList}>
        {allUsers.map((user) => (
          <TouchableOpacity key={user.id} style={styles.accountItem} onLongPress={() => onDeleteUser(user.id)}>
            <Text style={styles.accountName}>
              #{user.id} · {user.displayName}
            </Text>
            <Text style={styles.accountMeta}>
              {user.email} · {user.role}
            </Text>
            <Text style={styles.hintSmall}>Lange drücken zum Löschen</Text>
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#deebf8',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
  subHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2d5073',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7dff5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#22384e',
  },
  inlineLabel: {
    color: '#355a80',
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
    borderColor: '#c7dff5',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: '#e7f1fb',
    borderColor: PRIMARY_BLUE,
  },
  chipText: {
    color: '#234b73',
    fontWeight: '500',
    fontSize: 13,
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 13,
  },
  linkBox: {
    borderWidth: 1,
    borderColor: '#d6e6f7',
    borderRadius: 10,
    padding: 8,
    gap: 6,
    backgroundColor: '#f7fbff',
  },
  linkText: {
    color: '#2f577d',
    fontSize: 12,
  },
  copyButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#c6dcf1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  copyButtonText: {
    color: '#2c5a85',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  accountsList: {
    maxHeight: 200,
  },
  accountItem: {
    borderWidth: 1,
    borderColor: '#d6e6f7',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#f9fcff',
  },
  accountName: {
    color: '#2a4d71',
    fontSize: 13,
    fontWeight: '600',
  },
  accountMeta: {
    color: '#5d7590',
    fontSize: 11,
  },
  absencesList: {
    maxHeight: 300,
  },
  absenceItem: {
    borderWidth: 1,
    borderColor: '#d6e6f7',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#f9fcff',
  },
  absenceName: {
    color: '#2a4d71',
    fontSize: 13,
    fontWeight: '600',
  },
  absenceMeta: {
    color: '#5d7590',
    fontSize: 11,
  },
  absenceReason: {
    color: '#3a5a7a',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  hint: {
    color: '#6c8094',
    fontSize: 13,
  },
  hintSmall: {
    color: '#6c8094',
    fontSize: 11,
    marginTop: 4,
  },
});
