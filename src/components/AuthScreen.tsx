import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../api/client';
import { useAppTheme } from '../theme/colors';

type AuthView = 'login' | 'request';

type AuthScreenProps = {
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  authError: string;
  authMessage: string;
  lastSetupLink: string;
  onLogin: () => void;
  onRequestSetup: () => void;
  copyToClipboard: (text: string) => void;
};

export function AuthScreen({
  authView,
  setAuthView,
  email,
  setEmail,
  password,
  setPassword,
  authError,
  authMessage,
  lastSetupLink,
  onLogin,
  onRequestSetup,
  copyToClipboard,
}: AuthScreenProps) {
  const colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.loginContainer}>
      <Image
        source={require('../../public/logo_aegir-e1463061635692.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.brandTitle}>BRC Ägir</Text>
      <Text style={styles.brandSubTitle}>Anwesenheit & Krankmeldung</Text>

      <View style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Konto</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, authView === 'login' && styles.chipActive]}
            onPress={() => setAuthView('login')}
          >
            <Text style={styles.chipText}>Login</Text>
          </TouchableOpacity>
        </View>

        {authView === 'login' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="E-Mail"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Passwort"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.submitButton} onPress={onLogin}>
              <Text style={styles.submitText}>Einloggen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setAuthView('request')}>
              <Text style={styles.secondaryButtonText}>Passwort vergessen?</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {authView === 'request' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="E-Mail"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity style={styles.submitButton} onPress={onRequestSetup}>
              <Text style={styles.submitText}>Link anfordern</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setAuthView('login')}>
              <Text style={styles.secondaryButtonText}>Zurück zum Login</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {authError ? <Text style={styles.error}>{authError}</Text> : null}
        {authMessage ? <Text style={styles.success}>{authMessage}</Text> : null}
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

        <Text style={styles.hint}>API: {API_BASE_URL}</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  loginContainer: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 56,
    gap: 14,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.background,
  },
  logo: {
    width: 96,
    height: 96,
  },
  brandTitle: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  brandSubTitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 620,
    minHeight: 360,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
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
    fontSize: 14,
    color: colors.text,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});
