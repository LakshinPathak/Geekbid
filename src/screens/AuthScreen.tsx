import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useRef, useEffect } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { Button } from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type AuthMode = 'login' | 'register';

export const AuthScreen = ({ navigation }: Props) => {
  const { switchRole } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'client' | 'freelancer'>('freelancer');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleAuth = () => {
    switchRole(selectedRole);
    if (mode === 'register') {
      navigation.replace(selectedRole === 'freelancer' ? 'FreelancerSetup' : 'ClientSetup');
    } else {
      navigation.replace('Main');
    }
  };

  const handleDemoMode = (role: 'client' | 'freelancer' | 'admin') => {
    switchRole(role);
    navigation.replace('Main');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim }}>
          <LinearGradient colors={colors.gradientHero as any} style={styles.hero}>
            <Text style={styles.logo}>⚡ GeekBid</Text>
            <Text style={styles.tagline}>Reverse bidding marketplace for tech experts</Text>
          </LinearGradient>

          {/* Mode Toggle */}
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggle, mode === 'login' && styles.toggleActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Sign In</Text>
            </Pressable>
            <Pressable
              style={[styles.toggle, mode === 'register' && styles.toggleActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Sign Up</Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'register' && (
              <TextInput
                testID="auth-name-input"
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.placeholder}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            )}
            <TextInput
              testID="auth-email-input"
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              testID="auth-password-input"
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {mode === 'register' && (
              <View style={styles.roleSelector}>
                <Text style={styles.roleLabel}>I am a:</Text>
                <View style={styles.roleRow}>
                  <Pressable
                    style={[styles.roleOption, selectedRole === 'freelancer' && styles.roleOptionActive]}
                    onPress={() => setSelectedRole('freelancer')}
                  >
                    <Text style={styles.roleIcon}>🧑‍💻</Text>
                    <Text style={[styles.roleText, selectedRole === 'freelancer' && styles.roleTextActive]}>
                      Freelancer
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.roleOption, selectedRole === 'client' && styles.roleOptionActive]}
                    onPress={() => setSelectedRole('client')}
                  >
                    <Text style={styles.roleIcon}>🏢</Text>
                    <Text style={[styles.roleText, selectedRole === 'client' && styles.roleTextActive]}>
                      Client
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Button
              title={mode === 'login' ? 'Sign In' : 'Create Account'}
              onPress={handleAuth}
              variant="primary"
            />

            {/* OAuth buttons */}
            <View style={styles.oauthRow}>
              <Pressable style={styles.oauthBtn}>
                <Text style={styles.oauthIcon}>🔵</Text>
                <Text style={styles.oauthText}>Google</Text>
              </Pressable>
              <Pressable style={styles.oauthBtn}>
                <Text style={styles.oauthIcon}>⚫</Text>
                <Text style={styles.oauthText}>GitHub</Text>
              </Pressable>
            </View>
          </View>

          {/* Demo Mode Quick Access */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>Quick Demo Access</Text>
            <View style={styles.demoRow}>
              <Pressable testID="auth-freelancer-btn" style={[styles.demoBtn, { borderColor: colors.accent }]} onPress={() => handleDemoMode('freelancer')}>
                <Text style={[styles.demoBtnText, { color: colors.accent }]}>🧑‍💻 Freelancer</Text>
              </Pressable>
              <Pressable testID="auth-client-btn" style={[styles.demoBtn, { borderColor: colors.accentBlue }]} onPress={() => handleDemoMode('client')}>
                <Text style={[styles.demoBtnText, { color: colors.accentBlue }]}>🏢 Client</Text>
              </Pressable>
              <Pressable testID="auth-admin-btn" style={[styles.demoBtn, { borderColor: colors.warning }]} onPress={() => handleDemoMode('admin')}>
                <Text style={[styles.demoBtnText, { color: colors.warning }]}>🛡️ Admin</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, gap: 20, paddingBottom: 40 },
  hero: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  logo: { ...typography.h1, fontSize: 36, color: colors.text },
  tagline: { ...typography.body, color: colors.muted, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.accentBlueDim,
  },
  toggleText: { ...typography.bodyBold, color: colors.muted },
  toggleTextActive: { color: colors.accentBlue },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.body,
  },
  roleSelector: { gap: 8 },
  roleLabel: { ...typography.captionBold, color: colors.muted },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  roleOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  roleIcon: { fontSize: 24 },
  roleText: { ...typography.captionBold, color: colors.muted },
  roleTextActive: { color: colors.accent },
  submitBtn: { borderRadius: radius.lg, overflow: 'hidden' },
  submitGradient: { paddingVertical: 15, alignItems: 'center', borderRadius: radius.lg },
  submitText: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  oauthRow: { flexDirection: 'row', gap: 10 },
  oauthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  oauthIcon: { fontSize: 16 },
  oauthText: { ...typography.bodyBold, color: colors.textSecondary },
  demoSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    gap: 10,
  },
  demoLabel: { ...typography.label, color: colors.muted, textAlign: 'center' },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  demoBtnText: { ...typography.captionBold },
});
