import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../api/client';

type AuthView = 'login' | 'request' | 'setup';

type AuthScreenProps = {
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  setupTokenInput: string;
  setSetupTokenInput: (token: string) => void;
  setupPasswordInput: string;
  setSetupPasswordInput: (password: string) => void;
  authError: string;
  authMessage: string;
  lastSetupLink: string;
  onLogin: () => void;
  onRequestSetup: () => void;
  onSetupPassword: () => void;
  copyToClipboard: (text: string) => void;
};

const PRIMARY_BLUE = '#2d69a6';

export function AuthScreen({
  authView,
  setAuthView,
  email,
  setEmail,
  password,
  setPassword,
  setupTokenInput,
  setSetupTokenInput,
  setupPasswordInput,
  setSetupPasswordInput,
  authError,
  authMessage,
  lastSetupLink,
  onLogin,
  onRequestSetup,
  onSetupPassword,
  copyToClipboard,
}: AuthScreenProps) {
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
          <TouchableOpacity
            style={[styles.chip, authView === 'request' && styles.chipActive]}
            onPress={() => setAuthView('request')}
          >
            <Text style={styles.chipText}>Passwort-Link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, authView === 'setup' && styles.chipActive]}
            onPress={() => setAuthView('setup')}
          >
            <Text style={styles.chipText}>Passwort setzen</Text>
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
          </>
        ) : null}

        {authView === 'setup' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Setup Token"
              autoCapitalize="none"
              value={setupTokenInput}
              onChangeText={setSetupTokenInput}
            />
            <TextInput
              style={styles.input}
              placeholder="Neues Passwort"
              secureTextEntry
              value={setupPasswordInput}
              onChangeText={setSetupPasswordInput}
            />
            <TouchableOpacity style={styles.submitButton} onPress={onSetupPassword}>
              <Text style={styles.submitText}>Passwort speichern</Text>
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

const styles = StyleSheet.create({
  loginContainer: {
    padding: 16,
    paddingTop: 26,
    gap: 14,
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
  },
  brandTitle: {
    color: PRIMARY_BLUE,
    fontSize: 28,
    fontWeight: '800',
  },
  brandSubTitle: {
    color: '#4e6780',
    fontSize: 13,
    marginBottom: 6,
  },
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
  hint: {
    color: '#6c8094',
    fontSize: 13,
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 13,
  },
  success: {
    color: '#166534',
    fontWeight: '600',
    fontSize: 13,
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
});
