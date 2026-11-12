import { Redirect, router, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleProfileModal } from '@/components/google-profile-modal';
import { UserDocument, useAuth } from '@/context/auth-context';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function LoginScreen() {
  const {
    user,
    userDoc,
    loading,
    role,
    needsProfileCompletion,
    login,
    loginWithGoogle,
    logout,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!loading && user && userDoc && role) {
    return (
      <Redirect
        href={(role === 'asisten' ? '/asisten/jadwal' : '/praktikan/jadwal') as Href}
      />
    );
  }

  const navigateByProfile = (profile: UserDocument) => {
    router.replace(
      (profile.peran === 'asisten' ? '/asisten/jadwal' : '/praktikan/jadwal') as Href
    );
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Harap isi alamat email dan kata sandi terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const profile = await login(email, password);
      if (profile) {
        navigateByProfile(profile);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setGoogleSubmitting(true);
    try {
      const result = await loginWithGoogle();
      if (!result.isNewUser && result.userDoc) {
        navigateByProfile(result.userDoc);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal masuk dengan Akun Google.'
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleCancelProfile = async () => {
    await logout();
  };

  const firebaseReady = isFirebaseConfigured();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.centerContainer}>
              {/* Brand Header */}
              <View style={styles.brandBlock}>
                <View style={styles.logoRow}>
                  <View style={styles.logoBadge}>
                    <Text style={styles.logoBadgeText}>PPK</Text>
                  </View>
                  <View>
                    <Text style={styles.brandTitle}>PPK LabPortal</Text>
                    <Text style={styles.brandSub}>
                      Informatika FSM Universitas Diponegoro
                    </Text>
                  </View>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    Firebase Authentication & Cloud Firestore
                  </Text>
                </View>
              </View>

              {/* Auth Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Masuk ke Portal</Text>
                <Text style={styles.cardSubtitle}>
                  Gunakan akun terdaftar Anda untuk mengakses jadwal praktikum, presensi real-time, atau kontrol sesi asisten.
                </Text>

                {!firebaseReady ? (
                  <View style={styles.configWarning}>
                    <Text style={styles.configWarningTitle}>
                      Konfigurasi Firebase Belum Lengkap
                    </Text>
                    <Text style={styles.configWarningText}>
                      Salin .env.example menjadi .env dan isi kredensial Firebase Console Anda sebelum login.
                    </Text>
                  </View>
                ) : null}

                {errorMsg ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Alamat Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="nama@students.undip.ac.id"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!submitting && !googleSubmitting}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Kata Sandi</Text>
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={8}>
                      <Text style={styles.toggleText}>
                        {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      </Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Masukkan kata sandi"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!submitting && !googleSubmitting}
                    onSubmitEditing={handleLogin}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.pressed,
                    (submitting || googleSubmitting) && styles.disabled,
                  ]}
                  onPress={handleLogin}
                  disabled={submitting || googleSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Masuk ke Portal">
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Masuk ke Portal →</Text>
                  )}
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>atau</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.googleBtn,
                    pressed && styles.pressed,
                    (submitting || googleSubmitting) && styles.disabled,
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={submitting || googleSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Masuk dengan Akun Google">
                  {googleSubmitting ? (
                    <ActivityIndicator color="#0F172A" size="small" />
                  ) : (
                    <>
                      <View style={styles.googleBadge}>
                        <Text style={styles.googleBadgeText}>G</Text>
                      </View>
                      <Text style={styles.googleBtnText}>
                        Masuk dengan Akun Google
                      </Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Belum memiliki akun? </Text>
                  <Pressable
                    onPress={() => router.push('/register' as Href)}
                    hitSlop={8}>
                    <Text style={styles.footerLink}>Daftar sekarang →</Text>
                  </Pressable>
                </View>
              </View>

              {/* Role Accent Hint */}
              <View style={styles.roleLegend}>
                <View style={[styles.legendItem, styles.legendPraktikan]}>
                  <Text style={[styles.legendText, styles.legendPraktikanText]}>Portal Praktikan</Text>
                </View>
                <View style={[styles.legendItem, styles.legendAsisten]}>
                  <Text style={[styles.legendText, styles.legendAsistenText]}>Portal Asisten Lab</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <GoogleProfileModal
        visible={Boolean(user && needsProfileCompletion)}
        onSuccess={navigateByProfile}
        onCancel={handleCancelProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingVertical: 28,
  },
  centerContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 18,
  },
  brandBlock: {
    gap: 12,
    alignItems: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.6,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
  },
  configWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  configWarningTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B45309',
  },
  configWarningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 14,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  input: {
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  primaryBtn: {
    minHeight: 44,
    backgroundColor: '#EA580C',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  googleBtn: {
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  roleLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  legendItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  legendPraktikan: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  legendAsisten: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  legendPraktikanText: {
    color: '#C2410C',
  },
  legendAsistenText: {
    color: '#0D9488',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});

